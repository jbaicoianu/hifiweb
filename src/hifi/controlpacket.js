import * as struct from '../utils/struct.js';
import { Enum } from '../utils/enum.js';
import { Flags } from '../utils/flags.js';

const CONTROL_BIT_MASK = 1 << 31;

class ControlPacket extends struct.define({
  controlBitAndType: new struct.Uint32_t,
  //payload: new struct.Struct_t
}) {
  read(data, offset) {
    this._data = data;
    let buf = (data instanceof DataView ? new DataView(data.buffer, offset + data.byteOffset) : new DataView(data, offset));
    this.controlBitAndType = buf.getUint32(offset, true);
    this.controlBit = this.controlBitAndType >>> 31 & 1
    this.type = (this.controlBitAndType & ~CONTROL_BIT_MASK) >>> 16;

    if (this.type && ControlPacketClasses[this.type]) {
      this.payload = new ControlPacketClasses[this.type]();
      this.payload.read(data, offset + 4);
    }
  }
  write(data, offset) {
    if (!data) {
      data = new ArrayBuffer(this.headerLength + this.payload.size());
      offset = 0;
    }
    this.controlBitAndType = CONTROL_BIT_MASK | (this.type << 16)
    let buf = (data instanceof DataView ? new DataView(data.buffer, offset + data.byteOffset) : new DataView(data, offset));
    buf.setUint32(0, this.controlBitAndType, true);

    this.payload.write(data, offset + this.headerLength);

    return data;
  }
  updateControlBitAndType() {
    this.controlBitAndType = CONTROL_BIT_MASK | (this.type << 16)
  }
  get headerLength() {
    return 4;
  }
  static create(type, data) {
    let packet = new ControlPacket();
    packet.type = type;
    packet.updateControlBitAndType();

    if (packet.type && ControlPacketClasses[packet.type]) {
      packet.payload = new ControlPacketClasses[packet.type]();
    }

    return packet;
  }
  static fromReceivedPacket(data) {
    let packet = new ControlPacket();
    try {
      packet.read(data);
    } catch (e) {
      console.log('failed to parse packet', packet, data, e);
    }
    return packet;
  }
};
ControlPacket.types = new Flags([
  'ACK',
  'Handshake',
  'HandshakeACK',
  'HandshakeRequest'
]);

class ACKPacket extends struct.define({
  sequenceNumber: new struct.Uint32BE_t
}) { };
class HandshakePacket extends struct.define({
  sequenceNumber: new struct.Uint32BE_t
}) { };
class HandshakeACKPacket extends struct.define({
  sequenceNumber: new struct.Uint32BE_t
}) { };
class HandshakeRequestPacket extends struct.define({
}) { };

const ControlPacketClasses = {};
ControlPacketClasses[ControlPacket.types.ACK] = ACKPacket;
ControlPacketClasses[ControlPacket.types.Handshake] = HandshakePacket;
ControlPacketClasses[ControlPacket.types.HandshakeACK] = HandshakeACKPacket;
ControlPacketClasses[ControlPacket.types.HandshakeRequest] = HandshakeRequestPacket;

export {
  ControlPacket
};
