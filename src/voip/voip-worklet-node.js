export class VOIPWorkletNode extends AudioWorkletNode {
  constructor(context) {
    super(context, 'voip-worklet-processor');
  }
  processVOIPData(data) {
    this.port.postMessage(data, [data.buffer]);
  }
}


