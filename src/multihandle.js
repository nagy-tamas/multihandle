((window) => {
  const debug = true;

  class MultiHandle {
    constructor(el, options = {}) {
      this.el = el;

      // removing the "loading" state - show component
      this.el.className = el.className.replace(/multihandle--loading/g, '');

      // default options
      this.options = Object.assign({
        min: 0,
        max: 100,
        step: 1,
        tpl: {
          track: '${handlers}',          // must have a single root element!
          handler: '${value}'            // must have a single root element!
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
    createHandlers() {
      const self = this;
      return this.handlers.reduce((previous, current) => (
        `${previous}<div class="multihandle__handle" data-for="${current.name}">
          ${self.options.tpl.handler}
        </div>`), ''
      );
    }

    /**
     * Finding the handlers in the existing DOM
     */
    findHandlers(container) {
      const self = this;
      container.querySelectorAll('.multihandle__handle').forEach((el) => {
        el.inputReference = self.el.querySelector(`input[name=${el.dataset.for}]`);
        self.handlerEls.push(el);
      });
    }

    /**
     * Update the handlers to reflect the inputs' state
     */
    updateHandlers() {
      const self = this;
      self.handlerEls.forEach((el) => {
        // console.log(self.valueToPercent(parseFloat(el.inputReference.value, 10));
        const value = parseFloat(el.inputReference.value, 10);
        const percent = self.valueToPercent(value);
        el.style.left = `${percent}%`;
        el.innerHTML = el.innerHTML.replace(/\${value}/, value);
      });
    }

    valueToPercent(val) {
      const scale = this.options.max - this.options.min;
      return (val / scale) * 100;
    }

    /**
     * Creating the track and the handlers
     */
    buildDOM() {
      // creating the track element
      const track = document.createElement('div');
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
    bindEvents() {
      this.el.addEventListener('mousedown', evt => this.onMouseDown(evt));
      document.body.addEventListener('mouseup', evt => this.onMouseUp(evt));
      document.body.addEventListener('mousemove', evt => this.onMouseMove(evt));
    }

    /**
     * We may start dragging one of the handlers
     */
    onMouseDown(evt) {
      debug && console.log('MultiHandle:onMouseDown', evt);
      const found = this.handlerEls.indexOf(evt.target);
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
    onMouseUp() {
      debug && console.log('MultiHandle:onMouseUp');
      this.dragging = false;
    }

    onMouseMove(evt) {
      debug && console.log('MultiHandle:onMouseMove');
      console.log();
      if (this.dragging && this.dragging.handlerIx > -1) {
        const newLeft = evt.clientX;
        console.log(this.dragging.startX, evt.clientX);
        this.dragging.handler.style.left = `${newLeft}px`;
      }
    }
  }

  const init = (els) => {
    els.forEach((el) => {
      return new MultiHandle(el);
    });
  };


  window.multihandle = {
    init
  };
})(window);
