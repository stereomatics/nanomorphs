
var activeValues = [];

function Value(dsp, minValue, maxValue, defaultValue, momentary) {
    this.dsp = dsp;
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.defaultValue = defaultValue;
    this.momentary = !!momentary;
    this.inEdit = false;
    this.value = defaultValue;
    this.startValue = defaultValue;
    this.targetValue = defaultValue;
    this.floatTime = 0;
    this.isFloating = false;
    this.onEditListeners = [];
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
    value = Math.max(this.minValue, Math.min(this.maxValue, value));
    this.startValue = this.value;
    this.floatTime = 0;
    this.targetValue = value;
    if (!this.dsp.isActive()) {
        this.isFloating = false;
        this.value = this.targetValue;
    } else if (!this.isFloating) {
        this.isFloating = true;
        activeValues.push(this);
    }
    for (var i = 0; i < this.onEditListeners.length; i++) {
        this.onEditListeners[i]();
    }
};

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
    return this.targetValue;
}

Value.prototype.isInEdit = function() {
    return this.inEdit;
}

Value.prototype.addOnEditListener = function(l) {
    this.onEditListeners.push(l);
}

Value.prototype.processValue = function() {
    var floatLength = 1000;
    this.floatTime++;
    if (this.floatTime > floatLength) {
        this.value = this.targetValue;
        this.floatTime = 0;
        var index = activeValues.indexOf(this);
        if (index >= 0) {
            activeValues.splice(index, 1);
        }
        this.isFloating = false;
        return false;
    }
    var alpha = this.floatTime / floatLength;
    this.value = this.startValue * (1.0 - alpha) + this.targetValue * alpha;
    return true;
}


