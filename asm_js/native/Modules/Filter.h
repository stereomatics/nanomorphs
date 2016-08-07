
#pragma once

#include "Common.h"
#include "Context.h"
#include "FastFilter.h"
#include "Param.h"

class Filter {
public:
	Filter(Param* cutoffParam, Param* resoParam, const Context& context)
		: fContext(context)
		, fCutoffParam(cutoffParam)
		, fResoParam(resoParam)
		, fFrequencyDifferentiator(810.0, context)
		, fFrequencySmoother(5.0, context)
	{
		Reset();
	}

	void Reset() {
		fHistory1 = 0.0;
		fHistory2 = 0.0;
		fHistory3 = 0.0;
		fHistory4 = 0.0;
		fFrequencyDifferentiator.Reset();
		fFrequencySmoother.Reset();
	}

	FLOAT Step(FLOAT input, bool isInputSilent) {
		FLOAT paramDataDriveAmount = 1.0;
		FLOAT paramDataDrivePreamp = 1.0;
		FLOAT paramDataDrivePreampInv = 1.0 / paramDataDrivePreamp;
		FLOAT paramDataLinearFrequency = fCutoffParam->GetValue();
		FLOAT paramDataBaseQ = Math::FastLog2(1.0 + fResoParam->GetValue() * 0.5);

		FLOAT HighFrequencyOctaves = 12.1066666666;
		FLOAT powValue = Math::FastPow2((paramDataLinearFrequency + 5) * HighFrequencyOctaves / 10);
		FLOAT paramDataFrequency = 10.0 * powValue;

		FLOAT linearFrequency = paramDataLinearFrequency;
		FLOAT frequencyDelta = fFrequencyDifferentiator.Step(linearFrequency);
		frequencyDelta = HardLimitSine(std::abs(frequencyDelta) * 52.0);
		FLOAT frequencySpeed = fFrequencySmoother.Step(frequencyDelta);

		FLOAT frequency = paramDataFrequency;
		FLOAT baseQ = paramDataBaseQ;

		FLOAT wcRatio0 = std::min(0.5, 2*2*frequency * fContext.sampleRateInv);
		FLOAT wcRatio = Math::FastAtan(wcRatio0);

		FLOAT s1 = fHistory1;
		FLOAT s2 = fHistory2;
		FLOAT s3 = fHistory3;
		FLOAT s4 = fHistory4;

		FLOAT g = wcRatio;
		FLOAT gcoef = g;
		FLOAT G1 = gcoef;
		FLOAT G2 = std::min(gcoef, 0.331);
		FLOAT G3 = gcoef;
		FLOAT G4 = gcoef;
		FLOAT G = g*g*g*g;

		FLOAT feedback = baseQ * 5.0 * std::max(0.0, (paramDataLinearFrequency / -8.0 + 1.0));
		FLOAT S = G4*G3*G2*s1 + G4*G3*s2 + G4*s3 + s4;

		FLOAT saturateAmountExtra = frequencySpeed * 0.75 * paramDataDriveAmount;
		FLOAT saturateAmount = 0.5 + saturateAmountExtra;
		FLOAT saturateAmountInv = 2.0 / (1.0 + saturateAmountExtra);

		FLOAT input2 = input;
		input2 = HardLimitSine(input2*saturateAmount)*saturateAmountInv;
		FLOAT feedbackOutput = input - (input - feedback*S) / (1 + feedback*G);

		FLOAT BandpassSaturatePower = 0.87;
		FLOAT InvBandpassSaturatePower = 1.0 / BandpassSaturatePower;
		FLOAT ybpsat = HardLimit(feedbackOutput*BandpassSaturatePower) * InvBandpassSaturatePower;
		feedbackOutput = feedbackOutput + (feedbackOutput - ybpsat) * 2.31;

		FLOAT FeedbackSaturatePower = 0.580;
		FLOAT InvFeedbackSaturatePower = 1.0 / FeedbackSaturatePower;
		feedbackOutput = HardLimit(feedbackOutput*FeedbackSaturatePower * paramDataDrivePreamp) * InvFeedbackSaturatePower * paramDataDrivePreampInv;

		FLOAT y0 = input2 - feedbackOutput;

		FLOAT v1 = G1*(y0 - s1);
		FLOAT y1 = (s1 + v1);
		FLOAT v2 = G2*(y1 - s2);
		FLOAT y2 = (s2 + v2);
		FLOAT v3 = G3*(y2 - s3);
		FLOAT y3 = (s3 + v3);
		FLOAT v4 = G4*(y3 - s4);
		FLOAT y4 = (s4 + v4);

		fHistory1 = y1 + v1;
		fHistory2 = y2 + v2;
		fHistory3 = y3 + v3;
		fHistory4 = y4 + v4;

		FLOAT output = y4;
		return output;
	}

	bool IsSilent() const {
		return std::abs(fHistory1) < 0.00001 &&
			std::abs(fHistory2) < 0.00001 &&
			std::abs(fHistory3) < 0.00001 &&
			std::abs(fHistory4) < 0.00001;
	}

private:
	const Context& fContext;
	Param* fCutoffParam;
	Param* fResoParam;
	FLOAT fHistory1 = 0.0;
	FLOAT fHistory2 = 0.0;
	FLOAT fHistory3 = 0.0;
	FLOAT fHistory4 = 0.0;
	FastHighPassFilter fFrequencyDifferentiator;
	FastLowPassFilter fFrequencySmoother;

	static FLOAT HardLimit(FLOAT input) {
		return Math::FastTanh(input);
	}

	static FLOAT HardLimitSine(FLOAT input) {
		// TODO: Fix.
		return Math::FastTanh(input);
	}
};
