'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (window) {
  var debug = true;

  var MultiHandle = function () {
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
        step: 1,
        tpl: {
          track: '${handlers}', // must have a single root element!
          handler: '${value}' // must have a single root element!
        }
      }, this.el.dataset, options);

      // normalize values
      this.options.min = parseFloat(this.options.min, 10);
      this.options.max = parseFloat(this.options.max, 10);
      this.options.step = parseFloat(this.options.step, 10);

      // are we dragging something?
      this.dragging = false;

      // reference to the original handlers, converted to an array
      this.handlers = Array.prototype.slice.call(this.el.querySelectorAll('input[type=range]'));
      this.handlerEls = [];

      // creating the component
      this.buildDOM();
      this.updateHandlers();

      // binding events to the component
      this.bindEvents();
    }

    /**
     * Creating DOM strings for the handlers
     */


    _createClass(MultiHandle, [{
      key: 'createHandlers',
      value: function createHandlers() {
        var self = this;
        return this.handlers.reduce(function (previous, current) {
          return previous + '<div class="multihandle__handle" data-for="' + current.name + '">\n          ' + self.options.tpl.handler + '\n        </div>';
        }, '');
      }

      /**
       * Finding the handlers in the existing DOM
       */

    }, {
      key: 'findHandlers',
      value: function findHandlers(container) {
        var self = this;
        container.querySelectorAll('.multihandle__handle').forEach(function (el) {
          el.inputReference = self.el.querySelector('input[name=' + el.dataset.for + ']');
          self.handlerEls.push(el);
        });
      }

      /**
       * Update the handlers to reflect the inputs' state
       */

    }, {
      key: 'updateHandlers',
      value: function updateHandlers() {
        var self = this;
        self.handlerEls.forEach(function (el) {
          // console.log(self.valueToPercent(parseFloat(el.inputReference.value, 10));
          var value = parseFloat(el.inputReference.value, 10);
          var percent = self.valueToPercent(value);
          el.style.left = percent + '%';
          el.innerHTML = el.innerHTML.replace(/\${value}/, value);
        });
      }
    }, {
      key: 'valueToPercent',
      value: function valueToPercent(val) {
        var scale = this.options.max - this.options.min;
        return val / scale * 100;
      }

      /**
       * Creating the track and the handlers
       */

    }, {
      key: 'buildDOM',
      value: function buildDOM() {
        // creating the track element
        var track = document.createElement('div');
        track.className = 'multihandle__track';
        track.innerHTML = this.options.tpl.track;
        this.el.appendChild(track);

        // putting the handlers on the track
        track.innerHTML = track.innerHTML.replace(/\${handlers}/, this.createHandlers());
        this.findHandlers(track);

        // putting the whole component in the container
        this.el.appendChild(track);
      }

      /**
       * Adding eventlisteners
       */

    }, {
      key: 'bindEvents',
      value: function bindEvents() {
        var _this = this;

        this.el.addEventListener('mousedown', function (evt) {
          return _this.onMouseDown(evt);
        });
        document.body.addEventListener('mouseup', function (evt) {
          return _this.onMouseUp(evt);
        });
        document.body.addEventListener('mousemove', function (evt) {
          return _this.onMouseMove(evt);
        });
      }

      /**
       * We may start dragging one of the handlers
       */

    }, {
      key: 'onMouseDown',
      value: function onMouseDown(evt) {
        debug && console.log('MultiHandle:onMouseDown', evt);
        var found = this.handlerEls.indexOf(evt.target);
        // click triggered on the track, not on one of the handlers
        if (found < 0) {
          return false;
        }

        this.dragging = {
          handlerIx: found,
          handler: this.handlerEls[found],
          startX: evt.clientX
        };
        return true;
      }

      /**
       * Dragging stopped
       */

    }, {
      key: 'onMouseUp',
      value: function onMouseUp() {
        debug && console.log('MultiHandle:onMouseUp');
        this.dragging = false;
      }
    }, {
      key: 'onMouseMove',
      value: function onMouseMove(evt) {
        debug && console.log('MultiHandle:onMouseMove');
        console.log();
        if (this.dragging && this.dragging.handlerIx > -1) {
          var newLeft = evt.clientX;
          console.log(this.dragging.startX, evt.clientX);
          this.dragging.handler.style.left = newLeft + 'px';
        }
      }
    }]);

    return MultiHandle;
  }();

  var init = function init(els) {
    els.forEach(function (el) {
      return new MultiHandle(el);
    });
  };

  window.multihandle = {
    init: init
  };
})(window);
//# sourceMappingURL=multihandle.js.map
