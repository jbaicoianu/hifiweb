export class VOIPWorkletNode extends AudioWorkletNode {
  constructor(context, processor) {
    super(context, processor);
  }
  processVOIPData(data) {
    this.port.postMessage(data);
  }
}


