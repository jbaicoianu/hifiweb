import { Enum } from '../utils/enum.js';
import { ControlPacket } from './controlpacket.js';

const State = new Enum([
  'NotStarted',
  'Running',
  'Stopped'
]);

export class SendQueue extends EventTarget {
  constructor(connection, destination, currentSequenceNumber, currentMessageNumber, hasReceivedHandshakeACK) {
    super();
    this.packets = [];
    this.connection = connection;
    this.lastACKSequenceNumber = 0; // Last ACKed sequence number
    this.currentSequenceNumber = currentSequenceNumber || 0; // Last sequence number sent out
    this.atomicCurrentSequenceNumber = 0; // Atomic for last sequence number sent out
    this.packetSendPeriod = 0; // Interval between two packet send event in microseconds, set from CC
    this.state = State.NotStarted;
    this.estimatedTimeout = 0; // Estimated timeout, set from CC
    this.syncInterval = 0; //DEFAULT_SYN_INTERVAL_USECS; // Sync interval, set from CC
    this.flowWindowSize = 0; // Flow control window size (number of packets that can be on wire) - set from CC

    this.packets = [];
    this.nacks = [];
    this.sentPackets = {};

    this.hasReceivedHandshakeACK = (hasReceivedHandshakeACK == true);

    this.run();
  }
  static create(connection, destination, currentSequenceNumber, currentMessageNumber, hasReceivedHandshakeACK) {
    let queue = new SendQueue(connection, destination, currentSequenceNumber, currentMessageNumber, hasReceivedHandshakeACK);
    return queue;
  }
  queuePacket(packet) {
    //this.packets.push(packet);
    // TODO - the native implementation uses a threaded queue, might be worth experimenting with a Worker but for now just send it immediately
    this.sendPacket(packet);
  }
  queuePacketList(packetList) {
    //this.packets.push(packet);
  }
  getCurrentSequenceNumber() {
  }
  getCurrentMessageNumber() {
  }
  setFlowWindowSize(flowWindowSize) {
  }
  getPacketSendPeriod() {
  }
  setPacketSendPeriod(newPeriod) {
  }
  setEstimatedTimeout(estimatedTimeout) {
  }
  setSyncInterval(syncInterval) {
  }
  run() {
    if (this.state == State.Stopped) {
      // we've already been asked to stop before we even got a chance to start
      // don't start now
      console.log('SendQueue asked to run after being told to stop. Will not run.');
      return;
    } else if (this.state == State.Running) {
      console.log('SendQueue asked to run but is already running (according to state). Will not re-run.');
      return;
    }
    this.state = State.Running;
    
    this.sendHandshake();
  }
  stop() {
    this.state = State.Stopped;
  }
  ack(sequenceNumber) {
  }
  fastRetransmit(ack) {
  }
  handshakeACK() {
    this.hasReceivedHandshakeACK = true;
  }
  sendHandshake() {
    if (!this.hasReceivedHandshakeACK) {
      // we haven't received a handshake ACK from the client, send another now
      // if the handshake hasn't been completed, then the initial sequence number
      // should be the current sequence number + 1
      let initialSequenceNumber = this.currentSequenceNumber + 1;
      let handshakePacket = ControlPacket.create(ControlPacket.types.Handshake);
      handshakePacket.payload.sequenceNumber = initialSequenceNumber;
      this.connection.writeBasePacket(handshakePacket);
    }
  }
  sendPacket(packet) {
    this.connection.writeBasePacket(packet);
  }
  sendNewPacketAndAddToSentList(newPacket, sequenceNumber) {
  }
  maybeSendNewPacket() {
  }
  maybeResendPacket() {
    // TODO - implement retransmits for reliable packets
  }
  isInactive(attemptedToSendPacket) {
  }
  deactivate() {
  }
  isFlowWindowFull() {
  }
};
