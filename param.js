
function Value(dsp, paramIndex, minValue, maxValue, defaultValue, momentary) {
    this.dsp = dsp;
    this.paramIndex = paramIndex;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.defaultValue = defaultValue;
    this.momentary = !!momentary;
    this.inEdit = false;
    this.value = defaultValue;
    this.onEditListeners = [];
    this.dsp.allParams.push(this);
}

Value.prototype.beginEdit = function() {
    if (this.inEdit) {
        return;
    }
    this.inEdit = true;
};

Value.prototype.editValue = function(value) {
    if (!this.inEdit) {
        return;
    }
    this.inEdit = true;
    value = Math.max(this.minValue, Math.min(this.maxValue, value));
    this.value = value;
    this.dsp.nativeDSP.setParamValue(this.paramIndex, value, !this.dsp.isActive());
    for (var i = 0; i < this.onEditListeners.length; i++) {
        this.onEditListeners[i]();
    }
};

Value.prototype.forceUpdate = function() {
  this.dsp.nativeDSP.setParamValue(this.paramIndex, this.value, true);
}

Value.prototype.endEdit = function() {
    if (!this.inEdit) {
        return;
    }
    if (this.momentary) {
        this.editValue(this.defaultValue);
    }
    this.inEdit = false;
};

Value.prototype.getValue = function() {
    return this.value;
}

Value.prototype.getTargetValue = function() {
    return this.value;
}

Value.prototype.isInEdit = function() {
    return this.inEdit;
}

Value.prototype.addOnEditListener = function(l) {
    this.onEditListeners.push(l);
}
