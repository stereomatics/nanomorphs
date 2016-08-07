
function DSP() {
  this.allParams = [];
  this.blocksA = [];
  this.blocksB = [];

  this.active = false;
  this.noteTriggered = false;
  this.paintScheduled = false;

  this.brandLeft = document.getElementById('brand-left');
  this.brandRight = document.getElementById('brand-right');

  this.canvas = document.getElementById('osc');
  this.WIDTH = this.canvas.width;
  this.HEIGHT = this.canvas.height;

  this.scopeSamplesLength = 1;
  this.scopeSamples = new Float64Array(this.scopeSamplesLength);
  this.scopeSamplesOffset = 0;
  this.reset();

  this.nativeDSP = new module.DSP();

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
  this.nativeDSP.setSampleRate(this.context.sampleRate);
  for (var i = 0; i < this.allParams.length; i++) {
    this.allParams[i].forceUpdate();
  }

  this.node = this.context.createScriptProcessor(1024, 1, 2);
  this.node.onaudioprocess = this.process.bind(this);

  this.start();
}

DSP.prototype.start = function() {
  if (this.active) {
    return;
  }
  this.active = true;
  this.nativeDSP.activate();
  this.node.connect(this.context.destination);
  this.schedulePaint();
}

DSP.prototype.stop = function() {
  if (!this.active) {
    return;
  }
  this.active = false;
  this.nativeDSP.deactivate();
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

  for (var i = 0; i < this.scopeSamplesLength; i++) {
    this.scopeSamples[this.scopeSamplesOffset + i] = 0.0;
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
  window.setTimeout(this.visualize.bind(this), 1000.0 / 60);
}

DSP.prototype.process = function(e) {
  if (!this.context) {
    return;
  }
  this.sampleRate = this.context.sampleRate;
  this.nativeDSP.setSampleRate(this.context.sampleRate);

  var L = e.outputBuffer.getChannelData(0);
  var R = e.outputBuffer.getChannelData(1);

  var runOsc = this.shouldRunOsc();
  var silent = this.silent;
  if (runOsc) {
    silent = false;
  }
  if (runOsc != this.noteTriggered) {
    this.noteTriggered = runOsc;
    this.nativeDSP.setNoteTriggered(runOsc);
  }

  var wavetableAEpoch = this.getWavetableEpoch(this.blocksA);
  if (!this.compareWavetableEpoch(this.wavetableAEpoch, wavetableAEpoch)) {
    this.wavetableAEpoch = wavetableAEpoch;

    var waveform = this.generateBaseWaveform(this.blocksA);
    var buffer = module._malloc(waveform.length * 8);
    // Assume 8 byte alignment.
    module.HEAPF64.set(waveform, (buffer>>3));
    this.nativeDSP.setWavetableA({ 'ptr':buffer, 'length':waveform.length });
    module._free(buffer);
  }
  var wavetableBEpoch = this.getWavetableEpoch(this.blocksB);
  if (!this.compareWavetableEpoch(this.wavetableBEpoch, wavetableBEpoch)) {
    this.wavetableBEpoch = wavetableBEpoch;

    var waveform = this.generateBaseWaveform(this.blocksB);
    var buffer = module._malloc(waveform.length * 8);
    // Assume 8 byte alignment.
    module.HEAPF64.set(waveform, (buffer>>3));
    this.nativeDSP.setWavetableB({ 'ptr':buffer, 'length':waveform.length });
    module._free(buffer);
  }
  var sampleCount = L.length;
  this.nativeDSP.setSampleRate(this.context.sampleRate);
  this.nativeDSP.generateSamples(sampleCount);

  {
    var sampleArray = this.nativeDSP.getOutputSamplesA();
    var output = L;
    var srcStart = (sampleArray.ptr>>3);
    output.set(module.HEAPF64.subarray(srcStart, srcStart + sampleArray.length));
  }
  {
    var sampleArray = this.nativeDSP.getOutputSamplesB();
    var output = R;
    var srcStart = (sampleArray.ptr>>3);
    output.set(module.HEAPF64.subarray(srcStart, srcStart + sampleArray.length));
  }
  var displayData = this.nativeDSP.getDisplayParams();
  this.oscAcc = displayData.oscAcc;
  this.oscFreq = displayData.oscFreq;
  this.probeA = displayData.probeA;
  this.probeB = displayData.probeB;
  {
    var sampleArray = displayData.scopeSamples;
    var ptr = sampleArray.ptr;
    var length = sampleArray.length;
    this.scopeSamples = module.HEAPF64;
    // Assume 8 byte alignment.
    this.scopeSamplesOffset = (ptr>>3);
    this.scopeSamplesLength = length;
    this.scopeWritePos = displayData.scopeWritePos;
  }

  silent = this.nativeDSP.isSilent();
  this.silent = silent;
  if (silent) {
    this.stop();
  }
};

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
    var value = this.scopeSamples[this.scopeSamplesOffset + ((this.scopeWritePos - i - 1 + ox + this.scopeSamplesLength) % this.scopeSamplesLength)];
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


