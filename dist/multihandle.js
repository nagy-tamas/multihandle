'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (window) {
  /**
   * Round number to step
   * @param  float value
   * @param  float step
   * @return float
   */
  function round(value, step) {
    step || (step = 1.0);
    var inv = 1.0 / step;
    return Math.round(value * inv) / inv;
  }

  function roundToDecimalPlaces(value, places) {
    var div = Math.pow(10, places);
    return Math.round(value * div) / div;
  }

  /**
   * Because safari needs it for the Object.assign
   *
   * @param      DOMStringMap map
   */
  function domStringMapToObj(map) {
    var obj = {};
    Object.keys(map).forEach(function (key) {
      obj[key] = map[key];
    });
    return obj;
  }

  /**
   * utility method that returns the normalized clintX property of an event
   *
   * @param Event evt
   * @return Float
   */
  function getClientX(evt) {
    if (typeof evt.clientX !== 'undefined') {
      return evt.clientX;
    }

    if (evt.touches[0]) {
      return evt.touches[0].clientX;
    }

    return undefined;
  }

  /**
   * utility function to create events
   *
   * @param String type
   * @return Event
   */
  function newEvent(type, options) {
    var evt = document.createEvent('HTMLEvents');
    if (typeof Event === 'function') {
      options = options || {
        view: window,
        bubbles: true,
        cancelable: true
      };
      return new Event(type, options);
    }
    evt.initEvent(type, true, true);
    return evt;
  }

  var MultiHandle = function () {
    /**
     * Creates the component
     *
     * You can set the options explicitly through the options array, or
     * you can use data-* attributes as well.
     *
     * @param  DOMNode el       Reference of the DOM element
     * @param  Object options
     * @return undefined
     */
    function MultiHandle(el) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _classCallCheck(this, MultiHandle);

      this.el = el;

      // removing the "loading" state - show component
      this.el.className = el.className.replace(/multihandle--loading/g, '');

      // default options
      this.options = Object.assign({
        min: 0,
        max: 100,
        step: 0.5,
        decimalsAccuracy: 2,
        gfx: '',
        tpl: {
          track: '${handlers}',
          handler: '${value}',
          snappingpoint: '${value}'
        }
      }, domStringMapToObj(this.el.dataset), options);

      this.options.gfx = this.options.gfx.split(',');

      if (typeof this.options.step === 'string') {
        this.options.step = parseFloat(this.options.step, 10);
      }

      this.options.incLittle = typeof this.options.incLittle === 'undefined' ? this.options.step : this.options.incLittle;

      this.options.incBig = typeof this.options.incBig === 'undefined' ? this.options.step * 10 : this.options.incBig;

      // normalize values
      this.options.min = parseFloat(this.options.min, 10);
      this.options.max = parseFloat(this.options.max, 10);
      this.options.step = parseFloat(this.options.step, 10);

      // are we dragging something?
      this.dragging = false;

      // the component will be generated here
      this.container = this.el.querySelector('.multihandle__component');
      if (!this.container) {
        this.container = this.el;
      }

      // reference to the original handlers, converted to an array
      this.handlers = Array.prototype.slice.call(this.el.querySelectorAll('input'));
      this.handlerEls = [];
      this.lines = [];

      // creating the component
      this.buildComponent();
      this.syncHandlersToInputs();
      this.syncLinesBetweenHandlers();

      // binding events to the component
      this.bindEvents();
    }

    /**
     * Creates the DOM string of the handlers we can inject in the HTML.
     *
     * @return string The handlers
     */


    _createClass(MultiHandle, [{
      key: 'createHandlers',
      value: function createHandlers() {
        var self = this;
        return this.handlers.reduce(function (previous, current) {
          return previous + '<a href="javascript:void(0)" class="multihandle__handle">\n          ' + self.options.tpl.handler + '\n        </a>';
        }, '');
      }

      /**
       * Finding the handlers in the container node.
       *
       * @param  DOMNode container
       * @return undefined
       */

    }, {
      key: 'findHandlers',
      value: function findHandlers(track) {
        var _this = this;

        var self = this;
        Array.prototype.forEach.call(track.querySelectorAll('.multihandle__handle'), function (el, ix) {
          el.inputReference = _this.handlers[ix];
          self.handlerEls.push(el);
        });
      }

      /**
       * Creating lines between the handlers
       *
       * @return string The lines
       */

    }, {
      key: 'createLines',
      value: function createLines(track) {
        if (this.handlerEls.length < 2) {
          return;
        }

        // let's create a between the current handler, and the next one
        for (var i = 0; i < this.handlerEls.length - 1; i++) {
          var line = document.createElement('span');
          line.className = 'multihandle__line multihandle__line--' + i;
          line.lineFrom = this.handlerEls[i];
          line.lineTo = this.handlerEls[i + 1];

          this.lines.push(line);
          track.appendChild(line);
        }
      }

      /**
       * Creates visible, styleable snapping points
       *
       * @return undefined
       */

    }, {
      key: 'createSnappingPoints',
      value: function createSnappingPoints(track) {
        var _this2 = this;

        this.snappingMap.forEach(function (data, ix) {
          var snap = document.createElement('span');
          snap.className = 'multihandle__snappingpoint';
          track.appendChild(snap);
          snap.innerHTML = _this2.options.tpl.snappingpoint.replace(/\${value}/, data[0]);
          snap.style.left = data[1] + '%';
        });
      }

      /**
       * Creates a snapping map.
       *
       * @return array
       */

    }, {
      key: 'createSnappingMap',
      value: function createSnappingMap() {
        var valLength = Math.abs(this.options.max - this.options.min);
        var steps = valLength / this.options.step;
        var snaps = [];

        for (var ix = 0; ix <= steps; ix++) {
          // avoiding floating point math "bugs"
          var currVal = roundToDecimalPlaces(ix * this.options.step, 6);
          // first number: value, second: percent (for display purposes)
          snaps.push([this.options.min + currVal, roundToDecimalPlaces(currVal / valLength * 100, 2)]);
        }

        return snaps;
      }

      /**
       * Is snapping enabled or not?
       *
       * @return boolean
       */

    }, {
      key: 'isItSnaps',
      value: function isItSnaps() {
        return this.options.step !== 0;
      }

      /**
       * Sets the handler left position to the given percent value
       *
       * @param Object handler
       * @param Float percent
       */

    }, {
      key: 'setHandlerPos',
      value: function setHandlerPos(handler, percent) {
        var value = this.percentToValue(percent);
        handler.style.left = percent + '%';
        handler.innerHTML = this.options.tpl.handler.replace(/\${value}/, value);
        this.syncLinesBetweenHandlers();
      }

      /**
       * Creating the range track and the handlers
       *
       * @return undefined
       */

    }, {
      key: 'buildComponent',
      value: function buildComponent() {
        // creating the track element
        var track = document.createElement('div');
        track.className = 'multihandle__track';
        this.container.appendChild(track);

        // putting the handlers on the track
        track.innerHTML = this.options.tpl.track.replace(/\${handlers}/, this.createHandlers());
        this.findHandlers(track);

        this.createLines(track);

        if (this.isItSnaps()) {
          this.snappingMap = this.createSnappingMap();

          if (this.options.gfx.indexOf('snappingpoints') > -1) {
            this.createSnappingPoints(track);
          }
        }

        // putting the whole component in the container
        this.container.appendChild(track);
      }

      /**
       * Adding eventlisteners
       *
       * @return undefined
       */

    }, {
      key: 'bindEvents',
      value: function bindEvents() {
        var _this3 = this;

        this.container.addEventListener('mousedown', function (evt) {
          return _this3.onMouseDown(evt);
        });
        this.container.addEventListener('touchstart', function (evt) {
          return _this3.onMouseDown(evt);
        });
        document.body.addEventListener('mouseup', function (evt) {
          return _this3.onMouseUp(evt);
        });
        document.body.addEventListener('touchend', function (evt) {
          return _this3.onMouseUp(evt);
        });
        document.body.addEventListener('touchcancel', function (evt) {
          return _this3.onMouseUp(evt);
        });
        document.body.addEventListener('mousemove', function (evt) {
          return _this3.onMouseMove(evt);
        });
        document.body.addEventListener('touchmove', function (evt) {
          return _this3.onMouseMove(evt);
        });

        this.handlerEls.forEach(function (handle) {
          handle.addEventListener('keydown', function (evt) {
            return _this3.onHandlerKeyDown(evt);
          });
        });
      }

      /**
       * We may start dragging one of the handlers
       *
       * @param  Event evt
       * @return undefined
       */

    }, {
      key: 'onMouseDown',
      value: function onMouseDown(evt) {
        var found = this.handlerEls.indexOf(evt.target);
        // click triggered on the track, not on one of the handlers
        if (found < 0) {
          return;
        }

        this.dragging = {
          handlerIx: found,
          handler: this.handlerEls[found],
          startLeft: this.handlerEls[found].offsetLeft,
          startX: getClientX(evt)
        };

        this.dragging.handler.classList.add('multihandle__handle--active');
        document.body.classList.add('multihandle-disable-drag');
      }

      /**
       * Dragging stopped
       *
       * @return undefined
       */

    }, {
      key: 'onMouseUp',
      value: function onMouseUp(evt) {
        if (this.dragging) {
          this.dragging.handler.classList.remove('multihandle__handle--active');
        }

        this.dragging = false;
        document.body.classList.remove('multihandle-disable-drag');
      }

      /**
       * Moving one of the handlers, if it's in dragging state
       *
       * @param  Event evt
       * @return undefined
       */

    }, {
      key: 'onMouseMove',
      value: function onMouseMove(evt) {
        if (this.dragging && this.dragging.handlerIx > -1) {
          var newLeftPx = this.dragging.startLeft - (this.dragging.startX - getClientX(evt));
          var percent = this.normalizePercent(this.pixelToPercent(newLeftPx));

          this.setPercentValue(this.dragging.handler, percent);
        }
      }

      /**
       * Sets a handler's value
       *
       * @param Object handler
       * @param Float value
       * @return
       *
       */

    }, {
      key: 'setHandlerValue',
      value: function setHandlerValue(handler, value) {
        value = this.normalizeValue(value);
        var percent = this.valueToPercent(value);
        handler.inputReference.value = value;
        handler.inputReference.dispatchEvent(newEvent('input'));
        this.setHandlerPos(handler, percent);
      }

      /**
       * Sets a handler's value as percent plus updates the related input
       *
       * Object handler
       * Float percent
       */

    }, {
      key: 'setPercentValue',
      value: function setPercentValue(handler, percent) {
        var value = this.percentToValue(percent);
        this.setHandlerValue(handler, value);
      }
    }, {
      key: 'onHandlerKeyDown',
      value: function onHandlerKeyDown(evt) {
        switch (evt.keyCode) {
          case 38:
            // up
            this.incByBig(evt.target);
            evt.preventDefault();
            break;
          case 40:
            // down
            this.descByBig(evt.target);
            evt.preventDefault();
            break;
          case 39:
            // right
            this.incByLittle(evt.target);
            evt.preventDefault();
            break;
          case 37:
            // left
            this.descByLittle(evt.target);
            evt.preventDefault();
            break;
          default:
        }
      }
    }, {
      key: 'incByLittle',
      value: function incByLittle(handler) {
        this.setHandlerValue(handler, parseFloat(handler.inputReference.value, 10) + this.options.incLittle);
      }
    }, {
      key: 'descByLittle',
      value: function descByLittle(handler) {
        this.setHandlerValue(handler, parseFloat(handler.inputReference.value, 10) - this.options.incLittle);
      }
    }, {
      key: 'incByBig',
      value: function incByBig(handler) {
        this.setHandlerValue(handler, parseFloat(handler.inputReference.value, 10) + this.options.incBig);
      }
    }, {
      key: 'descByBig',
      value: function descByBig(handler) {
        this.setHandlerValue(handler, parseFloat(handler.inputReference.value, 10) - this.options.incBig);
      }

      /**
       * Update the handlers to reflect the inputs' state
       *
       * @return undefined
       */

    }, {
      key: 'syncHandlersToInputs',
      value: function syncHandlersToInputs() {
        var self = this;
        self.handlerEls.forEach(function (el) {
          var value = parseFloat(el.inputReference.value, 10);
          var percent = self.valueToPercent(value);
          el.style.left = percent + '%';
          el.innerHTML = el.innerHTML.replace(/\${value}/, value);
        });
      }

      /**
       * Update the values of the input fields
       *
       * @return undefined
       */

    }, {
      key: 'syncInputsToHandlers',
      value: function syncInputsToHandlers() {
        var self = this;

        this.handlerEls.forEach(function (handler) {
          var input = handler.inputReference;
          input.value = self.percentToValue(parseFloat(handler.style.left, 10));
        });
      }

      /**
       * Updating the lines between the handlers for proper sizing
       *
       * @return undefined
       */

    }, {
      key: 'syncLinesBetweenHandlers',
      value: function syncLinesBetweenHandlers() {
        if (this.handlerEls.length < 2) {
          return;
        }

        this.lines.forEach(function (line) {
          var handler1 = parseFloat(line.lineTo.style.left, 10);
          var handler2 = parseFloat(line.lineFrom.style.left, 10);
          var left = Math.min(handler1, handler2);
          var width = Math.abs(handler1 - handler2);

          line.style.left = left + '%';
          line.style.width = width + '%';
        });
      }

      /**
       * Transforms an input value with a min/max threshold to a percent value
       *
       * @param  float val
       * @return float percentage
       */

    }, {
      key: 'valueToPercent',
      value: function valueToPercent(val) {
        var scale = this.options.max - this.options.min;
        return 100 / scale * (val - this.options.min);
      }

      /**
       * Comes handy when the user drags the element, and all we have is the left coordinate
       *
       * @param  float px
       * @return float percent
       */

    }, {
      key: 'pixelToPercent',
      value: function pixelToPercent(px) {
        var full = this.container.scrollWidth;
        return px / full * 100;
      }

      /**
       * Gives back the value based on the current handler position
       *
       * @param  float percent
       * @return float value
       */

    }, {
      key: 'percentToValue',
      value: function percentToValue(percent) {
        var scale = this.options.max - this.options.min;
        // before rounding to options.step
        var rawValue = percent / (100 / scale) + this.options.min;
        var rounded = round(rawValue, this.options.step);

        return rounded;
      }

      /**
       * Squeezes the percent value between 0 and 100
       *
       * @param Float percent
       */

    }, {
      key: 'normalizePercent',
      value: function normalizePercent(percent) {
        // limit the percentage between 0 and 100
        percent = Math.max(0, percent);
        percent = Math.min(100, percent);

        // converts percent to value, keeping mind the min/max value limits
        // then convert it back to percent
        return this.valueToPercent(this.percentToValue(percent));
      }

      /**
       * Squeezes the value between the min and max limits
       *
       * @param Float value
       */

    }, {
      key: 'normalizeValue',
      value: function normalizeValue(value) {
        // limit the percentage between 0 and 100
        value = Math.max(this.options.min, value);
        value = Math.min(this.options.max, value);
        value = roundToDecimalPlaces(value, this.options.decimalsAccuracy);
        return value;
      }
    }]);

    return MultiHandle;
  }();

  /**
   * Create multihandler components from the given array of DOMNodes
   *
   * @param  Array els    Node list of DOM elements
   * @return undefined
   */


  var init = function init(els) {
    // querySelectorAll -> Array
    if (els instanceof NodeList) {
      els = Array.prototype.slice.call(els);
    }

    // single element -> [element]  (so we can forEach it)
    if (!(els instanceof Array)) {
      els = [els];
    }

    els.forEach(function (el) {
      return new MultiHandle(el);
    });
  };

  /**
   * Exported API in the window namespace
   */
  window.multihandle = MultiHandle;
  window.multihandle = {
    init: init
  };
})(window);
//# sourceMappingURL=multihandle.js.map
