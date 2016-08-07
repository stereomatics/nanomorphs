#include "Common.h"
#include "DSP.h"
#include "Drive.h"
#include "Filter.h"
#include "Limiter.h"
#include "Param.h"
#include "Wavetable.h"

DSP::DSP() {
	fContext.SetSampleRate(44100);

	NoteParam.reset(new Param(this));
	PitchParam.reset(new Param(this));
	CutoffParam.reset(new Param(this));
	ResoParam.reset(new Param(this));
	DriveParam.reset(new Param(this));
	ForceParam.reset(new Param(this));
	WaveformMorph1Param.reset(new Param(this));
	WaveformMorph2Param.reset(new Param(this));
	WaveformMorph3Param.reset(new Param(this));
	WaveformMorph4Param.reset(new Param(this));

	Filter.reset(new class Filter(CutoffParam.get(), ResoParam.get(), fContext));
	Drive.reset(new class Drive(DriveParam.get(), fContext));
	Limiter.reset(new class Limiter(fContext));
	fWavetableA.reset(new Wavetable());
	fWavetableB.reset(new Wavetable());

	fScopeSamples.resize(1024*16, 0.0);

	Reset();
}

DSP::~DSP() {
}

void DSP::Activate() {
	if (fActive) {
		return;
	}
	fActive = true;
}

void DSP::Deactivate() {
	if (!fActive) {
		return;
	}
	fActive = false;
	Reset();
}

void DSP::Reset() {
	fSilent = true;
	fProbeAcc = 0.0;
	fProbeSlope = 1.0;
	fProbeA = 0.0;
	fProbeB = 0.0;
	fScopeWritePos = 0;
	fSampleRate = 44100;
	fOscAcc = 0.0;
	fOscPitchNumber = -INFINITY;
	fOscFreq = 440.0;
	fGeneratedSampleCount = 0;

	std::fill(fScopeSamples.begin(), fScopeSamples.end(), 0.0);

	Filter->Reset();
	Drive->Reset();
	Limiter->Reset();
}

bool DSP::IsSilent() {
	return fSilent;
}

Array<FLOAT> DSP::GetOutputSamplesA() {
	Array<FLOAT> ret = { &(*fOutputSamplesA.begin()), (int) fGeneratedSampleCount };
	return ret;
}

Array<FLOAT> DSP::GetOutputSamplesB() {
	Array<FLOAT> ret = { &(*fOutputSamplesB.begin()), (int) fGeneratedSampleCount };
	return ret;
}

DisplayParams DSP::GetDisplayParams() {
	Array<FLOAT> scopeSamples = { &(*fScopeSamples.begin()), (int) fScopeSamples.size() };
	DisplayParams params = {
		fOscAcc,
		fOscFreq,
		fProbeA,
		fProbeB,
		fScopeWritePos,
		scopeSamples,
	};
	return params;
}

void DSP::SetWavetableA(Array<FLOAT> waveform) {
	fWavetableA->GenerateWavetable(waveform);
}

void DSP::SetWavetableB(Array<FLOAT> waveform) {
	fWavetableB->GenerateWavetable(waveform);
}

void DSP::SetNoteTriggered(bool value) {
	fNoteTriggered = value;
}

void DSP::SetParamValue(ParamIndex index, FLOAT value, bool immediate) {
	Param* param = nullptr;
	switch (index) {
	case NoteIndex:				param = NoteParam.get(); break;
	case PitchIndex:			param = PitchParam.get(); break;
	case CutoffIndex:			param = CutoffParam.get(); break;
	case ResoIndex:				param = ResoParam.get(); break;
	case DriveIndex:			param = DriveParam.get(); break;
	case ForceIndex:			param = ForceParam.get(); break;
	case WaveformMorph1Index:	param = WaveformMorph1Param.get(); break;
	case WaveformMorph2Index:	param = WaveformMorph2Param.get(); break;
	case WaveformMorph3Index:	param = WaveformMorph3Param.get(); break;
	case WaveformMorph4Index:	param = WaveformMorph4Param.get(); break;
	}
	if (param) {
		param->SetValue(value, immediate);
	}
}

void DSP::SetParamValueJS(int index, FLOAT value, bool immediate) {
	SetParamValue((ParamIndex) index, value, immediate);
}

bool DSP::shouldRunOsc() {
	return fNoteTriggered;
}

void DSP::SetSampleRate(double sampleRate) {
	if (fContext.sampleRate == sampleRate) {
		return;
	}
	fContext.SetSampleRate(sampleRate);
	Reset();
}

void DSP::GenerateSamples(int count) {
	if (count > fOutputSamplesA.size()) {
		fOutputSamplesA.resize(count, 0.0);
		fOutputSamplesB.resize(count, 0.0);
	}
	fGeneratedSampleCount = count;
	FLOAT* outputA = &*fOutputSamplesA.begin();
	FLOAT* outputB = &*fOutputSamplesB.begin();
	FLOAT* scopeSamples = &*fScopeSamples.begin();

	bool runOsc = shouldRunOsc();
	bool silent = fSilent;
	if (runOsc) {
		silent = false;
	}

	fProbeSlope = 10.2 * fContext.sampleRateInv;
	for (int i = 0; i < count; i++) {
		FLOAT outputSample = 0.0;
		for (Param* param : fActiveParams) {
			param->Step();
		}
		if (!silent) {
			bool nowSilent = true;
			if (runOsc) {
				outputSample = generateOscSample();
				nowSilent = false;
			} else {
				outputSample = 0.0;
			}
			outputSample = Filter->Step(outputSample * 0.8, nowSilent);
			nowSilent = nowSilent && Filter->IsSilent();
			outputSample = Drive->Step(outputSample, nowSilent) * 0.5;
			nowSilent = nowSilent && Drive->IsSilent();
			outputSample = Limiter->Step(outputSample, nowSilent);
			nowSilent = nowSilent && Limiter->IsSilent();
			outputSample = Math::FastTanh(outputSample);
			if (nowSilent) {
				silent = true;
			}
		}
		outputA[i] = outputSample;
		outputB[i] = outputSample;

		FLOAT scopeSample = outputSample;

		fProbeAcc += fProbeSlope;
		if (fProbeAcc >= 1.0) {
			fProbeAcc -= 1.0;
		}
		FLOAT probeFalloff = 0.001;
		fProbeA = fProbeA * (1.0 - probeFalloff) + cos(fProbeAcc * PI * 2) * scopeSample * probeFalloff;
		fProbeB = fProbeB * (1.0 - probeFalloff) + sin(fProbeAcc * PI * 2) * scopeSample * probeFalloff;

		scopeSamples[fScopeWritePos] = scopeSample;
		fScopeWritePos++;
		if (fScopeWritePos >= fScopeSamples.size()) {
			fScopeWritePos = 0;
		}
	}

	for (auto it = fActiveParams.begin(); it != fActiveParams.end();) {
		if (!(*it)->IsActive()) {
			it = fActiveParams.erase(it);
		} else {
			++it;
		}
	}

	fSilent = silent;
}

FLOAT DSP::generateOscSample() {
	FLOAT pitchNumber = (NoteParam->GetValue() - 69) / 12 + PitchParam->GetValue();
	if (pitchNumber != fOscPitchNumber) {
		fOscPitchNumber = pitchNumber;
		fOscFreq = std::min(fContext.sampleRate * 0.5, std::max(1.0, (std::pow(2, pitchNumber) * 440.0)));
	}
	FLOAT slope = fOscFreq * fContext.sampleRateInv;
	fOscAcc += slope;
	if (fOscAcc >= 1.0) {
		fOscAcc -= 1.0;
	}
	int level = -std::floor(Math::FastLog2(slope) + 2.8);
	FLOAT sampleA = fWavetableA->SampleWavetable(level, fOscAcc);
	FLOAT sampleB = fWavetableB->SampleWavetable(level, fOscAcc);

	Param* morphParams[] = {
		WaveformMorph1Param.get(),
		WaveformMorph2Param.get(),
		WaveformMorph3Param.get(),
		WaveformMorph4Param.get(),
	};
	int morphParamsCount = sizeof(morphParams) / sizeof(Param*);
	int morphIndex = ((int) std::floor(fOscAcc * morphParamsCount)) % morphParamsCount;
	FLOAT alpha = morphParams[morphIndex]->GetValue();

	return sampleA * (1.0 - alpha) + sampleB * alpha;
}

void DSP::ActivateParam(Param* param) {
	fActiveParams.push_back(param);
}
