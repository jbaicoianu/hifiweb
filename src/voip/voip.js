import { VOIPWorkletNode } from './voip-worklet-node.js';
//import { VOIPWorkletProcessor } from './voip-worklet-processor.js';

export class VOIP {
  constructor() {
    console.log('init voip', this);

    let context = new AudioContext();
    context.audioWorklet.addModule('https://baicoianu.com/~bai/highfidelity/hifiweb/src/voip/voip-worklet-processor.js').then(() => {
      this.worklet = new VOIPWorkletNode(context, 'voip-worklet-processor', { credentials: 'omit' });
      this.worklet.connect(context.destination);
    }).catch((e, v) => {
      console.error('VOIP worklet failed to initialize', e, e.message);
    });
  }
  processVOIPData(data) {
    this.worklet.processVOIPData(data);
  }
}

