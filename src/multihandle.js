((window) => {
  class MultiHandle {
    constructor(el) {
      this.el = el;
      this.el.className = el.className.replace(/multihandle--loading/g, '');
      this.bindEvents();
    }

    bindEvents() {
      this.el.addEventListener('click', this.onMouseDown);
    }

    onMouseDown() {
      console.log('mouse down!');
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
