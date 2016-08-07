

function AnalogCircuit(sampleRate) {
  this.history1 = 0.0;
  this.history2 = 0.0;
  this.differentiator = new FastScalarHighPassFilter(44100/90, sampleRate);
  this.phaseDelay = new FastScalarHighPassFilter(44100*4/10, sampleRate);
}

AnalogCircuit.prototype.step = function(input) {
  var paramDataSmoothing = 0.600 * 2.5;
  var ChargeScale = 0.268;

  var delta = this.differentiator.step(input) * ChargeScale;
  delta = this.phaseDelay.step(delta);

  var alpha = Math.min(1.0, Math.abs(delta)*paramDataSmoothing);
  delta = delta*(1.0-alpha) + this.history2*alpha;
  this.history2 = this.history1;
  this.history1 = delta;
  return input + delta*1.0;
}



function Drive(driveParam, sampleRate) {
  this.driveParam = driveParam;
  this.integrator = new FastScalarLowPassFilter(112, sampleRate);
  this.analogCircuit = new AnalogCircuit(sampleRate);
  this.silent = false;
}

Drive.prototype.step = function(input, isInputSilent) {
  var PreAmp = 1.0 / 10;
  var PreAmpInverse = 1/PreAmp;
  var SaturationHeadroom = 5.0 / 7;
  var SaturationLogBase = 3.73;
  var BaseDriveBias = 1.2;
  var BaseDriveBiasValue = 1;
  var SaturationLogDenominator = Math.log2(SaturationLogBase);

  var driveValue = this.driveParam.getValue() * 2.0;
  dataDrive = driveValue > 0 ? (1+((Math.pow(200, driveValue)-1)/199)*50) : (driveValue + 1);
  var driveBias = Math.max(0.0, Math.min(1.0, 1-((dataDrive-1)/BaseDriveBiasValue)))*BaseDriveBias;

  var dataSaturationHeadroom = Math.max(0.0, SaturationHeadroom-driveBias);
  var dataSaturationHeadroomInv = 1 / Math.max(0.05, dataSaturationHeadroom);
  var dataSaturationHeadroomReverse = 1-Math.max(0.05, dataSaturationHeadroom);
  var dataDriveBias = 1 + (1/Math.max(1.0, dataDrive)-1) * dataSaturationHeadroom;
  var dataNoiseAlpha = Math.max(0.0, Math.min(1.0, (1-driveBias*driveBias*0.8)));


  var input2 = input * dataDrive*PreAmp;
  var output = input2;

  var saturationHeadroomReverse = dataSaturationHeadroomReverse;
  var inputHigh = output > saturationHeadroomReverse;
  var inputLow = output < -saturationHeadroomReverse;
  var inputAny = inputHigh | inputLow;

  if (inputAny) {
      var sign = input >= 0 ? 1.0 : -1.0;

      output = (sign*output - saturationHeadroomReverse);
      var alin = Math.log2(output*dataSaturationHeadroomInv + SaturationLogBase)/SaturationLogDenominator-(1.0);
      alin = this.integrator.step(sign*alin);
      output = alin + sign*saturationHeadroomReverse;
  } else {
      this.integrator.step(0);
  }

  output *= dataDriveBias*PreAmpInverse;
  var alpha = Math.min(1.0, Math.abs(output)*dataNoiseAlpha);

  output = output*(1.0-alpha) + this.analogCircuit.step(output)*alpha;

  this.silent = isInputSilent;
  return output;
};

Drive.prototype.isSilent = function() {
  return this.silent;
}

Drive.prototype.hardLimit = function(input) {
  return Math.atan(input);
}

Drive.prototype.hardLimitSoftSine = function(input) {
  return Math.atan(input);
}

