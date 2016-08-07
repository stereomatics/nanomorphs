
function Slider(dsp, value, inverted, sliderId, handleId) {
  this.dsp = dsp;
  this.value = value;
  this.value.addOnEditListener(this.valueEdited.bind(this));
  this.slider = document.getElementById(sliderId);
  this.inverted = inverted;
  this.sliderScale = 1.0;
  if (handleId) {
    this.handle = document.getElementById(handleId);
  } else {
    this.handle = this.slider.querySelector('#handle');
  }
  this.update();

  this.dragDown = false;
  this.dragId = 0;
  this.dragStartValue = 0.0;
  this.dragDelta = 0.0;
  this.dragPrevMouseY = 0.0;

  this.handle.unselectable = "on";
  this.handle.onselectstart = function() { return false; };
  this.handle.style.userSelect = "none";
  var mousetarget = this.handle.setCapture ? this.handle : document;
  this.handle.addEventListener("mousedown", this.mouseDown.bind(this), false);
  this.handle.addEventListener("losecapture", this.mouseUp.bind(this), false);
  mousetarget.addEventListener("mouseup", this.mouseUp.bind(this), false);
  mousetarget.addEventListener("mousemove", this.mouseMove.bind(this), false);

  this.handle.addEventListener("touchstart", this.touchStart.bind(this), false);
  this.handle.addEventListener("touchend", this.touchEnd.bind(this), false);
  this.handle.addEventListener("touchcancel", this.touchCancel.bind(this), false);
  this.handle.addEventListener("touchmove", this.touchMove.bind(this), false);
  this.handle.parentElement.parentElement.parentElement.addEventListener("touchstart", function (evt) { evt.preventDefault(); }, false);
}

Slider.prototype.valueEdited = function() {
  this.update();
}

Slider.prototype.dragStart = function(pageX, pageY, touchId) {
  if (this.dragDown) {
    return;
  }
  this.dragDown = true;
  this.dragId = touchId;
  this.dragPrevMouseY = pageY;
  this.dragDelta = 0.0;
  this.dragStartValue = this.value.getTargetValue();
  this.value.beginEdit();
  this.dsp.checkStart();
}

Slider.prototype.dragMove = function(pageX, pageY) {
  if (!this.dragDown) {
    return;
  }
  var delta = pageY - this.dragPrevMouseY;
  this.dragPrevMouseY = pageY;
  this.dragDelta += delta;
  var valueInterval = this.value.maxValue - this.value.minValue;
  var targetValue = this.dragStartValue + (this.inverted ? 1 : -1) * valueInterval * this.dragDelta / (this.slider.clientHeight - this.handle.parentElement.clientHeight);
  this.value.editValue(targetValue);
}

Slider.prototype.dragEnd = function(pageX, pageY) {
  if (!this.dragDown) {
    return;
  }
  this.dragDown = false;
  this.value.endEdit();
}

Slider.prototype.touchStart = function(evt) {
  evt.preventDefault();
  this.dragStart(evt.changedTouches[0].pageX, evt.changedTouches[0].pageY, evt.changedTouches[0].identifier);
};

Slider.prototype.touchMove = function(evt) {
  evt.preventDefault();
  var index = -1;
  for (var i = 0; i < evt.touches.length; i++) {
    if (evt.touches[i].identifier == this.dragId) {
      index = i;
      break;
    }
  }
  if (index < 0) {
    return;
  }
  this.dragMove(evt.touches[index].pageX, evt.touches[index].pageY)
};

Slider.prototype.mouseDown = function(evt) {
  if (this.dragDown) {
    return;
  }
  evt.preventDefault();
  if (this.handle.setCapture) {
    this.handle.setCapture();
  }
  this.dragStart(evt.pageX, evt.pageY);
}

Slider.prototype.mouseUp = function(evt) {
  if (!this.dragDown) {
    return;
  }
  evt.preventDefault();
  if (this.handle.releaseCapture) {
    this.handle.releaseCapture();
  }
  this.dragEnd();
}

Slider.prototype.mouseMove = function(evt) {
  if (!this.dragDown) {
    return;
  }
  evt.preventDefault();
  this.dragMove(evt.pageX, evt.pageY);
};

Slider.prototype.touchEnd = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; i++) {
    if (evt.changedTouches[i].identifier == this.dragId) {
      this.dragEnd();
      break;
    }
  }
};

Slider.prototype.touchCancel = function(evt) {
  evt.preventDefault();
  for (var i = 0; i < evt.changedTouches.length; i++) {
    if (evt.changedTouches[i].identifier == this.dragId) {
      this.dragEnd();
      break;
    }
  }
};

Slider.prototype.update = function() {
  var valueInterval = this.value.maxValue - this.value.minValue;
  var amount = (this.value.getTargetValue() - this.value.minValue) / valueInterval;
  amount *= this.sliderScale;
  if (!this.inverted) {
    amount = 1.0 - amount;
  }
  this.handle.parentElement.style.top = (this.slider.clientHeight - this.handle.parentElement.clientHeight) * amount + "px";
};



function ToggleSlider(value, inverted, sliderId, handleId) {
  Slider.call(this, value, inverted, sliderId, handleId);
  this.sliderScale = 0.40;
}

ToggleSlider.prototype.__proto__ = Slider.prototype;

ToggleSlider.prototype.dragStart = function(pageX, pageY, touchId) {
  this.value.beginEdit();
  this.value.editValue(this.value.getTargetValue() > 0.5 ? 0.0 : 1.0);
  this.value.endEdit();
  this.dsp.checkStart();
}

