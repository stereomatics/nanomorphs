


function DSP(blocksA, blocksB) {
  this.blocksA = blocksA;
  this.blocksB = blocksB;

  this.context = new (window.AudioContext || window.webkitAudioContext)();
  this.node = this.context.createScriptProcessor(1024, 1, 2);
  this.node.onaudioprocess = this.process.bind(this);
  this.node.connect(this.context.destination);

  this.noteTriggered = false;
  this.noteTriggeredTarget = false;

  this.wavetableA = [];
  this.wavetableB = [];
  this.morphParams = [waveformMorph1, waveformMorph2, waveformMorph3, waveformMorph4];

  this.filterA = new Filter(cutoffParam, resoParam, this.context.sampleRate);
  this.filterB = new Filter(cutoffParam, resoParam, this.context.sampleRate);
  this.driveA = new Drive(driveParam, this.context.sampleRate);
  this.driveB = new Drive(driveParam, this.context.sampleRate);
  this.limiter = new Limiter(this.context.sampleRate);

  this.oscAcc = 0.0;
  this.oscFreq = 440.0;

  this.probeAcc = 0.0;
  this.probeSlope = 1.0;
  this.probeA = 0.0;
  this.probeB = 0.0;
  this.brandLeft = document.getElementById('brand-left');
  this.brandRight = document.getElementById('brand-right');

  this.canvas = document.getElementById('osc');
  this.WIDTH = this.canvas.width;
  this.HEIGHT = this.canvas.height;

  this.scopeSamples = [];
  this.scopeWritePos = 0;
  for (var i = 0; i < 1024*16; i++) {
    this.scopeSamples.push(0.0);
  }
  window.setTimeout(this.visualize.bind(this), 1000 / 60);
}

DSP.prototype.process = function(e) {
  var L = e.outputBuffer.getChannelData(0);
  var R = e.outputBuffer.getChannelData(1);
  var sample = [0.0, 0.0];

  if (pitchParam.isInEdit() != this.noteTriggeredTarget) {
    this.noteTriggeredTarget = pitchParam.isInEdit();
    this.noteTriggered = this.noteTriggeredTarget;
  }

  var wavetableAEpoch = this.getWavetableEpoch(this.blocksA);
  if (!this.compareWavetableEpoch(this.wavetableAEpoch, wavetableAEpoch)) {
    this.wavetableAEpoch = wavetableAEpoch;
    this.wavetableA = this.generateWavetable(this.blocksA);
  }
  var wavetableBEpoch = this.getWavetableEpoch(this.blocksB);
  if (!this.compareWavetableEpoch(this.wavetableBEpoch, wavetableBEpoch)) {
    this.wavetableBEpoch = wavetableBEpoch;
    this.wavetableB = this.generateWavetable(this.blocksB);
  }

  this.sampleRate = this.context.sampleRate;
  this.invSampleRate = 1.0 / this.sampleRate;
  this.probeSlope = 10.2 * this.invSampleRate;
  for (var i = 0; i < L.length; i++) {
    for (var j = 0; j < activeValues.length; j++) {
      activeValues[j].processValue();
    }
    if (this.noteTriggered || forceParam.getValue() > 0.5) {
      this.generateSample(sample);
    } else {
      sample[0] = 0.0;
      sample[1] = 0.0;
    }
    sample[0] = this.filterA.step(sample[0]);
//    sample[1] = this.filterB.step(sample[1]);
    sample[0] = this.driveA.step(sample[0]) * 0.5;
//    sample[1] = this.driveB.step(sample[1]) * 0.5;
    sample[0] = this.limiter.step(sample[0]);
    sample[0] = Math.atan(sample[0]);
//    sample[1] = Math.atan(sample[1]);
    sample[1] = sample[0];
    L[i] = sample[0];
    R[i] = sample[1];

    var scopeSample = (sample[0] + sample[1]) * 0.5;

    this.probeAcc += this.probeSlope;
    if (this.probeAcc >= 1.0) {
      this.probeAcc -= 1.0;
    }
    var probeFalloff = 0.001;
    this.probeA = this.probeA * (1.0 - probeFalloff) + Math.cos(this.probeAcc * Math.PI * 2) * scopeSample * probeFalloff;
    this.probeB = this.probeB * (1.0 - probeFalloff) + Math.sin(this.probeAcc * Math.PI * 2) * scopeSample * probeFalloff;

    this.scopeSamples[this.scopeWritePos] = scopeSample;
    this.scopeWritePos++;
    if (this.scopeWritePos >= this.scopeSamples.length) {
      this.scopeWritePos = 0;
    }
  }
};

DSP.prototype.generateSample = function(sample) {
  this.oscFreq = Math.pow(2, (noteParam.getValue() - 69) / 12 + pitchParam.getValue()) * 440.0;
  var slope = this.oscFreq * this.invSampleRate;
  this.oscAcc += slope;
  if (this.oscAcc >= 1.0) {
    this.oscAcc -= 1.0;
  }
  var level = -Math.floor(Math.log2(slope) + 2.8);
  var sampleA = this.sampleWavetable(this.wavetableA, level, this.oscAcc);
  var sampleB = this.sampleWavetable(this.wavetableB, level, this.oscAcc);
  var morphIndex = Math.floor(this.oscAcc * this.morphParams.length) % this.morphParams.length;
  var alpha = this.morphParams[morphIndex].getValue();

  var output = sampleA * (1.0 - alpha) + sampleB * alpha;
  sample[0] = output;
  sample[1] = output;
}

DSP.prototype.generateWavetable = function(blocks) {
  var waveform = this.generateBaseWaveform(blocks);
  var wavetableLevel = this.interpolate4(waveform);
  var wavetables = [];
  while (wavetableLevel.length > 4) {
    wavetables.push(wavetableLevel);
    wavetableLevel = this.halfsample(wavetableLevel);
  }
  wavetables.reverse();
  return wavetables;
}

DSP.prototype.getWavetableEpoch = function(blocks) {
  var key = [];
  for (var i = 0; i < blocks.length; i++) {
    key.push(blocks[i].getEpoch());
  }
  return key;
}

DSP.prototype.compareWavetableEpoch = function(key1, key2) {
  if (!key1 || !key2) {
    return false;
  }
  if (key1.length != key2.length) {
    return false;
  }
  for (var i = 0; i < key1.length; i++) {
    if (key1[i] != key2[i]) {
      return false;
    }
  }
  return true;
}

DSP.prototype.generateBaseWaveform = function(blocks) {
  var wavetable = [];
  for (var i = 0; i < blocks.length; i++) {
    wavetable = wavetable.concat(blocks[i].samples);
  }
  return wavetable;
}

DSP.prototype.interpolate4 = function(wavetable) {
  var kKernelGain = 2.0;
  var kKernelValue00 = 1 / kKernelGain;
  var kKernelValue01 = 0.8900670517 / kKernelGain;
  var kKernelValue02 = 0.6079271019 / kKernelGain;
  var kKernelValue03 = 0.270189823 / kKernelGain;
  var kKernelValue05 = -0.1328710184 / kKernelGain;
  var kKernelValue06 = -0.1350949115 / kKernelGain;
  var kKernelValue07 = -0.0677913359 / kKernelGain;
  var kKernelValue09 = 0.03002109145 / kKernelGain;
  var kKernelValue10 = 0.02431708407 / kKernelGain;
  var kKernelValue11 = 0.007355926047 / kKernelGain;

  var newLength = wavetable.length * 4;
  var newWavetable = [];
  for (var i = 0; i < newLength; i++) {
    newWavetable.push(0.0);
  }
  for (var i = 0; i < wavetable.length; i++) {
    var outputPos = i * 4;
    var input = wavetable[i];
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

DSP.prototype.halfsample = function(wavetable) {
  var kKernelGain = 2.0;
  var kKernelValue00 = 1 / kKernelGain;
  var kKernelValue01 = 0.8900670517 / kKernelGain;
  var kKernelValue02 = 0.6079271019 / kKernelGain;
  var kKernelValue03 = 0.270189823 / kKernelGain;
  var kKernelValue05 = -0.1328710184 / kKernelGain;
  var kKernelValue06 = -0.1350949115 / kKernelGain;
  var kKernelValue07 = -0.0677913359 / kKernelGain;
  var kKernelValue09 = 0.03002109145 / kKernelGain;
  var kKernelValue10 = 0.02431708407 / kKernelGain;
  var kKernelValue11 = 0.007355926047 / kKernelGain;

  var newLength = Math.floor(wavetable.length / 2);
  var newWavetable = [];
  for (var newPos = 0; newPos < newLength; newPos++) {
    var inputPos = newPos * 2 - 1;
    var output =-
        wavetable[(inputPos + 0 + wavetable.length) % wavetable.length] * kKernelValue00
        + wavetable[(inputPos + 1 + wavetable.length) % wavetable.length] * kKernelValue01
        + wavetable[(inputPos + 2 + wavetable.length) % wavetable.length] * kKernelValue02
        + wavetable[(inputPos + 3 + wavetable.length) % wavetable.length] * kKernelValue03
        + wavetable[(inputPos + 5 + wavetable.length) % wavetable.length] * kKernelValue05
        + wavetable[(inputPos + 6 + wavetable.length) % wavetable.length] * kKernelValue06
        + wavetable[(inputPos + 7 + wavetable.length) % wavetable.length] * kKernelValue07
        + wavetable[(inputPos + 9 + wavetable.length) % wavetable.length] * kKernelValue09
        + wavetable[(inputPos + 10 + wavetable.length) % wavetable.length] * kKernelValue10
        + wavetable[(inputPos + 11 + wavetable.length) % wavetable.length] * kKernelValue11
        + wavetable[(inputPos - 1 + wavetable.length) % wavetable.length] * kKernelValue01
        + wavetable[(inputPos - 2 + wavetable.length) % wavetable.length] * kKernelValue02
        + wavetable[(inputPos - 3 + wavetable.length) % wavetable.length] * kKernelValue03
        + wavetable[(inputPos - 5 + wavetable.length) % wavetable.length] * kKernelValue05
        + wavetable[(inputPos - 6 + wavetable.length) % wavetable.length] * kKernelValue06
        + wavetable[(inputPos - 7 + wavetable.length) % wavetable.length] * kKernelValue07
        + wavetable[(inputPos - 9 + wavetable.length) % wavetable.length] * kKernelValue09
        + wavetable[(inputPos - 10 + wavetable.length) % wavetable.length] * kKernelValue10
        + wavetable[(inputPos - 11 + wavetable.length) % wavetable.length] * kKernelValue11;

    newWavetable.push(output);
  }
  return newWavetable;
}

DSP.prototype.sampleWavetable = function(wavetable, level, pos) {
  var wavetableLevel = wavetable[Math.max(0, Math.min(wavetable.length-1, level))];
  var totalPos = pos * wavetableLevel.length;
  var coarsePos = Math.floor(totalPos);
  var finePos = totalPos - coarsePos;
  var index1 = coarsePos % wavetableLevel.length;
  var index2 = (coarsePos + 1) % wavetableLevel.length;
  var sample1 = wavetableLevel[index1];
  var sample2 = wavetableLevel[index2];
  return sample1 * (1.0 - finePos) + sample2 * finePos;
}


DSP.prototype.visualize = function() {
  this.canvas.width = this.WIDTH;
  this.canvas.height = this.HEIGHT;
  var c = this.canvas.getContext('2d');
  c.lineWidth = 2;
  c.beginPath();

  var sx = 0.68;
  var viewportPeriod = this.WIDTH / sx;
  var oscPeriod = this.sampleRate / this.oscFreq;
  var oscOffset = oscPeriod * (-0.0 - this.oscAcc);
  var ox = Math.floor(oscOffset + viewportPeriod * 0.5 - oscPeriod * 1.5);
  var pxWidth = Math.floor(this.WIDTH / sx);
  for (var i = 0; i < pxWidth; i++) {
    var value = this.scopeSamples[(this.scopeWritePos - i - 1 + ox + this.scopeSamples.length) % this.scopeSamples.length];
    var height = this.HEIGHT * (value * 0.5 + 0.5);
    var offset = this.HEIGHT - height - 1;
    if (i == 0) {
      c.moveTo(this.WIDTH - i * sx, offset);
    }
    c.lineTo(this.WIDTH - i * sx, offset);
  }
  c.stroke();

  this.brandLeft.style.left = -100 * this.probeA + "px";
  this.brandLeft.style.top = -100 * this.probeB + "px";
  this.brandRight.style.left = 100 * this.probeB + "px";
  this.brandRight.style.top = 100 * this.probeA + "px";

  window.setTimeout(this.visualize.bind(this), 1000 / 60);
}


