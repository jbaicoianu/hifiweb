import { PacketReceiver } from './packetreceiver.js';
import * as packets from './packets.js';

var nodelistInstance;

export class NodeList {
  constructor() {
console.log('create a nodelist');
    if (typeof SharedWorker != 'undefined') {
      this.worker = new SharedWorker('src/hifi/nodelist-worker.js');
console.log('made the worker', this.worker);
      this.setDataPort(this.worker.port);
    }
    //this.connectToRelay();
  }
  setDataPort(port) {
    port.onmessage = (ev) => this.handleMessage(ev);
    this.dataport = port;
    port.start();
    this.dataport.postMessage({type: 'init'});
console.log('start port', port);
  }
  connectToRelay(relay, domain) {
    if (this.dataport) {
      this.dataport.postMessage({type: 'connect', relay: relay, domain: domain});
    }
  }
  createPacket(type, args={}) {
    //console.log('create packet', type, args, this);
    let nlpacket = new packets.NLPacket({
      packetType: type
    });
    if (packets[type]) {
      let packet = new packets[type](args);
      nlpacket.setPayload(packet);
    } else {
      console.warn('[NodeList] Unknown packet type:', type);
    }
    return nlpacket;
  }
  sendPacket(packet, destinationNode) {
    console.log('[NodeList] send the packet', packet);
    this.dataport.postMessage({type: 'packet', packet: packet.write()});
  }
  sendPacketList(packetList, destinationNode) {
  }
  getPacketReceiver() {
    if (!this.packetreceiver) {
      this.packetreceiver = new PacketReceiver();
    }
    return this.packetreceiver;
  }
  handleMessage(ev) {
    console.log('[NodeList] message', ev);
  }
  static singleton() {
    if (!nodelistInstance) {
      nodelistInstance = new NodeList();
    }
    return nodelistInstance;
  }
}
