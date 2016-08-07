

function FastScalarHighPassFilter(frequency, sampleRate) {
  this.acc = 0.0;
  this.history = 0.0;
  this.filterCoef = 1 / (1 + (frequency) * (1.0 / sampleRate * 2.0 * Math.PI));
}

FastScalarHighPassFilter.prototype.step = function(input) {
  var output = (this.acc + input - this.history) * this.filterCoef;
  this.acc = output;
  this.history = input;
  return output;
}


function FastScalarLowPassFilter(frequency, sampleRate) {
  this.acc = 0.0;
  var filterK = (1.0 / sampleRate * 2.0 * Math.PI) * (frequency);
  this.filterCoef = filterK / (1 + filterK);
}

FastScalarLowPassFilter.prototype.step = function(input) {
  var output = input * this.filterCoef + this.acc * (1 - this.filterCoef);
  this.acc = output;
  return output;
}


function Filter(cutoffParam, resoParam, sampleRate) {
  this.cutoffParam = cutoffParam;
  this.resoParam = resoParam;
  this.sampleRate = sampleRate;
  this.history1 = 0.0;
  this.history2 = 0.0;
  this.history3 = 0.0;
  this.history4 = 0.0;
  this.frequencyDifferentiator = new FastScalarHighPassFilter(810.0, sampleRate);
  this.frequencySmoother = new FastScalarLowPassFilter(5.0, sampleRate);
}

Filter.prototype.step = function(input, isInputSilent) {
  var paramDataDriveAmount = 1.0;
  var paramDataDrivePreamp = 1.0;
  var paramDataDrivePreampInv = 1.0 / paramDataDrivePreamp;
  var paramDataLinearFrequency = this.cutoffParam.getValue();
  var paramDataBaseQ = Math.sqrt(this.resoParam.getValue() * 0.5);

  var HighFrequencyOctaves = 12.1066666666;
  var powValue = Math.pow(2, (paramDataLinearFrequency + 5) * HighFrequencyOctaves / 10);
  var paramDataFrequency = 10.0 * powValue;

  var linearFrequency = paramDataLinearFrequency;
  var frequencyDelta = this.frequencyDifferentiator.step(linearFrequency);
  frequencyDelta = this.hardLimitSoftSine(Math.abs(frequencyDelta) * 52.0);
  var frequencySpeed = this.frequencySmoother.step(frequencyDelta);

  var frequency = paramDataFrequency;
  var baseQ = paramDataBaseQ;

  var wcRatio0 = Math.min(0.5, 2*2*frequency / this.sampleRate);
  var wcRatio = Math.atan(wcRatio0);

  var s1 = this.history1;
  var s2 = this.history2;
  var s3 = this.history3;
  var s4 = this.history4;

  var g = wcRatio;
  var gcoef = g;//g/(g+1);
  var G1 = gcoef;//ExtraMath::Min(gcoef, 1.0f);
  var G2 = Math.min(gcoef, 0.331);
  var G3 = gcoef;//ExtraMath::Min(gcoef, 0.306f);
  var G4 = gcoef;//ExtraMath::Min(gcoef, 0.275f);
  var G = g*g*g*g;

  var feedback = baseQ * 5.0 * Math.max(0.0, (paramDataLinearFrequency / -8.0 + 1.0));
  var S = G4*G3*G2*s1 + G4*G3*s2 + G4*s3 + s4;

  var saturateAmountExtra = frequencySpeed * 0.75 * paramDataDriveAmount;
  var saturateAmount = 0.5 + saturateAmountExtra;
  var saturateAmountInv = 2.0 / (1.0 + saturateAmountExtra);

  var input2 = input;
  input2 = this.hardLimitSoftSine(input2*saturateAmount)*saturateAmountInv;
  var feedbackOutput = input - (input - feedback*S) / (1 + feedback*G);

  var BandpassSaturatePower = 0.87;
  var InvBandpassSaturatePower = 1.0 / BandpassSaturatePower;
  var ybpsat = this.hardLimit(feedbackOutput*BandpassSaturatePower) * InvBandpassSaturatePower;
  feedbackOutput = feedbackOutput + (feedbackOutput - ybpsat) * 2.31;

  var FeedbackSaturatePower = 0.750;
  var InvFeedbackSaturatePower = 1.0 / FeedbackSaturatePower;
  feedbackOutput = this.hardLimit(feedbackOutput*FeedbackSaturatePower * paramDataDrivePreamp) * InvFeedbackSaturatePower * paramDataDrivePreampInv;

  var y0 = input2 - feedbackOutput;

  var v1 = G1*(y0 - s1);
  var y1 = (s1 + v1);
  var v2 = G2*(y1 - s2);
  var y2 = (s2 + v2);
  var v3 = G3*(y2 - s3);
  var y3 = (s3 + v3);
  var v4 = G4*(y3 - s4);
  var y4 = (s4 + v4);

  this.history1 = y1 + v1;
  this.history2 = y2 + v2;
  this.history3 = y3 + v3;
  this.history4 = y4 + v4;

  var output = y4;
  return output;
};

Filter.prototype.isSilent = function() {
  return Math.abs(this.history1) < 0.0000000001 &&
      Math.abs(this.history2) < 0.0000000001 &&
      Math.abs(this.history3) < 0.0000000001 &&
      Math.abs(this.history4) < 0.0000000001;
}

Filter.prototype.hardLimit = function(input) {
  return Math.atan(input);
}

Filter.prototype.hardLimitSoftSine = function(input) {
  return Math.atan(input);
}

