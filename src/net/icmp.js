import { BinaryReader } from './utils.js';

export class ICMPSegment extends BinaryReader {
  constructor(data, offset) {
    super(data, offset);
    this.parse({
      type: 'Uint8',
      code: 'Uint8',
      checksum: 'Uint16',
    });
    this.payload = this.readArray('Uint8', 4, data.byteLength - 4);
    if (ICMPMessageTypes[this.type]) {
      this.message = new ICMPMessageTypes[this.type](this.payload);
    } else {
      console.log('Unknown ICMP message type', this.type, this);
    }
  }
  getString() {
    return new TextDecoder("utf-8").decode(this.payload);
  }
  getHex() {
    return hexdump(this.payload);
  }
};
export class ICMPMessage extends BinaryReader {
  constructor(data) {
    super(data);
    this.data = data;
  }
  getString() {
    return new TextDecoder("utf-8").decode(this.data);
  }
};
export class ICMPEchoMessage extends ICMPMessage {
  constructor(data) {
    super(data);
    this.parse({
      id: 'Uint16',
      seq: 'Uint16',
      data: 'Uint8[' + (data.byteLength - 4) + ']'
    });
  }
};
export class ICMPDestinationUnreachableMessage extends ICMPMessage {};
export class ICMPTTLExceededMessage extends ICMPMessage {};
export class ICMPParameterProblemMessage extends ICMPMessage {};
export class ICMPRedirectMessage extends ICMPMessage {
  constructor(data) {
    super(data);
    this.parse({
      gateway: 'Uint32',
      data: 'Uint8[' + (data.byteLength - 4) + ']'
    });
  }
};
export class ICMPTimestampMessage extends ICMPMessage {
  constructor(data) {
    super(data);
    this.parse({
      originateTimestamp: 'Uint32',
      receiveTimestamp: 'Uint32',
      transmitTimestamp: 'Uint32',
    });
  }
};

export const ICMPMessageTypes = {
  0: ICMPEchoMessage,
  3: ICMPDestinationUnreachableMessage,
  5: ICMPRedirectMessage,
  8: ICMPEchoMessage,
  11: ICMPTTLExceededMessage,
  12: ICMPParameterProblemMessage,
  13: ICMPTimestampMessage,
  14: ICMPTimestampMessage,
};
