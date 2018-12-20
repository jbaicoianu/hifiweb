if (typeof AudioWorkletNode == 'undefined') {
  console.warn('Tried to init AudioWorkletNode, but this browser doesn\'t support it');
  var AudioWorkletNode = class { }
}
export class VOIPWorkletNode extends AudioWorkletNode {
  constructor(context, processor) {
    super(context, processor);
  }
  processVOIPData(data) {
    this.port.postMessage(data);
  }
}
