import { VOIPWorkletNode } from './voip-worklet-node.js';
//import { VOIPWorkletProcessor } from './voip-worklet-processor.js';

export class VOIP extends EventTarget {
  constructor() {
    super();
    console.log('init voip', this);

    this.context = new AudioContext();
    this.context.audioWorklet.addModule('src/voip/voip-worklet-processor.js').then(() => {
      this.worklet = new VOIPWorkletNode(this.context, 'voip-worklet-processor-pcm');
      this.worklet.connect(this.context.destination);
      if (this.audiosource) {
        this.audiosource.connect(this.worklet);
      }
      this.worklet.port.onmessage = (ev) => this.handleMessage(ev);
    }).catch((e, v) => {
      console.error('VOIP worklet failed to initialize', e, e.message);
    });

    navigator.mediaDevices.getUserMedia({audio: true, video: false}).then((devices) => this.handleUserMedia(devices));
  }
  processVOIPData(data) {
    this.worklet.processVOIPData(data);
  }
  handleUserMedia(stream) {
    console.log('got stream!', stream);
    let source = this.context.createMediaStreamSource(stream);
    if (this.worklet) {
      source.connect(this.worklet);
    }
    this.audiosource = source;
  }
  handleMessage(ev) {
    //console.log('got a message', ev);
    this.dispatchEvent(new CustomEvent('voipdata', { detail: ev.data.buffer }));
  }
}

