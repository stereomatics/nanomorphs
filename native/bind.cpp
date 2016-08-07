#include <emscripten/bind.h>

#include "Modules/DSP.h"

using namespace emscripten;

extern "C" {

EMSCRIPTEN_BINDINGS(nano_morphs) {
	class_<DSP>("DSP")
		.constructor<>()
		.function("activate", &DSP::Activate)
		.function("deactivate", &DSP::Deactivate)
		.function("reset", &DSP::Reset)
		.function("isSilent", &DSP::IsSilent)
		.function("setNoteTriggered", &DSP::SetNoteTriggered)
		.function("setParamValue", &DSP::SetParamValueJS)
		.function("getOutputSamplesA", &DSP::GetOutputSamplesA)
		.function("getOutputSamplesB", &DSP::GetOutputSamplesB)
		.function("getDisplayParams", &DSP::GetDisplayParams)
		.function("setWavetableA", &DSP::SetWavetableA)
		.function("setWavetableB", &DSP::SetWavetableB)
		.function("setSampleRate", &DSP::SetSampleRate)
		.function("generateSamples", &DSP::GenerateSamples)
		;
	value_object<Array<double>>("ArrayFloat")
		.field("ptr", &Array<FLOAT>::GetPtrJS, &Array<FLOAT>::SetPtrJS)
		.field("length", &Array<FLOAT>::length)
		;
	value_object<DisplayParams>("DisplayParams")
		.field("oscAcc", &DisplayParams::oscAcc)
		.field("oscFreq", &DisplayParams::oscFreq)
		.field("probeA", &DisplayParams::probeA)
		.field("probeB", &DisplayParams::probeB)
		.field("scopeWritePos", &DisplayParams::scopeWritePos)
		.field("scopeSamples", &DisplayParams::scopeSamples)
		;
}

}
