import { BinaryReader } from './utils.js';
import { IPv4Datagram } from './ipv4.js';

export class EthernetFrame extends BinaryReader {
  constructor(data, offset) {
    super(data, offset);
    this.headerLength = 14;
    this.crcLength = 4;
    this.parse({
      srcaddrBytes: 'Uint8[6]',
      dstaddrBytes: 'Uint8[6]',
      ethertype: 'Uint16',
      payload: 'Uint8[' + (this._data.byteLength - this.headerLength - this.crcLength)+ ']',
      //checksum: 'Uint32'
    });
/*
    this.setHeaderSchema({
      srcaddrBytes: 'Uint8[6]',
      dstaddrBytes: 'Uint8[6]',
      ethertype: 'Uint16'
    });
    this.setFooterSchema({
      checksum: 'Uint32'
    });
*/
    this.srcaddr = this.parseMacAddress(this.srcaddrBytes);
    this.dstaddr = this.parseMacAddress(this.dstaddrBytes);
//hexdump(this._data, 'EthernetFrame');

//console.log('Ethernet frame', this);
    try {
      this.datagram = new IPv4Datagram(this.payload);
    } catch (e) {
      console.warn('Failed to parse datagram', this.payload, this, e);
    }
  }
  parseMacAddress(bytes) {
    let parts = [];
    for (let i = 0; i < bytes.length; i++) {
      parts[i] = bytes[i].toString(16);
      if (parts[i].length == 1) parts[i] = '0' + parts[i];
    }
    return parts.join(':');
  }
};

