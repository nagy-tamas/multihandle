'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (window) {
  /**
   * Rounds number to closest step.
   *
   * @param    {Float} value
   * @param    {Float} step
   * @return   {Float}
   */
  function round(value, step) {
    step || (step = 1.0);
    var inv = 1.0 / step;
    return Math.round(value * inv) / inv;
  }

  /**
   * Trims down the unnecessary decimals
   *
   * @param    {Number} value
   * @param    {Integer} places   Count of the decimal places
   * @return   {Number}           Converted number
   */
  function roundToDecimalPlaces(value, places) {
    var div = Math.pow(10, places);
    return Math.round(value * div) / div;
  }

  /**
   * Safari can't do Object.assign with a DOMStringMap, so we help him out
   *
   * @param    {DOMStringMap} map
   * @return   {Object}
   */
  function domStringMapToObj(map) {
    var obj = {};
    Object.keys(map).forEach(function (key) {
      obj[key] = map[key];
    });
    return obj;
  }

  /**
   * Utility method that returns the normalized clintX property of an event
   *
   * Because touch events !== mouse events
   *
   * @param {Event} evt
   * @return {Float}
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
   * Utility function to create events
   *
   * @param  {String} eventType
   * @return {Event}
   */
  function newEvent(eventType, options) {
    var evt = document.createEvent('HTMLEvents');
    if (typeof Event === 'function') {
      options = options || {
        view: window,
        bubbles: true,
        cancelable: true
      };
      return new Event(eventType, options);
    }

    evt.initEvent(eventType, true, true);
    return evt;
  }

  /**
   * Get nearest parent element matching selector
   *
   * http://stackoverflow.com/a/16430350
   *
   * @param {DOMNode} el Reference to child element
   * @param {String} selector CSS query to match an ancestor to
   */

  function closest(el, selector) {
    var matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;

    while (el) {
      if (matchesSelector.call(el, selector)) {
        break;
      }
      el = el.parentElement;
    }
    return el;
  }

  var MultiHandle = function () {
    /**
     * Creates the main component
     *
     * You can set the options explicitly through the options array, or
     * you can use data-* attributes as well.
     *
     * @param  {DOMNode}   el       Reference to the DOM element
     * @param  {Object}    options
     * @return {undefined}
     */
    function MultiHandle(el) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _classCallCheck(this, MultiHandle);

      this.el = el;

      // removing the "loading" state - show component
      // you can hide the component until it loads if you want, or create a
      // loader animation - it's up to you
      this.el.className = el.className.replace(/multihandle--loading/g, '');

      this.options = this.parseOptions(options);

      // for non-linear, or value/label datasets
      this.dataset = null;

      // are we dragging one of the handlers?
      // very important object - we're gonna store the currently dragging element,
      // the starting coordinates, etc, for properly visualized dragging
      this.dragging = false;

      // the component will be generated in the `container` property
      this.container = this.el.querySelector('.multihandle__component');
      if (!this.container) {
        this.container = this.el;
      }

      // reference to the original input/select elements
      this.inputs = [];

      // reference to their handler representations
      this.handlers = [];

      // the selected interval between two handlers
      this.intervals = [];

      // creating the component
      this.buildComponent();

      // syncing the states of the handlers to the inputs
      this.syncHandlersToInputs();

      // syncing the length of the intervals to the positions of the handlers
      this.syncIntervalsBetweenHandlers();

      // binding events to the component
      this.bindEvents();
    }

    /**
     * Creates the this.options, based on the default and the specified values
     *
     * Plus normalizes some flags/variables
     *
     * @param   {Object} options
     * @return  {Object} The merged, final option object
     */


    _createClass(MultiHandle, [{
      key: 'parseOptions',
      value: function parseOptions(options) {
        // default options, merged to the data attributes, then to the given options
        var opts = Object.assign({
          min: 0,
          max: 100,
          step: 0.5,
          decimalsAccuracy: 2,

          // selector to the dataset element in the domtree
          dataset: false,

          // which graphical elements will be enabled? We only have
          // `snappingpoints` right now
          generateExtraMarkup: '',

          // decorate them as you like
          tplTrack: '<span class="multihandle__track-deco"></span>${handlers}',
          tplHandler: '${label}',
          tplSnappingpoint: '${label}'
        }, domStringMapToObj(this.el.dataset), options);

        opts.generateExtraMarkup = opts.generateExtraMarkup.split(',');

        // re-building the values, if dataset is given
        if (opts.dataset) {
          opts.min = 0;
          opts.step = 1;
        }

        // from the data attibutes it always comes as a string
        if (typeof opts.step === 'string') {
          opts.step = parseFloat(opts.step, 10);
        }

        opts.incLittle = typeof opts.incLittle === 'undefined' ? opts.step : opts.incLittle;

        opts.incBig = typeof opts.incBig === 'undefined' ? opts.step * 10 : opts.incBig;

        // casting values to float
        opts.min = parseFloat(opts.min, 10);
        opts.max = parseFloat(opts.max, 10);
        opts.step = parseFloat(opts.step, 10);

        return opts;
      }

      /**
       * Creates the DOM string of the handlers so we can inject it in the HTML.
       *
       * @return {string} The handlers
       */

    }, {
      key: 'createHandlers',
      value: function createHandlers(inputs) {
        var self = this;
        return inputs.reduce(function (previous, current) {
          return previous + '<a href="javascript:void(0)" class="multihandle__handle">\n          ' + self.options.tplHandler + '\n        </a>';
        }, '');
      }

      /**
       * Creates the dataset from the given select tag
       *
       * @param  {DOMNode}  select
       * @return {Array}
       */

    }, {
      key: 'createDatasetFromSelect',
      value: function createDatasetFromSelect(select) {
        var dataset = [];
        for (var ix = 0; ix <= select.options.length - 1; ix++) {
          dataset.push({
            value: select.options[ix].value,
            label: select.options[ix].text
          });
        }

        return dataset;
      }

      /**
       * Finds the native input elements in the component, and set references to them.
       */

    }, {
      key: 'findInputs',
      value: function findInputs(container) {
        if (this.options.dataset === 'select') {
          return Array.prototype.slice.call(container.querySelectorAll('select'));
        }

        return Array.prototype.slice.call(container.querySelectorAll('input'));
      }

      /**
       * Finding the handlers in the container node.
       *
       * @param  {DOMNode} container
       * @return {undefined}
       */

    }, {
      key: 'findHandlers',
      value: function findHandlers(track) {
        var _this = this;

        var self = this;
        var handlers = [];
        Array.prototype.forEach.call(track.querySelectorAll('.multihandle__handle'), function (el, ix) {
          el.inputReference = _this.inputs[ix];
          handlers.push(el);
        });
        return handlers;
      }

      /**
       * Creates the dataset if needed
       *
       * @return {undefined}
       */

    }, {
      key: 'initDataset',
      value: function initDataset() {
        if (this.options.dataset === 'select') {
          this.dataset = this.createDatasetFromSelect(this.inputs[0]);
          this.options.max = this.inputs[0].options.length - 1;
        }
      }

      /**
       * Creates an interval between two handler (or a handler and an edge).
       *
       * @param      {<type>}  track   The track
       */

    }, {
      key: 'addInterval',
      value: function addInterval(from, to, track, className) {
        var interval = document.createElement('span');
        interval.className = className;
        interval.from = from;
        interval.to = to;

        this.intervals.push(interval);
        track.appendChild(interval);
      }

      /**
       * Creating intervals between the handlers
       *
       * @param  {DOMNode} track       The intervals will be created in this container
       * @return {undefined}
       */

    }, {
      key: 'createIntervals',
      value: function createIntervals(track) {
        // interval between the first handler and the track's left side
        this.addInterval(null, this.handlers[0], track, 'multihandle__interval multihandle__interval--start');

        // let's create them between the current handler, and the next one
        // are we in multihandle mode?
        if (this.handlers.length >= 2) {
          for (var i = 0; i < this.handlers.length - 1; i++) {
            this.addInterval(this.handlers[i], this.handlers[i + 1], track, 'multihandle__interval multihandle__interval--' + i);
          }
        }

        // interval between the last handler and the track's right side
        this.addInterval(this.handlers[this.handlers.length - 1], null, track, 'multihandle__interval multihandle__interval--end');
      }

      /**
       * Creates visible, styleable snapping points
       *
       * @param  {DOMNode} track    The snapping points will be created in this container
       * @return {undefined}
       */

    }, {
      key: 'createSnappingPoints',
      value: function createSnappingPoints(track) {
        var _this2 = this;

        // container div for easier styling (css queries)
        var snaps = document.createElement('div');
        snaps.className = 'multihandle__snappingpoints';
        track.appendChild(snaps);

        this.snappingMap.forEach(function (data, ix) {
          var snap = document.createElement('span');
          var label = void 0;
          snap.className = 'multihandle__snappingpoint';
          snaps.appendChild(snap);

          if (_this2.options.dataset === 'select') {
            label = _this2.dataset[data[0]].label;
          } else {
            label = data[0];
          }

          snap.innerHTML = _this2.options.tplSnappingpoint.replace(/\${label}/, label);
          snap.style.left = data[1] + '%';
        });
      }

      /**
       * A snapping map, so we'll know where to snap the handlers, and which value will be there
       *
       * Format of the elements in the snapping array:
       * [0: value, 1: percent]
       *
       * @return {Array}
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
       * @return {boolean}
       */

    }, {
      key: 'isItSnaps',
      value: function isItSnaps() {
        return this.options.step !== 0;
      }

      /**
       * Sets the handler's position to the given percent value.
       *
       * It validates the percentage first, and also updates the label, and the
       * interval between multiple handlers (if there's any).
       *
       * @param {DOMNode} handler
       * @param {Float} percent
       */

    }, {
      key: 'setHandlerPos',
      value: function setHandlerPos(handler, percent) {
        var value = this.percentToValue(percent);
        this.setHandlerLeft(handler, percent);
        this.updateHandlerLabel(handler, value);
        this.syncIntervalsBetweenHandlers();
      }

      /**
       * Sets a handler's left position without any checking.
       *
       * @param  {DOMNOde}  handler
       * @param  {Float}    percent
       */

    }, {
      key: 'setHandlerLeft',
      value: function setHandlerLeft(handler, percent) {
        // would be better, but it won't work properly - ther percentage in this
        // case is relative to the element's size instead of the parent's size
        // handler.style.transform = `translate3d(${percent}%, 0, 0)`;

        handler.style.left = percent + '%';
      }

      /**
       * Update a handler's label by a value (could be a real value, or a dataset index)
       *
       * @param  {DOMNode} handler
       * @param  {Float} value
       * @return {undefined}
       */

    }, {
      key: 'updateHandlerLabel',
      value: function updateHandlerLabel(handler, value) {
        var label = void 0;

        if (this.options.dataset === 'select') {
          label = this.dataset[value].label;
        } else {
          label = value;
        }

        handler.innerHTML = this.options.tplHandler.replace(/\${label}/, label);
      }

      /**
       * Creating the track and the handlers
       *
       * @return undefined
       */

    }, {
      key: 'buildComponent',
      value: function buildComponent() {
        // creating the track element
        this.track = document.createElement('div');
        this.track.className = 'multihandle__track';
        this.container.appendChild(this.track);

        // find all the inputs elements
        this.inputs = this.findInputs(this.el);

        if (this.options.dataset) {
          this.initDataset();
        }

        this.track.innerHTML = this.options.tplTrack.replace(/\${handlers}/, this.createHandlers(this.inputs));
        this.handlers = this.findHandlers(this.track);

        this.createIntervals(this.track);

        if (this.isItSnaps()) {
          this.snappingMap = this.createSnappingMap();

          if (this.options.generateExtraMarkup.indexOf('snappingpoints') > -1) {
            this.createSnappingPoints(this.track);
          }
        }

        // putting the whole component in the container
        this.container.appendChild(this.track);
      }

      /**
       * Adding eventlisteners
       *
       * @return {undefined}
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
        this.el.addEventListener('inputUpdated', function (evt) {
          return _this3.syncHandlersToInputs();
        });

        this.handlers.forEach(function (handle) {
          handle.addEventListener('keydown', function (evt) {
            return _this3.onHandlerKeyDown(evt);
          });
          // stops link dragging - won't work with addEventListener!
          handle.ondragstart = function (evt) {
            return false;
          };
        });
      }

      /**
       * This could be a start for dragging one of the handlers
       *
       * @param  {Event} evt
       * @return {undefined}
       */

    }, {
      key: 'onMouseDown',
      value: function onMouseDown(evt) {
        // if click triggered somewhere in our component, not on one of the handlers...
        var found = this.handlers.indexOf(evt.target);
        if (found < 0) {
          var parent = closest(evt.target, '.multihandle__track');
          if (parent) {
            this.jumpToPx(this.handlers[0], getClientX(evt) - this.track.offsetLeft);
          }
          return;
        }

        this.dragging = {
          handlerIx: found,
          handler: this.handlers[found],
          startLeft: this.handlers[found].offsetLeft,
          startX: getClientX(evt)
        };

        this.dragging.handler.classList.add('multihandle__handle--active');
      }

      /**
       * Dragging stopped
       *
       * @return {undefined}
       */

    }, {
      key: 'onMouseUp',
      value: function onMouseUp(evt) {
        if (this.dragging) {
          this.dragging.handler.classList.remove('multihandle__handle--active');
          this.dragging.handler.inputReference.dispatchEvent(newEvent('inputend'));
        }

        this.dragging = false;
      }

      /**
       * Moving one of the handlers, if it's in dragging state
       *
       * @param  {Event} evt
       * @return {undefined}
       */

    }, {
      key: 'onMouseMove',
      value: function onMouseMove(evt) {
        if (this.dragging && this.dragging.handlerIx > -1) {
          var newLeftPx = getClientX(evt) - this.track.offsetLeft;
          var percent = this.normalizePercent(this.pixelToPercent(newLeftPx));

          this.setValueByPercent(this.dragging.handler, percent);
        }
      }

      /**
       * Sets a handler's value directly
       *
       * @param {DOMNode} handler
       * @param {Float} value
       * @return
       *
       */

    }, {
      key: 'setValue',
      value: function setValue(handler, value) {
        value = this.normalizeValue(value);
        var percent = this.valueToPercent(value);

        if (this.options.dataset === 'select') {
          handler.inputReference.options.selectedIndex = value;
        } else {
          handler.inputReference.value = value;
        }

        handler.inputReference.dispatchEvent(newEvent('input'));
        this.setHandlerPos(handler, percent);
      }

      /**
       * Sets a handler's value as percent plus updates the related input
       *
       * @param {DOMNode} handler
       * @param {Float} percent
       */

    }, {
      key: 'setValueByPercent',
      value: function setValueByPercent(handler, percent) {
        var value = this.percentToValue(percent);
        this.setValue(handler, value);
      }

      /**
       * Handling the keystrokes
       *
       * @param {Event} evt
       */

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
      key: 'incDec',
      value: function incDec(handler, offset) {
        this.setValue(handler, parseFloat(handler.inputReference.value, 10) + offset);
        handler.inputReference.dispatchEvent(newEvent('inputend'));
      }
    }, {
      key: 'incByLittle',
      value: function incByLittle(handler) {
        this.incDec(handler, this.options.incLittle);
      }
    }, {
      key: 'descByLittle',
      value: function descByLittle(handler) {
        this.incDec(handler, -this.options.incLittle);
      }
    }, {
      key: 'incByBig',
      value: function incByBig(handler) {
        this.incDec(handler, this.options.incBig);
      }
    }, {
      key: 'descByBig',
      value: function descByBig(handler) {
        this.incDec(handler, -this.options.incBig);
      }
    }, {
      key: 'jumpToPx',
      value: function jumpToPx(handler, px) {
        var percent = this.normalizePercent(this.pixelToPercent(px));
        this.setValueByPercent(handler, percent);
      }

      /**
       * Update the handlers to reflect the inputs' state
       *
       * @return {undefined}
       */

    }, {
      key: 'syncHandlersToInputs',
      value: function syncHandlersToInputs() {
        var _this4 = this;

        if (this.options.dataset === 'select') {
          var ix = this.inputs[0].options.selectedIndex;
          var percent = this.valueToPercent(ix);
          this.setHandlerPos(this.handlers[0], percent);
        } else {
          (function () {
            var self = _this4;
            self.handlers.forEach(function (el) {
              var value = parseFloat(el.inputReference.value, 10);
              var percent = self.valueToPercent(value);
              self.setHandlerPos(el, percent);
            });
          })();
        }
      }

      /**
       * Updating the intervals between the handlers for proper sizing
       *
       * @return {undefined}
       */

    }, {
      key: 'syncIntervalsBetweenHandlers',
      value: function syncIntervalsBetweenHandlers() {
        this.intervals.forEach(function (interval) {
          var fromPos = interval.from ? parseFloat(interval.from.style.left, 10) : 0;
          var toPos = interval.to ? parseFloat(interval.to.style.left, 10) : 100;

          var left = Math.min(toPos, fromPos);
          var width = Math.abs(toPos - fromPos);

          interval.style.left = left + '%';
          interval.style.width = width + '%';
        });
      }

      /**
       * Transforms an input value with a min/max threshold to a percent value
       *
       * @param  {Float} val
       * @return {Float} percentage
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
       * @param  {Float} px
       * @return {Float} percent
       */

    }, {
      key: 'pixelToPercent',
      value: function pixelToPercent(px) {
        var full = this.track.clientWidth;
        return px / full * 100;
      }

      /**
       * Gives back the percent's numeric representation on the min-max scale
       *
       * @param  {[type]} percent [description]
       * @return {[type]}         [description]
       */

    }, {
      key: 'percentToOffset',
      value: function percentToOffset(percent) {
        var scale = this.options.max - this.options.min;
        // before rounding to options.step
        var rawValue = percent / (100 / scale);
        return rawValue;
      }

      /**
       * Gives back the value, based on the current handler position
       *
       * @param  {Float} percent
       * @return {Float} value
       */

    }, {
      key: 'percentToValue',
      value: function percentToValue(percent) {
        // before rounding to options.step
        var rawValue = this.percentToOffset(percent) + this.options.min;
        var rounded = round(rawValue, this.options.step);

        return rounded;
      }

      /**
       * Converts percent to value, while keeping mind the min/max/step values
       *
       * @param {Float} percent
       */

    }, {
      key: 'normalizePercent',
      value: function normalizePercent(percent) {
        // limit the percentage between 0 and 100
        percent = Math.max(0, percent);
        percent = Math.min(100, percent);

        // then convert it to a valid value, then back to percent
        return this.valueToPercent(this.percentToValue(percent));
      }

      /**
       * Squeezes the given value between the min and max limits
       *
       * @param {Float} value
       */

    }, {
      key: 'normalizeValue',
      value: function normalizeValue(value) {
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
   * @param  {Array}     els   Node list of DOM elements
   * @return {undefined}
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
  window.Multihandle = MultiHandle;
  window.multihandle = {
    init: init
  };
})(window);
//# sourceMappingURL=multihandle.js.map
