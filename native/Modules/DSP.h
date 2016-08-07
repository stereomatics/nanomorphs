
#pragma once

#include "Common.h"
#include "Context.h"

class Drive;
class Filter;
class Limiter;
class Param;
class Wavetable;

struct DisplayParams {
	FLOAT oscAcc;
	FLOAT oscFreq;
	FLOAT probeA;
	FLOAT probeB;
	int scopeWritePos;
	Array<FLOAT> scopeSamples;
};

class DSP {
public:
	enum ParamIndex {
		NoteIndex = 0,
		PitchIndex,
		CutoffIndex,
		ResoIndex,
		DriveIndex,
		ForceIndex,
		WaveformMorph1Index,
		WaveformMorph2Index,
		WaveformMorph3Index,
		WaveformMorph4Index,
	};

	DSP();
	~DSP();

	void Activate();
	void Deactivate();
	void Reset();
	bool IsSilent();
	void SetNoteTriggered(bool value);
	void SetParamValue(ParamIndex index, FLOAT value, bool immediate);
	void SetParamValueJS(int index, FLOAT value, bool immediate);

	Array<FLOAT> GetOutputSamplesA();
	Array<FLOAT> GetOutputSamplesB();

	DisplayParams GetDisplayParams();

	void SetWavetableA(Array<FLOAT> waveform);
	void SetWavetableB(Array<FLOAT> waveform);

	void SetSampleRate(double sampleRate);
	void GenerateSamples(int count);

public:
	std::unique_ptr<Param> NoteParam;
	std::unique_ptr<Param> PitchParam;
	std::unique_ptr<Param> CutoffParam;
	std::unique_ptr<Param> ResoParam;
	std::unique_ptr<Param> DriveParam;
	std::unique_ptr<Param> ForceParam;
	std::unique_ptr<Param> WaveformMorph1Param;
	std::unique_ptr<Param> WaveformMorph2Param;
	std::unique_ptr<Param> WaveformMorph3Param;
	std::unique_ptr<Param> WaveformMorph4Param;

	std::unique_ptr<Filter> Filter;
	std::unique_ptr<Drive> Drive;
	std::unique_ptr<Limiter> Limiter;

protected:
	friend class Param;

	void ActivateParam(Param* param);

private:
	bool shouldRunOsc();
	FLOAT generateOscSample();

private:
	Context fContext;
	bool fActive = false;
	bool fNoteTriggered = false;
	std::unique_ptr<Wavetable> fWavetableA;
	std::unique_ptr<Wavetable> fWavetableB;

	std::vector<Param*> fActiveParams;
	int fGeneratedSampleCount = 0;
	std::vector<FLOAT> fOutputSamplesA;
	std::vector<FLOAT> fOutputSamplesB;

	bool fSilent = true;
	FLOAT fProbeAcc = 0.0;
	FLOAT fProbeSlope = 1.0;
	FLOAT fProbeA = 0.0;
	FLOAT fProbeB = 0.0;
	int fScopeWritePos = 0;
	FLOAT fSampleRate = 0.0;

	FLOAT fOscAcc = 0.0;
	FLOAT fOscPitchNumber = -INFINITY;
	FLOAT fOscFreq = 440.0;

	std::vector<FLOAT> fScopeSamples;
};
