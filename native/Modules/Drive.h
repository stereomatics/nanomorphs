
#pragma once

#include "Common.h"
#include "Context.h"
#include "FastFilter.h"
#include "Param.h"

class AnalogCircuit {
public:
	AnalogCircuit(const Context& context)
		: fContext(context)
		, fDifferentiator(44100.0/90, context)
		, fPhaseDelay(44100.0*4/10, context)
	{
		Reset();
	}

	void Reset() {
		FLOAT fHistory1 = 0.0;
		FLOAT fHistory2 = 0.0;
		fDifferentiator.Reset();
		fPhaseDelay.Reset();
	}

	FLOAT Step(FLOAT input) {
		constexpr FLOAT paramDataSmoothing = 0.600 * 2.5;
		constexpr FLOAT ChargeScale = 0.268;

		FLOAT delta = fDifferentiator.Step(input) * ChargeScale;
		delta = fPhaseDelay.Step(delta);

		FLOAT alpha = std::min(1.0, std::abs(delta)*paramDataSmoothing);
		delta = delta*(1.0-alpha) + fHistory2*alpha;
		fHistory2 = fHistory1;
		fHistory1 = delta;
		return input + delta*1.0;
	}

private:
	const Context& fContext;
	FLOAT fHistory1 = 0.0;
	FLOAT fHistory2 = 0.0;
	FastHighPassFilter fDifferentiator;
	FastHighPassFilter fPhaseDelay;
};


class Drive {
public:
	Drive(Param* driveParam, const Context& context)
		: fContext(context)
		, fDriveParam(driveParam)
		, fIntegrator(112.0, context)
		, fAnalogCircuit(context)
	{
	}

	void Reset() {
		fIntegrator.Reset();
		fAnalogCircuit.Reset();
		fIsSilent = true;
	}

	FLOAT Step(FLOAT input, bool isInputSilent) {
		constexpr FLOAT PreAmp = 1.0 / 10;
		constexpr FLOAT PreAmpInverse = 1/PreAmp;
		constexpr FLOAT SaturationHeadroom = 5.0 / 7;
		constexpr FLOAT SaturationLogBase = 3.73;
		constexpr FLOAT BaseDriveBias = 1.2;
		constexpr FLOAT BaseDriveBiasValue = 1;
		constexpr FLOAT SaturationLogDenominator = 1.8991756304805130812949046443811; // Log2(SaturationLogBase)
		constexpr FLOAT DrivePower = 7.6438561897747246957406388589788; // Log2(200);

		FLOAT driveValue = fDriveParam->GetValue() * 2.0;
		FLOAT dataDrive = driveValue > 0 ? (1+((Math::FastPow2(driveValue * DrivePower)-1)/199)*50) : (driveValue + 1);
		FLOAT driveBias = std::max(0.0, std::min(1.0, 1-((dataDrive-1)/BaseDriveBiasValue)))*BaseDriveBias;

		FLOAT dataSaturationHeadroom = std::max(0.0, SaturationHeadroom-driveBias);
		FLOAT dataSaturationHeadroomInv = 1 / std::max(0.05, dataSaturationHeadroom);
		FLOAT dataSaturationHeadroomReverse = 1-std::max(0.05, dataSaturationHeadroom);
		FLOAT dataDriveBias = 1 + (1/std::max(1.0, dataDrive)-1) * dataSaturationHeadroom;
		FLOAT dataNoiseAlpha = std::max(0.0, std::min(1.0, (1-driveBias*driveBias*0.8)));

		FLOAT input2 = input * dataDrive*PreAmp;
		FLOAT output = input2;

		FLOAT saturationHeadroomReverse = dataSaturationHeadroomReverse;
		bool inputHigh = output > saturationHeadroomReverse;
		bool inputLow = output < -saturationHeadroomReverse;
		bool inputAny = inputHigh | inputLow;

		if (inputAny) {
			FLOAT sign = input >= 0.0 ? 1.0 : -1.0;

			output = (sign*output - saturationHeadroomReverse);
			FLOAT alin = Math::FastLog2(output*dataSaturationHeadroomInv + SaturationLogBase)/SaturationLogDenominator-(1.0);
			alin = fIntegrator.Step(sign*alin);
			output = alin + sign*saturationHeadroomReverse;
		} else {
			fIntegrator.Step(0.0);
		}

		output *= dataDriveBias*PreAmpInverse;
		FLOAT alpha = std::min(1.0, std::abs(output)*dataNoiseAlpha);

		output = output*(1.0-alpha) + fAnalogCircuit.Step(output)*alpha;

		fIsSilent = isInputSilent;
		return output;
	}

	bool IsSilent() {
		return fIsSilent;
	}

private:
	const Context& fContext;
	Param* fDriveParam = nullptr;
	FastLowPassFilter fIntegrator;
	AnalogCircuit fAnalogCircuit;
	bool fIsSilent = true;

	static FLOAT HardLimit(FLOAT input) {
		return Math::FastTanh(input);
	}

	static FLOAT HardLimitSine(FLOAT input) {
		// TODO: Fix.
		return Math::FastTanh(input);
	}
};
