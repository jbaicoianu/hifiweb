import {HifiClient} from './client.js';

class HifiClientElement extends HTMLElement {
  constructor() {
    super();
    Object.defineProperties(this, {
      domain: { writable: true, configurable: true }
    });

    this.hifi = new HifiClient();
  }
};
customElements.define('hifi-client', HifiClientElement);

