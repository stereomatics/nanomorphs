
#pragma once

#include "Common.h"
#include "DSP.h"

class Param {
public:
	Param(DSP* dsp) : fDSP(dsp) {
	}

	FLOAT GetValue() const {
		return fValue;
	}

	void SetValue(FLOAT targetValue, bool immediate) {
		if (immediate) {
			fIsActive = false;
			fFloatTime = 0.0;
			fTargetValue = targetValue;
			fStartValue = targetValue;
			fValue = targetValue;
			return;
		}
		if (!fIsActive) {
			fIsActive = true;
			fDSP->ActivateParam(this);
		}
		fStartValue = fValue;
		fTargetValue = targetValue;
		fFloatTime = 0;
	}

	void Step() {
		if (!fIsActive) {
			return;
		}
		constexpr int FloatLength = 1500;
		fFloatTime++;
		if (fFloatTime > FloatLength) {
			fValue = fTargetValue;
			fFloatTime = 0;
			fIsActive = false;
			return;
		}

		FLOAT alpha = fFloatTime / (FLOAT) FloatLength;
		fValue = fStartValue * (1.0 - alpha) + fTargetValue * alpha;
	}

	bool IsActive() const {
		return fIsActive;
	}

private:
	DSP* fDSP = nullptr;
	FLOAT fValue = 0.0;
	FLOAT fStartValue = 0.0;
	FLOAT fTargetValue = 0.0;
	int fFloatTime = 0;
	bool fIsActive = false;
};
