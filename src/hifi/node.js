import * as packets from './packets.js';
import {PacketReceiver} from './packetreceiver.js';
import * as hmac from '../utils/hmac.js';
import * as uuid from '../utils/uuid.js';

export const NodeTypeMap = {
  m: 'message',
  S: 'entityscript',
  W: 'avatar',
  M: 'audio',
  o: 'entity',
  A: 'asset',
  D: 'domain'
}

export const NodeType = {
    DomainServer: 'D',
    EntityServer: 'o', // was ModelServer
    Agent: 'I',
    AudioMixer: 'M',
    AvatarMixer: 'W',
    AssetServer: 'A',
    MessagesMixer: 'm',
    EntityScriptServer: 'S',
    UpstreamAudioMixer: 'B',
    UpstreamAvatarMixer: 'C',
    DownstreamAudioMixer: 'a',
    DownstreamAvatarMixer: 'w',
    Unassigned: 1,
}

export class HifiNode extends EventTarget {
  constructor(type, publicSocket) {
    super();
    this.type = type;
    this.uuid = null;
    this.permissions = null;
    this.isReplicated = false;
    this.localID = null;
    this.clientLocalID = null;

    this.publicSocket = publicSocket;

    this.connectionSecret = null;

    this.sequenceNumber = 0;

    this.packetreceiver = new PacketReceiver();
  }

  updateNode(node, domainSessionLocalID) {
    this.uuid = node.uuid;
    this.sessionLocalID = node.sessionLocalID;
    this.domainSessionLocalID = domainSessionLocalID;
    this.setConnectionSecret(node.connectionSecretUUID);
  }
  createPacket(type, args={}) {
    console.log('create packet', type, args, this);
    let nlpacket = new packets.NLPacket({
      packetType: type,
      version: this.getVersionForType(type),
      localNodeID: this.domainSessionLocalID,
    });
    if (packets[type]) {
      let packet = new packets[type](args);
      nlpacket.setPayload(packet);
    } else {
      console.warn('Unknown packet type:', type);
    }
    return nlpacket;
  }
  getVersionForType(type) {
    return 1;
  }
  getPacketFromData(data, srcAddr, srcPort) {
    let nlpacket = new packets.NLPacket();
    nlpacket.read(data);
//console.log(nlpacket, data);
    //let packet = new HifiPacket({srcAddr: srcAddr,segment: { srcPort: srcPort, payload: data} });
    //let dt = (new Date().getTime() - this.startTime) / 1000;
    //document.querySelector('hifi-packetlist').addPacket(packet, false, dt);
//console.log('BEEP', nlpacket);
    //this.packetdebugger.add(nlpacket);
    return nlpacket;
  }
  sendPacket(packet) {
    packet.sequenceNumber = this.sequenceNumber++;
    console.log('send packet', NodeTypeMap[this.type], packet.sequenceNumber, packet, this);

    //Encapsulate data with info on the server we are communicating with
    var p1 = new Uint8Array(1);
    p1[0] = this.type.charCodeAt(0);
    var p2 = new Uint8Array(packet.write());
    var p = new Uint8Array(p1.byteLength + p2.byteLength);
    p.set(p1, 0);
    p.set(p2, p1.byteLength);

    this.publicSocket.send(p);
    this.dispatchEvent(new CustomEvent('send', { detail: packet }));
  }
  handleNodePacket(data) {
    let packet = this.getPacketFromData(data, 'janusvr', NodeTypeMap[this.type]);
    //this.receiver.handlePacket(packet);
    //console.log(NodeTypeMap[this.type], packet.packetName, packet);
    this.dispatchEvent(new CustomEvent('receive', { detail: packet }));
    if (packet.payload) {
      if (this.authhash) {
        packet.verify(this.authhash)
      }
      this.packetreceiver.handlePacket(packet.payload);
    }
  }
  startPingTimer() {
    if (!this.pingTimer) {
      this.pingTimer = setInterval(this.sendPing, 1000);
    }
  }
  sendPing() {
    let now = new Date().getTime();
    console.log('send ping', now);
    let ping = this.createPacket('Ping', { time: now });
    console.log(' - ', ping);
    this.sendPacket(ping);
  }
  stopPingTimer() {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = false;
    }
  }
  addPacketHandler(type, callback) {
console.log('add handler', type, packets.PacketType.fromValue(type));
    this.packetreceiver.registerListener(packets.PacketType.fromValue(type), callback);
  }
  setConnectionSecret(secret) {
console.log('set node secret', secret, this);
    if (secret == this.connectionSecret) return;
    if (!this.authhash) this.authhash = new hmac.HMACAuth();
    this.connectionSecret = secret;
    this.authhash.setKey(uuid.toRfc4122(secret));
  }
  
};
