export class RingBuffer {
  constructor(size=65535) {
    this.size = size;
    this.buffer = new Float32Array(size);
    this.readoffset = 0;
    this.writeoffset = 0;
  }
  add(data) {
    for (let i = 0; i < data.length; i++) {
      let offset = (this.writeoffset + i) % this.size;
      if (offset == this.readoffset) {
        console.warn('Buffer overrun!', this);
      } else {
        this.buffer[offset] = data[i];
      }
    }
    this.writeoffset = (this.writeoffset + data.length) % this.size;
  }
  read(array, length=Infinity, writeoffset=0) {
    if (length == Infinity) {
      // Infinite length means just read any and all data which has been written to this buffer
      length = (this.writeoffset + this.size - this.readoffet) % this.size;
    }

    for (let i = 0; i < length; i++) {
      let readoffset = (this.readoffset + i) % this.size;
      array[i + writeoffset] = this.buffer[readoffset];
      this.buffer[readoffset] = 0;
    }
    this.readoffset = (this.readoffset + length) % this.size;
  }
}
