import {HifiClient} from './client.js';

export {HifiClient} from './client.js';

class HifiClientElement extends HTMLElement {
  constructor() {
    super();
    Object.defineProperties(this, {
      domain: { writable: true, configurable: true }
    });

    this.hifi = new HifiClient();
    this.dispatchEvent(new CustomEvent('create'));
  }
};
customElements.define('hifi-client', HifiClientElement);

