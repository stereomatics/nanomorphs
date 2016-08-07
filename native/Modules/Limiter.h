
#pragma once

#include "Common.h"
#include "Context.h"

class Limiter {
public:
	Limiter(const Context& context) {
		fReleaseCoef = 1.0 / (context.sampleRate * 0.08);
		fLinearReleaseCoef = 1.0 / (context.sampleRate * 0.4);
		fPeakAttack = 1.0 / (context.sampleRate * 0.0008);
		fHistoryLength = std::max(1, (int) std::floor(0.005 * context.sampleRate));
		fHistory.resize(fHistoryLength, 0.0);
		fHistoryRaw = &*fHistory.begin();
	}

	void Reset() {
		fRmsAcc = 0.0;
		fGainReduction = 0.0;
		fHistoryPos = 0;
		std::fill(fHistory.begin(), fHistory.end(), 0.0);
		fSilent = false;
	}

	FLOAT Step(FLOAT input, bool isInputSilent) {
		FLOAT historyValue = fHistoryRaw[fHistoryPos];
		FLOAT inputSq = input*input;
		fHistoryRaw[fHistoryPos] = inputSq;
		fRmsAcc += inputSq;
		fRmsAcc -= historyValue;
		fRmsAcc *= 0.99995;
		fRmsAcc = std::max(0.0, fRmsAcc);
		FLOAT rms = sqrt(fRmsAcc / fHistoryLength);
		fHistoryPos++;
		if (fHistoryPos >= fHistoryLength) {
		fHistoryPos -= fHistoryLength;
		}

		fGainReduction = fGainReduction * (1.0 - fReleaseCoef) - fLinearReleaseCoef;
		fGainReduction = std::max(0.0, fGainReduction);
		FLOAT thresholdLevel = 1.0 + fGainReduction;
		if (rms > thresholdLevel) {
			fGainReduction = rms - 1.0;
			thresholdLevel = rms;
		}
		FLOAT peak = std::abs(input);
		if (peak > thresholdLevel) {
			fGainReduction = fGainReduction * (1.0 - fPeakAttack) + (peak - 1.0) * fPeakAttack;
			thresholdLevel = 1.0 + fGainReduction;
		}
		fSilent = isInputSilent;
		return input / thresholdLevel;
	}

	bool IsSilent() const {
		return fSilent;
	}

private:
	FLOAT fReleaseCoef = 0.0;
	FLOAT fLinearReleaseCoef = 0.0;
	FLOAT fPeakAttack = 0.0;
	FLOAT fRmsAcc = 0.0;
	FLOAT fGainReduction = 0.0;
	int fHistoryLength = 0;
	std::vector<FLOAT> fHistory;
	FLOAT* fHistoryRaw = nullptr;
	int fHistoryPos = 0;
	bool fSilent = false;
};
