
function Block() {
}

Block.prototype.updateCanvas = function() {
};


WaveformBlock.prototype.__proto__ = Block.prototype;

function WaveformBlock(canvasId) {
    this.samples = [];
    this.canvas = document.getElementById(canvasId);
    for (var i = 0; i < 256; i++) {
        this.samples.push(0.0);
//        this.samples.push(Math.random() * 2.0 - 1.0);
    }
}

WaveformBlock.prototype.updateCanvas = function() {
    var c = this.canvas.getContext('2d');
    var w = this.canvas.width;
    var h = this.canvas.height;

    c.beginPath();
    for (var i = 0; i < this.samples.length; i++) {
      var y = (this.samples[i] * -0.5 + 0.5) * h;
      if (i == 0) {
        c.moveTo(0, y);
      }
      c.lineTo(i / this.samples.length * w, y);
    }
    c.stroke();
}

WaveformBlock.prototype.getEpoch = function() {
  return 0;
}



noteParam = new Value(0.0, 127.0, 33.0, false);
pitchParam = new Value(-1.0, 1.0, 0.0, true);
cutoffParam = new Value(-5.0, 5.0, 5.0, true);
resoParam = new Value(0.0, 2.0, 0.2, false);
driveParam = new Value(0.0, 1.0, 0.29, false);
forceParam = new Value(0.0, 1.0, 0.0, false);

waveformMorph1 = new Value(0.0, 1.0, 0.0);
waveformMorph2 = new Value(0.0, 1.0, 0.0);
waveformMorph3 = new Value(0.0, 1.0, 0.0);
waveformMorph4 = new Value(0.0, 1.0, 0.0);

cutoffSlider = new Slider(cutoffParam, false, 'cutoffSlider');
resoSlider = new Slider(resoParam, false, 'resoSlider');
driveSlider = new Slider(driveParam, false, 'driveSlider');
pitchSlider = new Slider(pitchParam, false, 'pitchSlider');
forceSlider = new ToggleSlider(forceParam, false, 'forceSlider');


waveformBlocks = [
  new WaveformBlock('waveformA1'),
  new WaveformBlock('waveformB1'),
  new WaveformBlock('waveformA2'),
  new WaveformBlock('waveformB2'),
  new WaveformBlock('waveformA3'),
  new WaveformBlock('waveformB3'),
  new WaveformBlock('waveformA4'),
  new WaveformBlock('waveformB4'),
];

waveformSliders = [
  new Slider(waveformMorph1, true, 'waveformSlider1', 'waveformA1'),
  new Slider(waveformMorph2, true, 'waveformSlider2', 'waveformA2'),
  new Slider(waveformMorph3, true, 'waveformSlider3', 'waveformA3'),
  new Slider(waveformMorph4, true, 'waveformSlider4', 'waveformA4'),
];


for (var i = 0; i < 256; i++) {
    waveformBlocks[1].samples[i] = i / 256.0 / 2.0 + 0.0;
}
for (var i = 0; i < 256; i++) {
    waveformBlocks[3].samples[i] = i / 256.0 / 2.0 + 0.5;
}
for (var i = 0; i < 256; i++) {
    waveformBlocks[5].samples[i] = -1.0 + i / 256.0 / 2.0;
}
for (var i = 0; i < 256; i++) {
    waveformBlocks[7].samples[i] = -0.5 + i / 256.0 / 2.0;
}

for (var i = 0; i < 256; i++) {
    waveformBlocks[0].samples[i] = Math.random() * 2.0 - 1.0;
}
for (var i = 0; i < 256; i++) {
    waveformBlocks[2].samples[i] = Math.random() * 2.0 - 1.0;
}
for (var i = 0; i < 256; i++) {
    waveformBlocks[4].samples[i] = Math.random() * 2.0 - 1.0;
}
for (var i = 0; i < 256; i++) {
    waveformBlocks[6].samples[i] = Math.random() * 2.0 - 1.0;
}



for (var i = 0; i < waveformBlocks.length; i++) {
    waveformBlocks[i].updateCanvas();
}



new DSP(
    [waveformBlocks[1], waveformBlocks[3], waveformBlocks[5], waveformBlocks[7]],
    [waveformBlocks[0], waveformBlocks[2], waveformBlocks[4], waveformBlocks[6]]);

