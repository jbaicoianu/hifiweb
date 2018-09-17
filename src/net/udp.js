import { BinaryReader } from './utils.js';

export class UDPSegment extends BinaryReader {
  constructor(data, offset) {
    super(data, offset);
    this.parse({
      srcPort: 'Uint16',
      dstPort: 'Uint16',
      length: 'Uint16',
      checksum: 'Uint16'
    });
//console.log('UDP segment', this);
    this.payload = this.readArray('Uint8', 8, this.length - 8);
  }
  getString() {
    return new TextDecoder("utf-8").decode(this.payload);
  }
  getHex() {
    return hexdump(this.payload);
  }
};

