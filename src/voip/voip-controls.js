import { VoipIndicator } from './voip-indicator.js';
import { VoipWaveform } from './voip-waveform.js';

export class VoipControls extends HTMLElement {
  connectedCallback() {
    this.label = document.createElement('div');
    this.label.innerHTML = "Press 'v' to talk";
    this.appendChild(this.label);

    this.indicator = document.createElement('voip-indicator');
    this.appendChild(this.indicator);

    this.waveform = document.createElement('voip-waveform');
    this.appendChild(this.waveform);
  }
};
customElements.define('voip-controls', VoipControls);
