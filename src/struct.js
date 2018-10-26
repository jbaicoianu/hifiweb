export class Struct {
  constructor(values) {
    let attrs = this.getAttributes();
    for (let k in attrs) {
      //Object.defineProperty(this, k, {get: this.getValue, set: this.setValue, configurable: true});
      if (values && k in values) {
        this[k] = values[k];
      } else {
        this[k] = attrs[k].value;
      }
    }
    //console.log('make a struct', this, attrs);
  }
  size(value) {
    let attrs = this.getAttributes();
    let size = 0;
    if (!value) value = this;
    for (let k in attrs) {
      size += attrs[k].size(value[k]);
    }
    return size;
  }
  getData() {
    return this._data;
  }
  getValue() {
  }
  setValue(val) {
  }
  map(data, offset) {
    console.log('Mapping struct to memory:', this, data, offset);
    return this;
  }
  write(data, offset) {
    if (!data) {
      data = new ArrayBuffer(this.size());
      offset = 0;
    }
    if (typeof offset == 'undefined') {
      offset = 0;
    }
    //console.log('write struct to memory', this, data, offset, data.byteOffset, data.byteLength);
    let buf = (data instanceof DataView ? new DataView(data.buffer, offset + data.byteOffset/*, data.byteLength - data.byteOffset*/) : new DataView(data, offset/*, this.size()*/));
    this._data = buf;
    //console.log(buf, this.size());
    let attrs = this.getAttributes();
    let idx = 0;
    for (let k in attrs) {
      attrs[k].write(buf, idx, this[k]);
      //console.log(' -', k, this[k]);
      idx += attrs[k].size(this[k]);
    }
    return data;
  }
  read(data, offset=0) {
    //console.log('read struct from memory', this, data, offset);
    let attrs = this.getAttributes();
    let idx = 0;
    if (!offset) offset = 0;
    //let buf = new DataView(data, offset);
//console.log('huh', data, data.buffer, offset, data.byteOffset, this.size, data instanceof DataView);
    let buf = (data instanceof DataView ? new DataView(data.buffer, offset + data.byteOffset) : new DataView(data, offset));
    this._data = buf;
//console.log('read', this, data, buf);
    for (let k in attrs) {
      this[k] = attrs[k].read(buf, idx);
//      console.log(' -', k, this[k]);
      idx += attrs[k].size(this[k]);
    }
    return this;
  }
};
class ByteRange_t {
  constructor(byteLength) {
//console.log('byterange constructor', this, byteLength);
    this._value = 0;
    this._byteLength = byteLength;
  }
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v;
  }
  size(value) {
    return this._byteLength;
  }
  write(data, offset, value) {
  }
  read(data, offset) {
  }
}
export class Uint8_t extends ByteRange_t {
  constructor(value) {
    super(1);
  }
  write(data, offset, value) {
    data.setUint8(offset, value);
  }
  read(data, offset) {
    return data.getUint8(offset);
  }
};
export class Int8_t extends ByteRange_t {
  constructor(value) {
    super(1);
  }
  write(data, offset, value) {
    data.setInt8(offset, value);
  }
  read(data, offset) {
    return data.getInt8(offset);
  }
};
export class Uint16_t extends ByteRange_t {
  constructor(value) {
    super(2);
  }
  write(data, offset, value) {
    data.setUint16(offset, value, true);
  }
  read(data, offset) {
    return data.getUint16(offset, true);
  }
};
export class Uint16BE_t extends ByteRange_t {
  constructor(value) {
    super(2);
  }
  write(data, offset, value) {
    data.setUint16(offset, value, false);
  }
  read(data, offset) {
    return data.getUint16(offset, false);
  }
};
export class Int16_t extends ByteRange_t {
  constructor(value) {
    super(2);
  }
  write(data, offset, value) {
    data.setInt16(offset, value, true);
  }
  read(data, offset) {
    return data.getInt16(offset, true);
  }
};
export class Int16BE_t extends ByteRange_t {
  constructor(value) {
    super(2);
  }
  write(data, offset, value) {
    data.setInt16(offset, value, false);
  }
  read(data, offset) {
    return data.getInt16(offset, false);
  }
};
export class Uint32_t extends ByteRange_t {
  constructor(value) {
    super(4);
  }
  write(data, offset, value) {
    //console.log('write it', data, offset, value);
    data.setUint32(offset, value, true);
  }
  read(data, offset) {
    return data.getUint32(offset, true);
  }
};
export class Uint32BE_t extends ByteRange_t {
  constructor(value) {
    super(4);
  }
  write(data, offset, value) {
    //console.log('write it', data, offset, value);
    data.setUint32(offset, value, false);
  }
  read(data, offset) {
    return data.getUint32(offset, false);
  }
};
export class Int32_t extends ByteRange_t {
  constructor(value) {
    super(4);
  }
  write(data, offset, value) {
    data.setInt32(offset, value, true);
  }
  read(data, offset) {
    return data.getInt32(offset, true);
  }
};
export class Int32BE_t extends ByteRange_t {
  constructor(value) {
    super(4);
  }
  write(data, offset, value) {
    data.setInt32(offset, value, false);
  }
  read(data, offset) {
    return data.getInt32(offset, false);
  }
};
export class Uint64_t extends ByteRange_t {
  constructor(value) {
    super(8);
    this._value = 0n;
  }
  write(data, offset, value) {
    let bigint = (typeof value == 'bigint');
    let part1 = (bigint ? (value >> 32n) : (value >> 32)),
        part2 = (bigint ? (value & 0xffffffffn) : (value & 0xffffffff));;
    
    data.setUint32(offset, Number(part1));
    data.setUint32(offset + 4, Number(part2));
/*
    let part1 = value >> (bigint ? 56n : 56),
        part2 = value >> (bigint ? 48n : 48),
        part3 = value >> (bigint ? 40n : 40),
        part4 = value >> (bigint ? 32n : 32),
        part5 = value >> (bigint ? 24n : 24),
        part6 = value >> (bigint ? 16n : 16),
        part7 = value >> (bigint ? 8n : 8),
        part8 = value >> (bigint ? 0n : 0);
*/
  }
  read(data, offset) {
    let part1 = BigInt(data.getUint32(offset)),
        part2 = BigInt(data.getUint32(offset + 4));

    return part1 << 32n | part2;
  }
};
export class Int64_t extends ByteRange_t {
  constructor(value) {
    super(8);
  }
  write(data, offset, value) {
    
    console.log('TODO - implement Int64_t.write()', this);
    data.setInt64(offset, value);
  }
  read(data, offset) {
    let part1 = BigInt(data.getInt32(offset)),
        part2 = BigInt(data.getInt32(offset + 4));

    return part1 << 32n | part2;
  }
};
export class Uint128_t extends ByteRange_t {
  constructor(value) {
    super(16);
  }
  write(data, offset, value) {
    console.log('TODO - implement Uint128t.write()', this);
  }
  read(data, offset) {
    let part1 = BigInt(data.getUint32(offset)),
        part2 = BigInt(data.getUint32(offset + 4));
        part3 = BigInt(data.getUint32(offset + 8)),
        part4 = BigInt(data.getUint32(offset + 12));

    return part1 << 96n | part2 << 64n | part3 << 32n | part4;
  }
};
export class Int128_t extends ByteRange_t {
  constructor(value) {
    super(16);
  }
  write(data, offset, value) {
    console.log('TODO - implement Int128t.write()', this);
  }
  read(data, offset) {
    let part1 = BigInt(data.getInt32(offset)),
        part2 = BigInt(data.getInt32(offset + 4)),
        part3 = BigInt(data.getInt32(offset + 8)),
        part4 = BigInt(data.getInt32(offset + 12));

    return part1 << 96n | part2 << 64n | part3 << 32n | part4;
  }
};
export class Hex128_t extends ByteRange_t {
  constructor(value) {
    super(16);
  }
  write(data, offset, value) {
    console.log('TODO - implement UUID_t.write()', this);
  }
  read(data, offset) {
    let str = '';
    for (let i = 0; i < 16; i++) {
      str += data.getUint8(offset + i).toString(16);
    }

    return str;
  }
};
export class UUID_t extends ByteRange_t {
  constructor(value) {
    super(16);
  }
  write(data, offset, value) {
    console.log('TODO - implement UUID_t.write()', this);
  }
  read(data, offset) {
    let part1 = data.getUint32(offset),
        part2 = data.getUint16(offset + 4),
        part3 = data.getUint16(offset + 6),
        part4 = data.getUint16(offset + 8),
        part5 = data.getUint16(offset + 10),
        part6 = data.getUint32(offset + 12);

    return part1.toString(16) + '-' + part2.toString(16) + '-' + part3.toString(16) + '-' + part4.toString(16) + '-' + part5.toString(16) + part6.toString(16);
  }
};
export class Float_t extends ByteRange_t {
  constructor(value) {
    super(4);
  }
  write(data, offset, value) {
    data.setFloat32(offset, value);
  }
  read(data, offset) {
    return data.getFloat32(offset);
  }
};
export class Double_t extends ByteRange_t {
  constructor(value) {
    super(8);
  }
  write(data, offset, value) {
    data.setFloat64(offset, value);
  }
  read(data, offset) {
    return data.getFloat64(offset);
  }
};
export class Boolean_t extends ByteRange_t {
  constructor(value) {
    super(1);
  }
  write(data, offset, value) {
    data.setUint8(offset, !!value);
  }
  read(data, offset) {
    return data.getUint8(offset) != 0;
  }
};
export class Char_t extends ByteRange_t {
  constructor(value) {
    super(1);
  }
  write(data, offset, value) {
    data.setUint8(offset, value);
  }
  read(data, offset) {
    return String.fromCharCode(data.getUint8(offset));
  }
};
export class String_t extends ByteRange_t {
  constructor(length=0) {
    if (typeof length == 'string') {
      super(length.length);
      this.value = length;
    } else {
      super(length);
      this.value = '';
    }
  }
  size(value) {
console.log('string length', value.length);
    return value.length;
  }
  write(data, offset, value) {
    console.log('FIXME - implement String_t.write()');
    let length = data.getUint16(offset, true),
        bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = data.getUint8(offset + 2 + i);
    }
    console.log(bytes);
    return bytes;
  }
  read(data, offset, value) {
console.log('DO IT', data, offset);
    let length = data.getUint32(offset, true);
console.log('read string', length);
    let bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = data.getUint8(offset + 4 + i);
    }
    console.log('read string', bytes);
    return new TextDecoder("utf-8").decode(bytes);
  }
};
export class Struct_t extends ByteRange_t {
}
export class StructList_t {
  constructor(type) {
    this.type = type;
    this.value = [];
  }
  size(value) {
//console.log('struct length', value.length, value);
    let size = 0;
    if (value) {
      for (let i = 0; i < value.length; i++) {
        size += value[i].size();
      }
    }
    return size;
  }
  read(data, offset, length) {
return;
    // Read data and allocate new types as we go
console.log('read structlist', data, offset, length, this.type);
    if (!length) length = data.byteLength;
    let i = 0;
    while (i < length) {
      let newval = new this.type;
      newval.read(data, offset + i);
      this.value.push(newval);
      i += newval.size(this.value[i]);
    }
console.log('read them', this.value);
  }
  write(data, offset, values) {
//console.log('write structlist', data, offset, values);
    if (!offset) offset = 0;
    let size = 0;
    if (values) {
      for (let i = 0; i < values.length; i++) {
        values[i].write(data, offset + size);
        size += values[i].size();
      }
    }
//console.log('total size of structlist:', size);
    
  }
}

export function define(attrs) {
  console.log('define new struct');
  return class extends Struct {
    getAttributes() {
      let allattrs = {};
      for (let k in attrs) {
        if (attrs[k] instanceof Struct_t && this[k]) {
console.log(this, k, attrs[k]);
          let childattrs = this[k].getAttributes();
          for (let j in childattrs) {
            allattrs[j] = childattrs[j];
          }
        } else {
          allattrs[k] = attrs[k];
        }
      }
      return allattrs;
    }
  };
}

export class DataStream {

  constructor() {
    this._data
  }
  read(type) {
  }
}
