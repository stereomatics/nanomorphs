
#pragma once

#include <algorithm>
#include <cmath>
#include <memory>
#include <vector>

typedef double FLOAT;
typedef int LONG_PTR;

constexpr FLOAT PI = 3.1415926535897932384626433832795;
constexpr FLOAT LOG2 = 0.69314718055994530941723212145818;

class Math {
public:
	inline static FLOAT FastPow(FLOAT x, FLOAT y) {
		return pow(x, y);
	}

	inline static FLOAT FastSqrt(FLOAT x) {
		return sqrt(x);
	}

	inline static FLOAT FastLog2(FLOAT x) {
		return FastLog2((float) x);
	}

	inline static float FastLog2(float x) {
		unsigned int vx = * (unsigned int*) &x;
		unsigned int mxBits = (vx & 0x007FFFFF) | 0x3f000000;
		float mx = * (float*) &mxBits;

		float y = (float) vx;
		y *= 1.1920928955078125e-7f;

		return y - 124.22551499f
				- 1.498030302f * mx
				- 1.72587999f / (0.3520887068f + mx);
	}

	inline static FLOAT FastAtan(FLOAT x) {
		return atan(x);
	}

	inline static FLOAT FastTanh(FLOAT x) {
		return (-1.0 + 2.0 / (1.0 + FastPow2(1.442695040*-2.0 * x)));
	}

	inline static float FastPow2(float x) {
		float offset = (x < 0) ? 1.0f : 0.0f;
		float clipp = (x < -126) ? -126.0f : x;
		int w = (int) clipp;
		float z = clipp - w + offset;

		unsigned int bits = (unsigned int) ( (1 << 23) * (clipp + 121.2740575f + 27.7280233f / (4.84252568f - z) - 1.49012907f * z) );
		return *(float*) &bits;
	}
};

template<typename T>
struct Array {
	T* ptr;
	int length;

	Array()
		: Array(nullptr, 0)
	{
	}
	Array(T* ptr, int length)
		: ptr(ptr)
		, length(length)
	{
	}

	LONG_PTR GetPtrJS() const {
		return (LONG_PTR) ptr;
	}
	void SetPtrJS(LONG_PTR value) {
		ptr = (T*) value;
	}
};
