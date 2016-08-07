
function DSP() {
  this.blocksA = [];
  this.blocksB = [];

  this.active = false;
  this.paintScheduled = false;

  this.wavetableA = [];
  this.wavetableB = [];
  this.morphParams = [];

  this.brandLeft = document.getElementById('brand-left');
  this.brandRight = document.getElementById('brand-right');

  this.canvas = document.getElementById('osc');
  this.WIDTH = this.canvas.width;
  this.HEIGHT = this.canvas.height;

  this.scopeSamples = new Float64Array(1024*16);
  this.reset();

  this.schedulePaint();
  {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
    this.isMobileWeb = check;
  }
}

DSP.prototype.setBlocks = function(blocksA, blocksB, morphParams) {
  this.blocksA = blocksA;
  this.blocksB = blocksB;
  this.morphParams = morphParams;
}

DSP.prototype.checkStart = function() {
  if (this.context) {
    if (this.shouldRunOsc()) {
      this.start();
    }
    return;
  }
  this.context = new (window.AudioContext || window.webkitAudioContext)();
  this.node = this.context.createScriptProcessor(1024, 1, 2);
  this.node.onaudioprocess = this.process.bind(this);

  this.filterA = new Filter(cutoffParam, resoParam, this.context.sampleRate);
  this.filterB = new Filter(cutoffParam, resoParam, this.context.sampleRate);
  this.driveA = new Drive(driveParam, this.context.sampleRate);
  this.driveB = new Drive(driveParam, this.context.sampleRate);
  this.limiter = new Limiter(this.context.sampleRate);

  this.start();
}

DSP.prototype.start = function() {
  if (this.active) {
    return;
  }
  this.active = true;
  this.node.connect(this.context.destination);
  this.schedulePaint();
}

DSP.prototype.stop = function() {
  if (!this.active) {
    return;
  }
  this.active = false;
  this.node.disconnect();
  this.reset();
}

DSP.prototype.isActive = function() {
  return this.active;
}

DSP.prototype.reset = function() {
  this.silent = true;
  this.probeAcc = 0.0;
  this.probeSlope = 1.0;
  this.probeA = 0.0;
  this.probeB = 0.0;
  this.scopeWritePos = 0;
  this.sampleRate = 44100;
  this.oscAcc = 0.0;
  this.oscFreq = 440.0;

  for (var i = 0; i < this.scopeSamples.length; i++) {
    this.scopeSamples[i] = 0.0;
  }
}

DSP.prototype.shouldRunOsc = function() {
  return pitchParam.isInEdit() || forceParam.getValue() > 0.5;
}

DSP.prototype.schedulePaint = function() {
  if (this.paintScheduled) {
    return;
  }
  this.paintScheduled = true;
  window.setTimeout(this.visualize.bind(this), 1000 / 60);
}

DSP.prototype.process = function(e) {
  if (!this.context) {
    return;
  }
  var L = e.outputBuffer.getChannelData(0);
  var R = e.outputBuffer.getChannelData(1);
  var sample = [0.0, 0.0];

  var runOsc = this.shouldRunOsc();
  var silent = this.silent;
  if (runOsc) {
    silent = false;
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
    if (!silent) {
      var nowSilent = true;
      if (runOsc) {
        this.generateSample(sample);
        nowSilent = false;
      } else {
        sample[0] = 0.0;
        sample[1] = 0.0;
      }
      sample[0] = this.filterA.step(sample[0] * 0.8, nowSilent);
      nowSilent = nowSilent && this.filterA.isSilent();
      sample[0] = this.driveA.step(sample[0], nowSilent) * 0.5;
      nowSilent = nowSilent && this.driveA.isSilent();
      sample[0] = this.limiter.step(sample[0], nowSilent);
      nowSilent = nowSilent && this.limiter.isSilent();
      sample[0] = Math.atan(sample[0]);
      sample[1] = sample[0];
      L[i] = sample[0];
      R[i] = sample[1];
      if (nowSilent) {
        silent = true;
      }
    } else {
      L[i] = 0.0;
      R[i] = 0.0;
    }

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
  this.silent = silent;
  if (silent) {
    this.stop();
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
  var wavetableLength = 0;
  for (var i = 0; i < blocks.length; i++) {
    wavetableLength += blocks[i].samples.length;
  }
  var wavetable = new Float64Array(wavetableLength);
  var wavetablePos = 0;
  for (var i = 0; i < blocks.length; i++) {
    for (var j = 0; j < blocks[i].samples.length; j++) {
      wavetable[wavetablePos++] = blocks[i].samples[j];
    }
  }
  return wavetable;
}

DSP.prototype.interpolate4 = function(wavetable) {
  var kKernelGain = 1.0;
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
  var newWavetable = new Float64Array(newLength);
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
  var kKernelGain = 4.0;
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
  var newWavetable = new Float64Array(newLength);
  for (var newPos = 0; newPos < newLength; newPos++) {
    var inputPos = newPos * 2 - 1;
    var output =
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

    newWavetable[newPos] = output;
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
  this.paintScheduled = false;
  this.canvas.width = this.WIDTH;
  this.canvas.height = this.HEIGHT;
  var c = this.canvas.getContext('2d');
  c.lineWidth = 2;
  c.beginPath();

  var step = this.isMobileWeb ? 4 : 1;
  var sx = 0.68;
  var viewportPeriod = this.WIDTH / sx;
  var oscPeriod = this.sampleRate / this.oscFreq;
  var oscOffset = oscPeriod * (-0.0 - this.oscAcc);
  var ox = Math.floor(oscOffset + viewportPeriod * 0.5 - oscPeriod * 1.5);
  var pxWidth = Math.floor(this.WIDTH / sx);
  for (var i = 0; i < pxWidth; i+=step) {
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

  if (this.active) {
    this.schedulePaint();
  }
}


