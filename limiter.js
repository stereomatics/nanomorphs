
function Limiter(sampleRate) {
  this.releaseCoef = 1.0 / (sampleRate * 0.08);
  this.linearReleaseCoef = 1.0 / (sampleRate * 0.4);
  this.peakAttack = 1.0 / (sampleRate * 0.0008);
  this.rmsAcc = 0.0;
  this.gainReduction = 0.0;
  this.historyLength = Math.max(1, Math.floor(0.005 * sampleRate));
  this.history = new Float64Array(this.historyLength);
  this.historyPos = 0;
  this.silent = false;
}

Limiter.prototype.step = function(input, isInputSilent) {
  var historyValue = this.history[this.historyPos];
  var inputSq = input*input;
  this.history[this.historyPos] = inputSq;
  this.rmsAcc += inputSq;
  this.rmsAcc -= historyValue;
  this.rmsAcc *= 0.99995;
  this.rmsAcc = Math.max(0.0, this.rmsAcc);
  var rms = Math.sqrt(this.rmsAcc / this.historyLength);
  this.historyPos++;
  if (this.historyPos >= this.history.length) {
    this.historyPos -= this.history.length;
  }

  this.gainReduction = this.gainReduction * (1.0 - this.releaseCoef) - this.linearReleaseCoef;
  this.gainReduction = Math.max(0.0, this.gainReduction);
  var thresholdLevel = 1.0 + this.gainReduction;
  if (rms > thresholdLevel) {
    this.gainReduction = rms - 1.0;
    thresholdLevel = rms;
  }
  var peak = Math.abs(input);
  if (peak > thresholdLevel) {
    this.gainReduction = this.gainReduction * (1.0 - this.peakAttack) + (peak - 1.0) * this.peakAttack;
    thresholdLevel = 1.0 + this.gainReduction;
  }
  this.silent = isInputSilent;
  return input / thresholdLevel;
};

Limiter.prototype.isSilent = function() {
  return this.silent;
}
