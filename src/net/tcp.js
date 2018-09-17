import { BinaryReader, Flags }from './utils.js';

export const TCPFlags = new Flags([
  'FIN',
  'SYN',
  'RST',
  'PSH',
  'ACK',
  'URG'
]);
export class TCPSegment extends BinaryReader {
  constructor(data, offset) {
    super(data, offset);
//hexdump(this._data, 'TCP segment');
    this.parse({
      srcPort: 'Uint16',
      dstPort: 'Uint16',
      seq: 'Uint32',
      ack: 'Uint32',
      offsetFlags: 'Uint16',
      windowSize: 'Uint16',
      checksum: 'Uint16',
      urgent: 'Uint16',
    });
    this.dataOffset = this.offsetFlags >> 12;
    this.flags = {
      URG: this.offsetFlags & TCPFlags.URG,
      ACK: this.offsetFlags & TCPFlags.ACK,
      PSH: this.offsetFlags & TCPFlags.PSH,
      RST: this.offsetFlags & TCPFlags.RST,
      SYN: this.offsetFlags & TCPFlags.SYN,
      FIN: this.offsetFlags & TCPFlags.FIN,
    };
    // TODO - right now we're just skipping right over the options section, but we could always parse them here if needed
    let headerLength = this.dataOffset * 4;
    this.data = this.readArray('Uint8', headerLength, this._data.byteLength - headerLength);
  }
  getString() {
    return new TextDecoder("utf-8").decode(this.data);
  }
};

