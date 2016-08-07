
#pragma once

#include "Common.h"
#include "Context.h"

class FastHighPassFilter {
public:
	FastHighPassFilter(FLOAT f, const Context& context)
		: fF(f)
		, fContext(context)
	{
		Reset();
	}

	void Reset() {
		fFilterCoef = ComputeFilterCoef(fF, fContext);
		fAcc = 0.0;
		fHistory = 0.0;
	}

	FLOAT Step(FLOAT input) {
		FLOAT output = (fAcc + input - fHistory) * fFilterCoef;
		fAcc = output;
		fHistory = input;
		return output;
	}

private:
	constexpr static FLOAT ComputeFilterCoef(FLOAT f, const Context& context) {
		return 1.0 / (1.0 + f * (context.sampleRateInv * 2.0 * PI));
	}

private:
	const Context& fContext;
	const FLOAT fF;
	FLOAT fFilterCoef;
	FLOAT fAcc;
	FLOAT fHistory;
};


class FastLowPassFilter {
public:
	FastLowPassFilter(FLOAT f, const Context& context)
		: fF(f)
		, fContext(context)
	{
		Reset();
	}

	void Reset() {
		fFilterCoef = ComputeFilterCoef(fF, fContext);
		fAcc = 0.0;
		fHistory = 0.0;
	}

	FLOAT Step(FLOAT input) {
		FLOAT output = input * fFilterCoef + fAcc * (1.0 - fFilterCoef);
		fAcc = output;
		return output;
	}

private:
	constexpr static FLOAT ComputeFilterCoef(FLOAT f, const Context& context) {
		return ((context.sampleRateInv * 2.0 * PI) * f) / (1.0 + ((context.sampleRateInv * 2.0 * PI) * f));
	}

private:
	const Context& fContext;
	const FLOAT fF;
	FLOAT fFilterCoef;
	FLOAT fAcc;
	FLOAT fHistory;
};

