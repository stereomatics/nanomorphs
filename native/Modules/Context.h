
#pragma once

#include "Common.h"

class Context {
public:
	FLOAT sampleRate;
	FLOAT sampleRateInv;

	void SetSampleRate(FLOAT value) {
		sampleRate = value;
		sampleRateInv = 1.0 / value;
	}
};
