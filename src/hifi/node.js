import * as packets from './packets.js';
import { ControlPacket } from './controlpacket.js';
import { PacketReceiver } from './packetreceiver.js';
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
    this.typeName = NodeTypeMap[type];
    this.uuid = null;
    this.permissions = null;
    this.isReplicated = false;
    //this.localID = null;
    //this.clientLocalID = null;

    this.publicSocket = publicSocket;

    this.connectionSecret = null;

    this.sequenceNumber = 0;

    this.packetreceiver = new PacketReceiver();

    this.addPacketHandler('Ping', (packet) => this.handlePing(packet));
    this.addPacketHandler('PingReply', (packet) => this.handlePingReply(packet));
console.log('made new node', this);

    // TODO - these should really be in a separate Connection class
    this.lastReceivedSequenceNumber = -1;
    this.lossList = [];
    this.hasReceivedHandshake= false;
    this.ackPacket = ControlPacket.create(ControlPacket.types.ACK);
    this.handshakeACK = ControlPacket.create(ControlPacket.types.HandshakeACK);

    //this.startPingTimer();
  }
  close() {
    this.publicSocket.close();
  }

  updateNode(node, domainSessionLocalID) {
    this.uuid = node.uuid;
    this.sessionLocalID = node.sessionLocalID;
    this.domainSessionLocalID = domainSessionLocalID;
    this.setConnectionSecret(node.connectionSecretUUID);
  }
  createPacket(type, args={}) {
    //console.log('create packet', type, args, this);
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
    // Detect whether this is a control packet or an NLPacket by looking at the first 4 bytes (NOTE - maybe we only really need one..)
    let arr32 = new Uint32Array(data, 0, 1);
    let isControlPacket = arr32[0] >>> 31 & 1;

    // https://github.com/highfidelity/hifi/blob/061f86e550be711ce49a12ec9cb05ae757851169/libraries/networking/src/udt/Socket.cpp#L370-L421
    if (isControlPacket) {
      let packet = ControlPacket.fromReceivedPacket(data);
      return packet;
    } else {
      let packet = packets.NLPacket.fromReceivedPacket(data);

      // FIXME - only recording sequenceNumbers for non-obfuscated packets, I think once everything is implemented with ACKs and handshakes it won't be necessary
      if (packet.obfuscationlevel == 0) {
        this.lastReceivedSequenceNumber = packet.sequenceNumber;
      }
      if (packet.isReliable()) {
        this.processReceivedSequenceNumber(packet.sequenceNumber);
      }

      /*
      if (packet.isPartOfMessage()) {
        this.queueReceivedMessagePacket(packet);
      }
      */

      return packet;
    }
  }
  processReceivedSequenceNumber(sequenceNumber, packetSize, payloadSize) {
    // Based on https://github.com/highfidelity/hifi/blob/25be635b763506e4a184bc363f5f7c5a6c0f1c78/libraries/networking/src/udt/Connection.cpp#L233

    if (!this.hasReceivedHandshake) {
      // Refuse to process any packets until we've received the handshake
      this.sendHandshakeRequest();
      return false;
    }

    // mark our last receive time as now (to push the potential expiry farther)
    this.lastReceiveTime = performance.now();

    // If this is not the next sequence number, report loss
    if (sequenceNumber > this.lastReceivedSequenceNumber + 1) {
      // note from bai: this seems like strange logic to me. If we skipped only one sequenceNumber, we report that one as having been lost
      // But if we skipped more than one sequenceNumber, we report the first and last as being lost, but not the ones in the middle?
      if (this.lastReceivedSequenceNumber + 1 == sequenceNumber - 1) {
        this.lossList.push(this.lastReceivedSequenceNumber + 1);
      } else {
        this.lossList.push(this.lastReceivedSequenceNumber + 1, sequenceNumber - 1);
      }
    }

    let wasDuplicate = false;
    if (sequenceNumber > this.lastReceivedSequenceNumber) {
      // Update largest recieved sequence number
      this.lastReceivedSequenceNumber = sequenceNumber;
    } else {
      // Otherwise, it could be a resend, try and remove it from the loss list
      let lossidx = this.lossList.indexOf(sequenceNumber);
      if (lossidx != -1) {
        this.lossList.splice(lossidx, 1);
      } else {
        wasDuplicate = true;
      }
    }

    // using a congestion control that ACKs every packet (like TCP Vegas)
    this.sendACK();

    if (wasDuplicate) {
      //this.stats.record(ConnectionStats::Stats::Duplicate);
    } else {
      //this.stats.recordReceivedPackets(payloadSize, packetSize);
    }

    return !wasDuplicate;
  }
  sendHandshakeRequest() {
    let handshakeRequestPacket = ControlPacket.create(ControlPacket.types.HandshakeRequest, 0);
    this.writeBasePacket(handshakeRequestPacket);
console.log('sendHandshakeRequest', handshakeRequestPacket);

    this.didRequestHandshake = true;
  }
  processControl(controlPacket) {
    // Simple dispatch to control packets processing methods based on their type.

    // Processing of control packets (other than Handshake / Handshake ACK)
    // is not performed if the handshake has not been completed.

    switch (controlPacket.type) {
      case ControlPacket.types.ACK:
        if (this.hasReceivedHandshakeACK) {
          this.processACK(controlPacket);
        }
        break;
      case ControlPacket.types.Handshake:
        this.processHandshake(controlPacket);
        break;
      case ControlPacket.types.HandshakeACK:
        this.processHandshakeACK(controlPacket);
        break;
      case ControlPacket.types.HandshakeRequest:
        if (this.hasReceivedHandshakeACK) {
          // We're already in a state where we've received a handshake ack, so we are likely in a state
          // where the other end expired our connection. Let's reset.

          console.log("Got HandshakeRequest", this);

          this.hasReceivedHandshakeACK = false;
          this.stopSendQueue();
        }
        break;
    }
  }
  processHandshake(controlPacket) {
    let initialSequenceNumber = controlPacket.payload.sequenceNumber;
console.log('processHandshake', controlPacket);

    if (!this.hasReceivedHandshake || initialSequenceNumber != this.initialReceiveSequenceNumber) {
      // server sent us a handshake - we need to assume this means state should be reset
      // as long as we haven't received a handshake yet or we have and we've received some data

      if (initialSequenceNumber != this.initialReceiveSequenceNumber) {
          console.log("Resetting receive state, received a new initial sequence number in handshake");
      }
      this.resetReceiveState();
      this.initialReceiveSequenceNumber = initialSequenceNumber;
      this.lastReceivedSequenceNumber = initialSequenceNumber - 1;
    }

    //this.handshakeACK.reset();
    this.handshakeACK.payload.sequenceNumber = initialSequenceNumber;
    this.sendPacket(this.handshakeACK);

    if (this.didRequestHandshake) {
      this.dispatchEvent(new CustomElement('receiverHandshakeRequestComplete'));
      this.didRequestHandshake = false;
    }
  }
  processHandshakeACK(controlPacket) {
    // https://github.com/highfidelity/hifi/blob/25be635b763506e4a184bc363f5f7c5a6c0f1c78/libraries/networking/src/udt/Connection.cpp#L385-L401

    /*
    // TODO - we don't implement SendQueue yet, this code would keep us from sending packets until we received the handshake ACK
    // if we've decided to clean up the send queue then this handshake ACK should be ignored, it's useless
    if (_sendQueue) {
      SequenceNumber initialSequenceNumber;
      controlPacket->readPrimitive(&initialSequenceNumber);

      if (initialSequenceNumber == _initialSequenceNumber) {
        // hand off this handshake ACK to the send queue so it knows it can start sending
        getSendQueue().handshakeACK();

        // indicate that handshake ACK was received
        _hasReceivedHandshakeACK = true;
      }
    }
    */
console.log('processHandshakeACK', controlPacket);
    this.hasReceivedHandshakeACK = true;
  }
  resetReceiveState() {
    // https://github.com/highfidelity/hifi/blob/25be635b763506e4a184bc363f5f7c5a6c0f1c78/libraries/networking/src/udt/Connection.cpp#L401-L419
    this.lastReceivedSequenceNumber = 0;
    this.lossList = [];
    this.connectionStart = performance.now();

    /*
    // TODO - we aren't currently queueing received messages, but if we were this is where we'd clear out stale ones
    // clear any pending received messages
    for (let k in this.pendingReceivedMessages) {
      _parentSocket->messageFailed(this, pendingMessage.first);
    }
    */
  }
  processACK(controlPacket) {
    // https://github.com/highfidelity/hifi/blob/25be635b763506e4a184bc363f5f7c5a6c0f1c78/libraries/networking/src/udt/Connection.cpp#L315-L352
    let ack = controlPacket.payload.sequenceNumber;

    if (ack < this.lastReceivedACK) {
      // this is an out of order ACK, bail
      return;
    }
    if (ack > this.lastReceivedACK) {
      // this is not a repeated ACK, so update our member and tell the send queue
      this.lastReceivedACK = ack;

      // ACK the send queue so it knows what was received
      //getSendQueue().ack(ack);
    }

    /*
    // give this ACK to the congestion control and update the send queue parameters
    updateCongestionControlAndSendQueue([this, ack, &controlPacket] {
        if (_congestionControl->onACK(ack, controlPacket->getReceiveTime())) {
            // the congestion control has told us it needs a fast re-transmit of ack + 1, add that now
            _sendQueue->fastRetransmit(ack + 1);
        }
    });
    */
  }
  sendACK() {
    let nextACKNumber = this.nextACK();

    // we have received new packets since the last sent ACK
    // or our congestion control dictates that we always send ACKs

    //this.ackPacket.reset(); // We need to reset it every time.

    // Pack in the ACK number
    this.ackPacket.payload.sequenceNumber = nextACKNumber;
console.log('send ack!', nextACKNumber, this.ackPacket);
    this.writeBasePacket(this.ackPacket);

    //this.stats.record(ConnectionStats::Stats::SentACK);
  }
  nextACK() {
    if (this.lossList.length > 0) {
      return this.lossList[0] - 1;
    } else {
      return this.lastReceivedSequenceNumber;
    }
  }
  sendPacket(packet) {
    if (packet instanceof ControlPacket) {
      this.writeBasePacket(packet);
    } else if (packet instanceof packets.NLPacket) {
      packet.sequenceNumber = this.sequenceNumber++;
      packet.version = packets.versionForPacketType(packet.packetName);
      //console.log('send packet', this.type, packet.sequenceNumber, packet, this);
      if (this.authhash) {
        packet.writeVerificationHash(this.authhash);
      }
      this.writeBasePacket(packet);
    }
  }
  writeBasePacket(packet) {
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
    if (packet instanceof ControlPacket) {
      this.processControl(packet);
    } else if (packet.payload) {
      if (this.authhash) {
        packet.verify(this.authhash)
      }
      this.packetreceiver.handlePacket(packet);
    }
  }
  startPingTimer() {
    if (!this.pingTimer) {
      this.pingTimer = setInterval(() => this.sendPing(), 1000);
    }
  }
  sendPing() {
    let now = new Date().getTime();
    let ping = this.createPacket('Ping', { time: now });
    this.sendPacket(ping);
  }
  sendPingReply(ping) {
    let now = new Date().getTime() * 1000;
    let pingreply = this.createPacket('PingReply', {
      pingType: ping.pingType,
      pingTime: ping.time,
      time: now
    });
    this.sendPacket(pingreply);
  }
  stopPingTimer() {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = false;
    }
  }
  addPacketHandler(type, callback) {
console.log('add handler', type, packets.PacketType[type]);
    this.packetreceiver.registerListener(packets.PacketType[type], callback);
  }
  setConnectionSecret(secret) {
    if (secret == this.connectionSecret) return;
    if (!this.authhash) this.authhash = new hmac.HMACAuth();
    this.connectionSecret = secret;
    this.authhash.setKey(uuid.toRfc4122(secret));
  }
  getUUID() {
    return this.uuid;
  }
  handlePing(packet) {
//console.log('ping!', packet);
    this.sendPingReply(packet);
  }
  isConnected() {
    return this.publicSocket.readyState == 'open';
  }
  handlePingReply(packet) {
//console.log('pingreply!', packet);
  }
  
};

HifiNode.NULL_LOCAL_ID = 0;
