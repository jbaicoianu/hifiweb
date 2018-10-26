import { BinaryReader, Enum, parseBinaryData, hexdump, hexdumpstr } from './utils.js';

class StructViewer extends HTMLElement {
  constructor() {
    super();
    let src = this.getAttribute('src');
    if (src) {
      this.load(src);
    }
  }
  add(value) {
console.log('add value', value);
    let structview = document.createElement('struct-view');
    structview.target = value;
    this.appendChild(structview);
  }
}
class StructView extends HTMLElement {
  set target(target) {
    //console.log(record);
/*
    if (record.frame) {
      let frameheader = record.frame.readArray('Uint8', 0, record.frame.headerLength);
console.log(' - ', frameheader);
      let frameel = document.createElement('pre');
      frameel.innerHTML = hexdumpstr(frameheader);
      this.appendChild(frameel);
    }
*/
    let data = target.getData(),
        attrs = target.getAttributes();

    let segments = {};
    let idx = 0;
    for (let k in attrs) {
      let size = attrs[k].size;
      let name = k + ': ' + target[k];
      segments[name] = [idx, idx + size];
      idx += size;
    }
console.log('do it!', data, segments);

    this.hexdumpSegments(data, segments);
  }

  hexdumpSegments(data, segments) {
    this.segments = {};
    let segnames = Object.keys(segments);

    let hex = document.createElement('div'),
        ascii = document.createElement('div');

    hex.className = 'hex';
    ascii.className = 'ascii';

    this.appendChild(hex);
    this.appendChild(ascii);

    let segment = -1;
    let arr = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    let seghex, segascii;

    for (let i = 0; i < arr.byteLength; i++) {
      let segname = segnames[segment];
      if (segment == -1 || (segments[segname] && i >= segments[segname][1])) {
        // New segment - create a new span for it
        segment++;
        segname = segnames[segment] || 'payload';
        seghex = document.createElement('span'),
        segascii = document.createElement('span');

        seghex.className = 'segment';
        segascii.className = 'segment';

        seghex.title = segname;
        segascii.title = segname;

        hex.appendChild(seghex);
        ascii.appendChild(segascii);

        this.segments[segname] = {
          hex: seghex,
          ascii: segascii
        };

        seghex.addEventListener('mouseover', (ev) => this.selectSegment(segname));
        segascii.addEventListener('mouseover', (ev) => this.selectSegment(segname));

        seghex.addEventListener('mouseout', (ev) => this.selectSegment(null));
        segascii.addEventListener('mouseout', (ev) => this.selectSegment(null));
      }

      let b = arr[i]
      seghex.innerHTML += b.toString(16).padStart(2, 0) + ' ';
      segascii.innerHTML += (b < 33 || b >= 128 ? '.' : String.fromCharCode(b)) + ' ';

      if (i % 16 == 15) {
        seghex.innerHTML += '<br>';
        segascii.innerHTML += '<br>';
      }
    }
  }

  selectSegment(segname) {
console.log('select', segname);
    if (this.selectedsegment && segname != this.selectedsegment) {
      this.segments[this.selectedsegment].hex.classList.remove('selected');
      this.segments[this.selectedsegment].ascii.classList.remove('selected');
    }
    if (this.segments[segname]) {
      this.selectedsegment = segname;
      this.segments[segname].hex.classList.add('selected');
      this.segments[segname].ascii.classList.add('selected');
    }
  }
}
customElements.define('struct-viewer', StructViewer);
customElements.define('struct-view', StructView);

