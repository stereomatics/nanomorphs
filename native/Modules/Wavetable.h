
#pragma once

#include "Common.h"

class Wavetable {
private:
	struct WavetableLevel {
		int length;
		FLOAT* samples;
	};

public:
	void GenerateWavetable(Array<FLOAT> waveform) {
		std::vector<FLOAT> waveformVector;
		waveformVector.resize(waveform.length);
		for (int i = 0; i < waveformVector.size(); i++) {
			waveformVector[i] = waveform.ptr[i];
		}
		generateWavetable(waveformVector);
	}

	int GetLevelCount() {
		return fLevels.size();
	}

	FLOAT SampleWavetable(int level, float pos) {
		int levelCount = fLevels.size();
		const WavetableLevel& wavetableLevel = fLevelsRaw[std::max(0, std::min(levelCount-1, level))];
		int wavetableLevelLength = wavetableLevel.length;
		int wavetableLevelMask = wavetableLevelLength-1; // Assume pow2.
		FLOAT totalPos = pos * wavetableLevelLength;
		int coarsePos = (int) floor(totalPos);
		FLOAT finePos = totalPos - coarsePos;
		int index1 = coarsePos & wavetableLevelMask;
		int index2 = (coarsePos + 1) & wavetableLevelMask;
		FLOAT sample1 = wavetableLevel.samples[index1];
		FLOAT sample2 = wavetableLevel.samples[index2];
		return sample1 * (1.0 - finePos) + sample2 * finePos;
	}

private:
	
	void generateWavetable(const std::vector<FLOAT>& waveform) {
		std::vector<FLOAT> wavetableLevel = interpolate4(waveform);
		std::vector<std::vector<FLOAT>>& wavetables = fLevels;
		wavetables.clear();
		while (wavetableLevel.size() > 4) {
			wavetables.push_back(wavetableLevel);
			wavetableLevel = halfsample(wavetableLevel);
		}
		std::reverse(wavetables.begin(), wavetables.end());

		int levelsCount = wavetables.size();
		fLevelsRawStorage.resize(levelsCount);
		for (int i = 0; i < levelsCount; i++) {
			WavetableLevel level = { (int) wavetables[i].size(), &*wavetables[i].begin() };
			fLevelsRawStorage[i] = level;
		}
		fLevelsRaw = &*fLevelsRawStorage.begin();
		fLevelsCount = levelsCount;
	}

	static std::vector<FLOAT> interpolate4(const std::vector<FLOAT>& wavetable) {
		constexpr FLOAT kKernelGain = 1.0;
		constexpr FLOAT kKernelValue00 = 1 / kKernelGain;
		constexpr FLOAT kKernelValue01 = 0.8900670517 / kKernelGain;
		constexpr FLOAT kKernelValue02 = 0.6079271019 / kKernelGain;
		constexpr FLOAT kKernelValue03 = 0.270189823 / kKernelGain;
		constexpr FLOAT kKernelValue05 = -0.1328710184 / kKernelGain;
		constexpr FLOAT kKernelValue06 = -0.1350949115 / kKernelGain;
		constexpr FLOAT kKernelValue07 = -0.0677913359 / kKernelGain;
		constexpr FLOAT kKernelValue09 = 0.03002109145 / kKernelGain;
		constexpr FLOAT kKernelValue10 = 0.02431708407 / kKernelGain;
		constexpr FLOAT kKernelValue11 = 0.007355926047 / kKernelGain;

		int newLength = wavetable.size() * 4;
		std::vector<FLOAT> newWavetable;
		newWavetable.resize(newLength, 0.0);
		for (int i = 0; i < wavetable.size(); i++) {
			int outputPos = i * 4;
			FLOAT input = wavetable[i];
			newWavetable[(outputPos + 0 + newLength) % newLength] += kKernelValue00 * input;
			newWavetable[(outputPos + 1 + newLength) % newLength] += kKernelValue01 * input;
			newWavetable[(outputPos + 2 + newLength) % newLength] += kKernelValue02 * input;
			newWavetable[(outputPos + 3 + newLength) % newLength] += kKernelValue03 * input;
			newWavetable[(outputPos + 5 + newLength) % newLength] += kKernelValue05 * input;
			newWavetable[(outputPos + 6 + newLength) % newLength] += kKernelValue06 * input;
			newWavetable[(outputPos + 7 + newLength) % newLength] += kKernelValue07 * input;
			newWavetable[(outputPos + 9 + newLength) % newLength] += kKernelValue09 * input;
			newWavetable[(outputPos + 10 + newLength) % newLength] += kKernelValue10 * input;
			newWavetable[(outputPos + 11 + newLength) % newLength] += kKernelValue11 * input;
			newWavetable[(outputPos - 1 + newLength) % newLength] += kKernelValue01 * input;
			newWavetable[(outputPos - 2 + newLength) % newLength] += kKernelValue02 * input;
			newWavetable[(outputPos - 3 + newLength) % newLength] += kKernelValue03 * input;
			newWavetable[(outputPos - 5 + newLength) % newLength] += kKernelValue05 * input;
			newWavetable[(outputPos - 6 + newLength) % newLength] += kKernelValue06 * input;
			newWavetable[(outputPos - 7 + newLength) % newLength] += kKernelValue07 * input;
			newWavetable[(outputPos - 9 + newLength) % newLength] += kKernelValue09 * input;
			newWavetable[(outputPos - 10 + newLength) % newLength] += kKernelValue10 * input;
			newWavetable[(outputPos - 11 + newLength) % newLength] += kKernelValue11 * input;
		}
		return newWavetable;
	}

	static std::vector<FLOAT> halfsample(const std::vector<FLOAT>& wavetable) {
		constexpr FLOAT kKernelGain = 4.0;
		constexpr FLOAT kKernelValue00 = 1 / kKernelGain;
		constexpr FLOAT kKernelValue01 = 0.8900670517 / kKernelGain;
		constexpr FLOAT kKernelValue02 = 0.6079271019 / kKernelGain;
		constexpr FLOAT kKernelValue03 = 0.270189823 / kKernelGain;
		constexpr FLOAT kKernelValue05 = -0.1328710184 / kKernelGain;
		constexpr FLOAT kKernelValue06 = -0.1350949115 / kKernelGain;
		constexpr FLOAT kKernelValue07 = -0.0677913359 / kKernelGain;
		constexpr FLOAT kKernelValue09 = 0.03002109145 / kKernelGain;
		constexpr FLOAT kKernelValue10 = 0.02431708407 / kKernelGain;
		constexpr FLOAT kKernelValue11 = 0.007355926047 / kKernelGain;

		int wavetableLength = wavetable.size();
		int newLength = (int) std::floor(wavetableLength / 2);
		std::vector<FLOAT> newWavetable;
		newWavetable.resize(newLength, 0.0);
		for (int newPos = 0; newPos < newLength; newPos++) {
			int inputPos = newPos * 2 - 1;
			FLOAT output =
				wavetable[(inputPos + 0 + wavetableLength*4) % wavetableLength] * kKernelValue00
				+ wavetable[(inputPos + 1 + wavetableLength*4) % wavetableLength] * kKernelValue01
				+ wavetable[(inputPos + 2 + wavetableLength*4) % wavetableLength] * kKernelValue02
				+ wavetable[(inputPos + 3 + wavetableLength*4) % wavetableLength] * kKernelValue03
				+ wavetable[(inputPos + 5 + wavetableLength*4) % wavetableLength] * kKernelValue05
				+ wavetable[(inputPos + 6 + wavetableLength*4) % wavetableLength] * kKernelValue06
				+ wavetable[(inputPos + 7 + wavetableLength*4) % wavetableLength] * kKernelValue07
				+ wavetable[(inputPos + 9 + wavetableLength*4) % wavetableLength] * kKernelValue09
				+ wavetable[(inputPos + 10 + wavetableLength*4) % wavetableLength] * kKernelValue10
				+ wavetable[(inputPos + 11 + wavetableLength*4) % wavetableLength] * kKernelValue11
				+ wavetable[(inputPos - 1 + wavetableLength*4) % wavetableLength] * kKernelValue01
				+ wavetable[(inputPos - 2 + wavetableLength*4) % wavetableLength] * kKernelValue02
				+ wavetable[(inputPos - 3 + wavetableLength*4) % wavetableLength] * kKernelValue03
				+ wavetable[(inputPos - 5 + wavetableLength*4) % wavetableLength] * kKernelValue05
				+ wavetable[(inputPos - 6 + wavetableLength*4) % wavetableLength] * kKernelValue06
				+ wavetable[(inputPos - 7 + wavetableLength*4) % wavetableLength] * kKernelValue07
				+ wavetable[(inputPos - 9 + wavetableLength*4) % wavetableLength] * kKernelValue09
				+ wavetable[(inputPos - 10 + wavetableLength) % wavetableLength] * kKernelValue10
				+ wavetable[(inputPos - 11 + wavetableLength) % wavetableLength] * kKernelValue11;

			newWavetable[newPos] = output;
		}
		return newWavetable;
	}

private:
	std::vector<std::vector<FLOAT>> fLevels;
	std::vector<WavetableLevel> fLevelsRawStorage;
	WavetableLevel* fLevelsRaw = nullptr;
	int fLevelsCount = 0;
};
