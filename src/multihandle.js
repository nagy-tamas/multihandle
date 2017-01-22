((window) => {
  /**
   * Rounds number to closest step.
   *
   * @param    {Float} value
   * @param    {Float} step
   * @return   {Float}
   */
  function round(value, step) {
    step || (step = 1.0);
    const inv = 1.0 / step;
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
    const div = Math.pow(10, places);
    return Math.round(value * div) / div;
  }

  /**
   * Safari can't do Object.assign with a DOMStringMap, so we help him out
   *
   * @param    {DOMStringMap} map
   * @return   {Object}
   */
  function domStringMapToObj(map) {
    const obj = {};
    Object.keys(map).forEach((key) => {
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
   * Vanilla version of $.offset
   *
   * @param      {DOMNode}  el
   * @return     {Object}  left and top coordinates of object
   */
  function getOffset(el) {
    const rect = el.getBoundingClientRect();

    return {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft
    };
  }


  /**
   * Utility function to create events
   *
   * @param  {String} eventType
   * @return {Event}
   */
  function newEvent(eventType, options) {
    const evt = document.createEvent('HTMLEvents');
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
    const matchesSelector = el.matches || el.webkitMatchesSelector ||
      el.mozMatchesSelector || el.msMatchesSelector;

    while (el) {
      if (matchesSelector.call(el, selector)) {
        break;
      }
      el = el.parentElement;
    }
    return el;
  }

  /**
   * "parent" node is a parent of (or is the same as) "child" node?
   *
   * @param {DOMNode} parent  parent element
   * @param {DOMNode} child   child element
   * @param {bool}            contains, equals: true, otherwise: false
   */
  function isAscendantOf(parent, child) {
    let current = child;

    while (current) {
      if (current === parent) {
        break;
      }
      current = current.parentNode;
    }
    return current === parent;
  }

  class MultiHandle {
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
    constructor(el, options = {}) {
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
    parseOptions(options) {
      // default options, merged to the data attributes, then to the given options
      const opts = Object.assign({
        min: 0,
        max: 100,
        step: 0.5,
        decimalsAccuracy: 2,

        // selector to the dataset element in the domtree
        dataset: false,

        // which graphical elements will be enabled? We only have
        // `snappingpoints` right now
        generateExtraMarkup: '',

        // null, exclusive, inclusive
        handlerOverlap: null,

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

      opts.incLittle = typeof opts.incLittle === 'undefined' ?
        opts.step : opts.incLittle;

      opts.incBig = typeof opts.incBig === 'undefined' ?
        opts.step * 10 : opts.incBig;

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
    createHandlers(inputs) {
      const self = this;
      let ix = -1;
      return inputs.reduce((previous, current) => {
        ix++;
        return `${previous}<a href="javascript:void(0)"
          class="multihandle__handle multihandle__handle--${ix}">
            ${self.options.tplHandler}
          </a>`;
      }, '');
    }

    /**
     * Creates the dataset from the given select tag
     *
     * @param  {DOMNode}  select
     * @return {Array}
     */
    createDatasetFromSelect(select) {
      const dataset = [];
      for (let ix = 0; ix <= select.options.length - 1; ix++) {
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
    findInputs(container) {
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
    findHandlers(track) {
      const self = this;
      const handlers = [];
      Array.prototype.forEach.call(track.querySelectorAll('.multihandle__handle'), (el, ix) => {
        el.inputReference = this.inputs[ix];
        handlers.push(el);
      });
      return handlers;
    }

    /**
     * Creates the dataset if needed
     *
     * @return {undefined}
     */
    initDataset() {
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
    addInterval(from, to, track, className) {
      const interval = document.createElement('span');
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
    createIntervals(track) {
      // interval between the first handler and the track's left side
      this.addInterval(
        null,
        this.handlers[0],
        track,
        'multihandle__interval multihandle__interval--start');

      // let's create them between the current handler, and the next one
      // are we in multihandle mode?
      if (this.handlers.length >= 2) {
        for (let i = 0; i < this.handlers.length - 1; i++) {
          this.addInterval(
            this.handlers[i],
            this.handlers[i + 1],
            track,
            `multihandle__interval multihandle__interval--${i}`);
        }
      }

      // interval between the last handler and the track's right side
      this.addInterval(
        this.handlers[this.handlers.length - 1],
        null,
        track,
        'multihandle__interval multihandle__interval--end');
    }

    /**
     * Creates visible, styleable snapping points
     *
     * @param  {DOMNode} track    The snapping points will be created in this container
     * @return {undefined}
     */
    createSnappingPoints(track) {
      // container div for easier styling (css queries)
      const snaps = document.createElement('div');
      snaps.className = 'multihandle__snappingpoints';
      track.appendChild(snaps);

      this.snappingMap.forEach((data, ix) => {
        const snap = document.createElement('span');
        let label;
        snap.className = 'multihandle__snappingpoint';
        snaps.appendChild(snap);

        if (this.options.dataset === 'select') {
          label = this.dataset[data[0]].label;
        } else {
          label = data[0];
        }

        snap.innerHTML = this.options.tplSnappingpoint.replace(/\${label}/, label);
        snap.style.left = `${data[1]}%`;
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
    createSnappingMap() {
      const valLength = Math.abs(this.options.max - this.options.min);
      const steps = valLength / this.options.step;
      const snaps = [];

      for (let ix = 0; ix <= steps; ix++) {
        // avoiding floating point math "bugs"
        const currVal = roundToDecimalPlaces(ix * this.options.step, 6);
        // first number: value, second: percent (for display purposes)
        snaps.push([this.options.min + currVal,
          roundToDecimalPlaces((currVal / valLength) * 100, 2)]);
      }

      return snaps;
    }

    /**
     * Is snapping enabled or not?
     *
     * @return {boolean}
     */
    isItSnaps() {
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
    setHandlerPos(handler, percent) {
      const value = this.percentToValue(percent);
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
    setHandlerLeft(handler, percent) {
      // would be better, but it won't work properly - ther percentage in this
      // case is relative to the element's size instead of the parent's size
      // handler.style.transform = `translate3d(${percent}%, 0, 0)`;

      handler.style.left = `${percent}%`;
    }

    /**
     * Update a handler's label by a value (could be a real value, or a dataset index)
     *
     * @param  {DOMNode} handler
     * @param  {Float} value
     * @return {undefined}
     */
    updateHandlerLabel(handler, value) {
      let label;

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
    buildComponent() {
      // creating the track element
      this.track = document.createElement('div');
      this.track.className = 'multihandle__track';
      this.container.appendChild(this.track);

      // find all the inputs elements
      this.inputs = this.findInputs(this.el);

      if (this.options.dataset) {
        this.initDataset();
      }


      this.track.innerHTML = this.options.tplTrack.replace(/\${handlers}/,
        this.createHandlers(this.inputs));
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
    bindEvents() {
      this.container.addEventListener('mousedown', evt => this.onMouseDown(evt));
      this.container.addEventListener('touchstart', evt => this.onMouseDown(evt));
      document.body.addEventListener('mouseup', evt => this.onMouseUp(evt));
      document.body.addEventListener('touchend', evt => this.onMouseUp(evt));
      document.body.addEventListener('touchcancel', evt => this.onMouseUp(evt));
      document.body.addEventListener('mousemove', evt => this.onMouseMove(evt));
      document.body.addEventListener('touchmove', evt => this.onMouseMove(evt));
      this.el.addEventListener('inputUpdated', evt => this.syncHandlersToInputs());

      this.handlers.forEach((handle) => {
        handle.addEventListener('keydown', evt => this.onHandlerKeyDown(evt));

        // stopping the browser's d&d feature on the anchor.
        // doesn't work with the addEventListener way, that's why we need this
        // direct assignment here
        handle.ondragstart = evt => (false);
      });
    }

    /**
     * Finds out if a click happened on one of the handlers
     *
     * @param  {Event}  evt  The event
     * @return {DOMNode}   found handler
     */
    getClickedHandler(evt) {
      return this.handlers.find((handler) => {
        return isAscendantOf(handler, evt.target);
      });
    }


    /**
     * This could be a start for dragging one of the handlers
     *
     * @param  {Event} evt
     * @return {undefined}
     */
    onMouseDown(evt) {
      // if click triggered somewhere in our component, not on one of the handlers...
      const foundHandler = this.getClickedHandler(evt);
      let foundIx = -1;
      if (foundHandler) {
        foundIx = this.handlers.indexOf(foundHandler);
      }

      if (!foundHandler) {
        const parent = closest(evt.target, '.multihandle__track');
        if (parent) {
          this.jumpToPx(this.handlers[0], getClientX(evt) - getOffset(this.track).left);
        }
        return;
      }

      this.dragging = {
        handlerIx: foundIx,
        handler: foundHandler,
        startLeft: foundHandler.offsetLeft,
        startX: getClientX(evt)
      };

      this.dragging.handler.classList.add('multihandle__handle--active');
    }

    /**
     * Dragging stopped
     *
     * @return {undefined}
     */
    onMouseUp(evt) {
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
    onMouseMove(evt) {
      if (this.dragging && this.dragging.handlerIx > -1) {
        const newLeftPx = getClientX(evt) - getOffset(this.track).left;
        const percent = this.normalizePercent(this.pixelToPercent(newLeftPx));

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
    setValue(handler, value) {
      value = this.normalizeValue(value);
      const percent = this.valueToPercent(value);

      if (this.options.dataset === 'select') {
        handler.inputReference.options.selectedIndex = value;
      } else {
        const posValues = this.getPossibleValuesFor(handler, value);
        if (this.options.handlerOverlap === 'exclusive') {
          if (value < posValues.min || value > posValues.max) {
            return;
          }
        } else if (this.options.handlerOverlap === 'inclusive') {
          if (value <= posValues.min || value >= posValues.max) {
            return;
          }
        }

        handler.inputReference.value = value;
      }

      handler.inputReference.dispatchEvent(newEvent('input'));
      this.setHandlerPos(handler, percent);
    }

    getPossibleValuesFor(handler, overlap) {
      const handlerIndex = this.handlers.indexOf(handler);
      const ret = {
        min: this.options.min - this.options.step,
        max: this.options.max + this.options.step
      };

      if (handlerIndex > 0) {
        ret.min = parseFloat(this.handlers[handlerIndex - 1].inputReference.value, 10);
      }

      if (handlerIndex < this.handlers.length - 1) {
        ret.max = parseFloat(this.handlers[handlerIndex + 1].inputReference.value, 10);
      }

      return ret;
    }

    /**
     * Sets a handler's value as percent plus updates the related input
     *
     * @param {DOMNode} handler
     * @param {Float} percent
     */
    setValueByPercent(handler, percent) {
      const value = this.percentToValue(percent);
      this.setValue(handler, value);
    }

    /**
     * Handling the keystrokes
     *
     * @param {Event} evt
     */
    onHandlerKeyDown(evt) {
      switch (evt.keyCode) {
        case 38: // up
          this.incByBig(evt.target);
          evt.preventDefault();
          break;
        case 40: // down
          this.descByBig(evt.target);
          evt.preventDefault();
          break;
        case 39: // right
          this.incByLittle(evt.target);
          evt.preventDefault();
          break;
        case 37: // left
          this.descByLittle(evt.target);
          evt.preventDefault();
          break;
        default:
      }
    }

    incDec(handler, offset) {
      this.setValue(handler, parseFloat(handler.inputReference.value, 10) + offset);
      handler.inputReference.dispatchEvent(newEvent('inputend'));
    }

    incByLittle(handler) {
      this.incDec(handler, this.options.incLittle);
    }

    descByLittle(handler) {
      this.incDec(handler, -this.options.incLittle);
    }

    incByBig(handler) {
      this.incDec(handler, this.options.incBig);
    }

    descByBig(handler) {
      this.incDec(handler, -this.options.incBig);
    }

    jumpToPx(handler, px) {
      const percent = this.normalizePercent(this.pixelToPercent(px));
      this.setValueByPercent(handler, percent);
      handler.inputReference.dispatchEvent(newEvent('inputend'));
    }

    /**
     * Update the handlers to reflect the inputs' state
     *
     * @return {undefined}
     */
    syncHandlersToInputs() {
      if (this.options.dataset === 'select') {
        const ix = this.inputs[0].options.selectedIndex;
        const percent = this.valueToPercent(ix);
        this.setHandlerPos(this.handlers[0], percent);
      } else {
        const self = this;
        self.handlers.forEach((el) => {
          const value = parseFloat(el.inputReference.value, 10);
          const percent = self.valueToPercent(value);
          self.setHandlerPos(el, percent);
        });
      }
    }

    /**
     * Updating the intervals between the handlers for proper sizing
     *
     * @return {undefined}
     */
    syncIntervalsBetweenHandlers() {
      this.intervals.forEach((interval) => {
        const fromPos = interval.from ? parseFloat(interval.from.style.left, 10) : 0;
        const toPos = interval.to ? parseFloat(interval.to.style.left, 10) : 100;

        const left = Math.min(toPos, fromPos);
        const width = Math.abs(toPos - fromPos);

        interval.style.left = `${left}%`;
        interval.style.width = `${width}%`;
      });
    }

    /**
     * Transforms an input value with a min/max threshold to a percent value
     *
     * @param  {Float} val
     * @return {Float} percentage
     */
    valueToPercent(val) {
      const scale = this.options.max - this.options.min;
      return (100 / scale) * (val - this.options.min);
    }

    /**
     * Comes handy when the user drags the element, and all we have is the left coordinate
     *
     * @param  {Float} px
     * @return {Float} percent
     */
    pixelToPercent(px) {
      const full = this.track.clientWidth;
      return (px / full) * 100;
    }

    /**
     * Gives back the percent's numeric representation on the min-max scale
     *
     * @param  {[type]} percent [description]
     * @return {[type]}         [description]
     */
    percentToOffset(percent) {
      const scale = this.options.max - this.options.min;
      // before rounding to options.step
      const rawValue = (percent / (100 / scale));
      return rawValue;
    }

    /**
     * Gives back the value, based on the current handler position
     *
     * @param  {Float} percent
     * @return {Float} value
     */
    percentToValue(percent) {
      // before rounding to options.step
      const rawValue = this.percentToOffset(percent) + this.options.min;
      const rounded = round(rawValue, this.options.step);

      return rounded;
    }

    /**
     * Converts percent to value, while keeping mind the min/max/step values
     *
     * @param {Float} percent
     */
    normalizePercent(percent) {
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
    normalizeValue(value) {
      value = Math.max(this.options.min, value);
      value = Math.min(this.options.max, value);
      value = roundToDecimalPlaces(value, this.options.decimalsAccuracy);
      return value;
    }

  }

  /**
   * Create multihandler components from the given array of DOMNodes
   *
   * @param  {Array}     els   Node list of DOM elements
   * @return {undefined}
   */
  const init = (els) => {
    // querySelectorAll -> Array
    if (els instanceof NodeList) {
      els = Array.prototype.slice.call(els);
    }

    // single element -> [element]  (so we can forEach it)
    if (!(els instanceof Array)) {
      els = [els];
    }

    els.forEach((el) => {
      return new MultiHandle(el);
    });
  };

  /**
   * Exported API in the window namespace
   */
  window.Multihandle = MultiHandle;
  window.multihandle = {
    init
  };
})(window);
