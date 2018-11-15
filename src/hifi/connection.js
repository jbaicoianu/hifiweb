// NodeList is a singleton class that can be retrieved from anywhere in the code via the DependencyManager
// NodeList extends LimitedNodeList
// LimitedNodeList has a Socket "_nodeSocket"
// Socket has multiple Connection objects
// Connection handles ACKs and handshaking for incoming packets
// each Connection has a SendQueue
// that SendQueue handles ACKs, handshaking, retransmits, etc. for outgoing packets on that connection

import { SendQueue } from './sendqueue.js';
import { ControlPacket } from './controlpacket.js';

export class Connection extends EventTarget {
  constructor(parentSocket) {
    super();

    this.hasReceivedHandshake = false;
    this.hasReceivedHandshakeACK = false;
    this.didRequestHandshake = false;

    this.connectionStart = performance.now();
    this.lastReceiveTime = 0;

    this.initialSequenceNumber = Math.floor(Math.random()) * 65536;
    this.initialReceiveSequenceNumber = 0;

    this.lastMessageNumber = 0;

    this.lossList = [];
    this.lastReceivedSequenceNumber = 0;
    this.lastReceivedACK = 0;

    this.parentSocket = parentSocket;
    this.sendQueue = null;
    this.pendingReceivedMessages = [];

    this.ackPacket = ControlPacket.create(ControlPacket.types.ACK);
    this.handshakeACK = ControlPacket.create(ControlPacket.types.HandshakeACK);

    this.stats = null;
  }
  sendReliablePacket(packet) {
    if (packet.isReliable()) {
      this.getSendQueue().queuePacket(packet);
    } else {
      console.warn('Connection::sendReliablePacket trying to send unreliable packet reliably', packet, this);
    }
  }
  sendReliablePacketList(packetList) {
    if (packetList.isReliable()) {
      this.getSendQueue().queuePacketList(packetList);
    } else {
      console.warn('Connection::sendReliablePacketList trying to send unreliable packetlist reliably', packetList, this);
    }
  }
  sync() { // rate control method, fired by Socket for all connections on SYN interval
  }
  processReceivedSequenceNumber(sequenceNumber, packetSize, payloadSize) {
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

          this.hasReceivedHandshakeACK = false;
          this.stopSendQueue();
        }
        break;
    }
  }
  queueReceivedMessagePacket(packet) {
  }
  sampleStats() {
  }
  sendHandshakeRequest() {
    let handshakeRequestPacket = ControlPacket.create(ControlPacket.types.HandshakeRequest, 0);
    this.writeBasePacket(handshakeRequestPacket);

    this.didRequestHandshake = true;
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
  processHandshake(controlPacket) {
    let initialSequenceNumber = controlPacket.payload.sequenceNumber;

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
      this.dispatchEvent(new CustomEvent('receiverHandshakeRequestComplete'));
      this.didRequestHandshake = false;
    }
  }
  processHandshakeACK(controlPacket) {
    // https://github.com/highfidelity/hifi/blob/25be635b763506e4a184bc363f5f7c5a6c0f1c78/libraries/networking/src/udt/Connection.cpp#L385-L401

    if (this.sendQueue) {
      if (controlPacket.payload.sequenceNumber == this.initialSequenceNumber) {
        // hand off this handshake ACK to the send queue so it knows it can start sending
        this.getSendQueue().handshakeACK();

        // indicate that handshake ACK was received
        this.hasReceivedHandshakeACK = true;
      }
    }
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
  getSendQueue() {
    if (!this.sendQueue) {
      if (!this.hasReceivedHandshakeACK) {
        this.sendQueue = SendQueue.create(this, this.destination, this.initialSequenceNumber - 1, this.lastMessageNumber, this.hasReceivedHandshakeACK);
        this.lastReceivedACK = this.sendQueue.getCurrentSequenceNumber();
      } else {
        this.sendQueue = SendQueue.create(this, this.destination, this.lastReceivedACK, this.lastMessageNumber, this.hasReceivedHandshakeACK);
      }

      /*
      this.sendQueue.addEventListener('packetSent', (ev) => this.packetSent(ev));
      this.sendQueue.addEventListener('packetSent', (ev) => this.recordSentPackets(ev));
      this.sendQueue.addEventListener('packetRetransmitted', (ev) => this.recordRetransmission(ev));
      this.sendQueue.addEventListener('queueInactive', (ev) => this.queueInactive(ev));
      this.sendQueue.addEventListener('timeout', (ev) => this.queueTimeout(ev));
      */
    }
    return this.sendQueue;
  }
  nextACK() {
    if (this.lossList.length > 0) {
      return this.lossList[0] - 1;
    } else {
      return this.lastReceivedSequenceNumber;
    }
  }
  updateCongestionControlAndSendQueue(congestionCallback) {
  }
  stopSendQueue() {
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
//console.log('send', packet.payload, packet, this);
    this.dispatchEvent(new CustomEvent('send', { detail: packet }));
  }
  isConnected() {
    return this.publicSocket.readyState == 'open';
  }
  close() {
    this.publicSocket.close();
  }
}
