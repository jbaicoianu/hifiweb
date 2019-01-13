export class VoipIndicator extends HTMLElement {
  construct() {
  }

  get active() {
    return this.getAttribute('active');
  }
  set active(v) {
    if (v === false) {
      this.removeAttribute('active');
    } else {
      this.setAttribute('active', v);
    }
  }
  
  start() {
console.log('active');
    this.active = true;
  }
  stop() {
console.log('inactive');
    this.active = false;
  }
};

customElements.define('voip-indicator', VoipIndicator);
