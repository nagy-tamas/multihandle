((window) => {
  /**
   * Round number to step
   * @param  float value
   * @param  float step
   * @return float
   */
  function round(value, step) {
    step || (step = 1.0);
    const inv = 1.0 / step;
    return Math.round(value * inv) / inv;
  }

  class MultiHandle {
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
          track: '${handlers}',
          handler: '${value}'
        }
      }, this.el.dataset, options);

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
      this.updateHandlers();
      this.updateLines();

      // binding events to the component
      this.bindEvents();
    }

    /**
     * Creates the DOM string of the handlers we can inject in the HTML.
     *
     * @return string The handlers
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
     * Finding the handlers in the container node.
     *
     * @param  DOMNode container
     * @return undefined
     */
    findHandlers(track) {
      const self = this;
      track.querySelectorAll('.multihandle__handle').forEach((el) => {
        el.inputReference = self.el.querySelector(`input[name=${el.dataset.for}]`);
        self.handlerEls.push(el);
      });
    }

    /**
     * Update the handlers to reflect the inputs' state
     *
     * @return undefined
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

    /**
     * Creating lines between the handlers
     *
     * @return string The lines
     */
    createLines(track) {
      if (this.handlerEls.length < 2) {
        return;
      }

      // let's create a between the current handler, and the next one
      for (let i = 0; i < this.handlerEls.length - 1; i++) {
        const line = document.createElement('span');
        line.className = `multihandle__line multihandle__line--${i}`;
        line.lineFrom = this.handlerEls[i];
        line.lineTo = this.handlerEls[i + 1];

        this.lines.push(line);
        track.appendChild(line);
      }
    }

    /**
     * Updating the lines between the handlers for proper sizing
     *
     * @return undefined
     */
    updateLines() {
      if (this.handlerEls.length < 2) {
        return;
      }

      this.lines.forEach((line) => {
        const handler1 = parseFloat(line.lineTo.style.left, 10);
        const handler2 = parseFloat(line.lineFrom.style.left, 10);
        const left = Math.min(handler1, handler2);
        const width = Math.abs(handler1 - handler2);

        line.style.left = `${left}%`;
        line.style.width = `${width}%`;
      });
    }

    /**
     * Creating the range track and the handlers
     *
     * @return undefined
     */
    buildComponent() {
      // creating the track element
      const track = document.createElement('div');
      track.className = 'multihandle__track';
      this.container.appendChild(track);

      // putting the handlers on the track
      track.innerHTML = this.options.tpl.track.replace(/\${handlers}/, this.createHandlers());
      this.findHandlers(track);

      this.createLines(track);

      // putting the whole component in the container
      this.container.appendChild(track);
    }

    /**
     * Adding eventlisteners
     *
     * @return undefined
     */
    bindEvents() {
      this.container.addEventListener('mousedown', evt => this.onMouseDown(evt));
      this.container.addEventListener('touchstart', evt => this.onMouseDown(evt));
      document.body.addEventListener('mouseup', evt => this.onMouseUp(evt));
      document.body.addEventListener('touchend', evt => this.onMouseUp(evt));
      document.body.addEventListener('touchcancel', evt => this.onMouseUp(evt));
      document.body.addEventListener('mousemove', evt => this.onMouseMove(evt));
      document.body.addEventListener('touchmove', evt => this.onMouseMove(evt));
      document.body.addEventListener('dragstart', () => (false));
    }

    /**
     * utility method that returns the normalized clintX property of an event
     *
     * @param Event evt
     * @return Float
     */
    getClientX(evt) {
      if (typeof evt.clientX !== 'undefined') {
        return evt.clientX;
      }

      if (evt.touches[0]) {
        return evt.touches[0].clientX;
      }

      return undefined;
    }

    /**
     * We may start dragging one of the handlers
     *
     * @param  Event evt
     * @return undefined
     */
    onMouseDown(evt) {
      const found = this.handlerEls.indexOf(evt.target);
      // click triggered on the track, not on one of the handlers
      if (found < 0) {
        return;
      }

      this.dragging = {
        handlerIx: found,
        handler: this.handlerEls[found],
        startLeft: this.handlerEls[found].offsetLeft,
        startX: this.getClientX(evt)
      };

      console.log(evt, this.dragging);
    }

    /**
     * Dragging stopped
     *
     * @return undefined
     */
    onMouseUp() {
      this.dragging = false;
    }

    /**
     * Moving one of the handlers, if it's in dragging state
     *
     * @param  Event evt
     * @return undefined
     */
    onMouseMove(evt) {
      if (this.dragging && this.dragging.handlerIx > -1) {
        const newLeft = this.dragging.startLeft - (this.dragging.startX - this.getClientX(evt));
        const percent = this.normalizePercent(this.pxToPercent(newLeft));
        const value = this.percentToValue(percent);

        this.dragging.handler.style.left = `${percent}%`;
        this.dragging.handler.innerHTML = this.options.tpl.handler.replace(/\${value}/, value);
        this.updateInputs();
        this.updateLines();
      }
    }

    /**
     * Update the values of the input fields
     *
     * @return undefined
     */
    updateInputs() {
      const self = this;

      this.handlerEls.forEach((handler) => {
        const input = handler.inputReference;
        input.value = self.percentToValue(parseFloat(handler.style.left, 10));
      });
    }

    /**
     * Transforms an input value with a min/max threshold to a percent value
     *
     * @param  float val
     * @return float percentage
     */
    valueToPercent(val) {
      const scale = this.options.max - this.options.min;
      return (100 / scale) * (val - this.options.min);
    }

    /**
     * Comes handy when the user drags the element, and all we have is the left coordinate
     *
     * @param  float px
     * @return float percent
     */
    pxToPercent(px) {
      const full = this.container.scrollWidth;
      return (px / full) * 100;
    }

    /**
     * Gives back the value based on the current handler position
     *
     * @param  float percent
     * @return float value
     */
    percentToValue(percent) {
      const scale = this.options.max - this.options.min;
      // before rounding to options.step
      const rawValue = (percent / (100 / scale)) + this.options.min;
      const rounded = round(rawValue, this.options.step);

      return rounded;
    }

    normalizePercent(percent) {
      percent = Math.max(0, percent);
      percent = Math.min(100, percent);

      return this.valueToPercent(this.percentToValue(percent));
    }
  }

  /**
   * Create multihandler components of the given array of DOMNodes
   *
   * @param  Array els    Node list of DOM elements
   * @return undefined
   */
  const init = (els) => {
    els.forEach((el) => {
      return new MultiHandle(el);
    });
  };

  /**
   * Exported API in the window namespace
   */
  window.multihandle = {
    init
  };
})(window);
