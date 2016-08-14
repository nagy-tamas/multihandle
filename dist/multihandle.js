'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function (window) {
  var MultiHandle = function () {
    function MultiHandle(el) {
      _classCallCheck(this, MultiHandle);

      this.el = el;
      this.el.className = el.className.replace(/multihandle--loading/g, '');
      this.bindEvents();
    }

    _createClass(MultiHandle, [{
      key: 'bindEvents',
      value: function bindEvents() {
        this.el.addEventListener('click', this.onMouseDown);
      }
    }, {
      key: 'onMouseDown',
      value: function onMouseDown() {
        console.log('mouse down!');
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
