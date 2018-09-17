import { BinaryReader } from './utils';
import { EthernetFrame } from './ethernet';

export class PCAPReader {
  constructor(url) {
    this.records = [];
    if (url) {
      this.load(url);
    }
  }
  load(url) {
    console.log('fetching', url);
    return fetch(url).then(d => d.arrayBuffer())
              .then(ab => this.parse(ab));
  }
  parse(data) {
    return new Promise((resolve, reject) => {
      this.globalHeader = new PCAPGlobalHeader(data, 0);
      console.log('global PCAP header', this.globalHeader);

      let offset = this.globalHeader.length();

      while (offset < data.byteLength) {
        try {
          let record = new PCAPRecord(data, offset);
          offset += record.length();
          this.records.push(record);
        } catch (e) {
          console.warn('Failed to parse record', data, offset, e);
          break;
        }
      }
      resolve(this.records);
    });
  }
};
export class PCAPGlobalHeader extends BinaryReader {
  constructor(data, offset) {
    super(data, offset);

    this.parse( {
      magicNumber: 'Uint32',
      majorVersion: 'Int16',
      minorVersion: 'Int16',
      timezone: 'Int32',
      sigfigs: 'Uint32',
      snaplen: 'Uint32',
      network: 'Uint32'
    });
  }
  length() {
    return 24;
  }
};
export class PCAPRecord extends BinaryReader {
  constructor(data, offset) {
    super(data, offset);
    this.parse({
      ts_sec: 'Uint32',
      ts_usec: 'Uint32',
      incl_len: 'Uint32',
      orig_len: 'Uint32',
    });
    //let framedata = new DataView(this._data.buffer, this._data.byteOffset + 16, this.incl_len);
    let framedata = data.slice(offset + 16, offset + this.incl_len + 16 + 4);
    this.frame = new EthernetFrame(framedata);
  }
  length() {
    return this.incl_len + 16;
  }
};
export class PCAPTimestamp {
  constructor(sec, usec) {
    this.sec = sec;
    this.usec = usec;
  }

  diff(ts) {
    let diff_sec = ts.sec - this.sec,
        diff_usec = ts.usec - this.usec;
    if (diff_usec < 0) {
      diff_sec -= 1;
      diff_usec += 1e6;
    }
    return diff_sec + (diff_usec / 1e6);
  }
};
