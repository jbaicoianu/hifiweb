const ArrayTypes = {
  'Uint8': Uint8Array,
  'Int8': Int8Array,
  'Uint16': Uint16Array,
  'Int16': Int16Array,
  'Uint32': Uint32Array,
  'Int32': Int32Array,
  'Float32': Float32Array,
  'Float64': Float64Array,
};
export class BinaryReader {
  constructor(data, offset) {
    this.setData(data, offset);
  }
  setData(data, offset) {
    if (data instanceof DataView) {
      this._data = data;
      this.littleEndian = true;
    } else if (data instanceof ArrayBuffer) {
      this._data = new DataView(data, offset);
      this.littleEndian = true;
    } else if (data instanceof Uint8Array) {
      this._data = new DataView(data.buffer, data.byteOffset);
      this.littleEndian = false;
    } else {
      console.warn('Unknown data type', data, this);
    }
    //this._offset = offset;
  }
  parse(schema, offset=0) {
//console.log('///', this._data, schema, offset, this);
    let data = parseBinaryData(this._data, schema, offset, this.littleEndian);
    for (var k in data) {
      this[k] = data[k];
    }
  }
  read(type, byteOffset) {
    return readPrimitive(this._data, type, byteOffset, this.littleEndian);
  }
  readArray(type, byteOffset, length) {
//console.log('read array', type, byteOffset, length);
    return readPrimitiveArray(this._data, type, byteOffset, length, this.littleEndian);
  }
  readString(byteOffset, length) {
    let arr = readPrimitiveArray(this._data, 'Uint8', byteOffset, length, this.littleEndian);
    return new TextDecoder("utf-8").decode(arr);
  }
};

export function hexdumpstr(data, title='', ) {
  let arr = data;
  if (data instanceof DataView || data instanceof ArrayBuffer) {
    arr = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  let offset = 0;
  let line = offset.toString().padStart(4, 0) + ': ';
  let ascii = '';
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && i % 8 == 0) {
      line += '  ';
      if (i % 16 == 0) {
        line += ' | ' + ascii + ' |\n' + i.toString().padStart(4, 0) + ': ';
        ascii = '';
      }
    }
    let b = arr[i].toString(16);
    let a = (arr[i] < 32 || arr[i] >= 128 ? '.' : String.fromCharCode(arr[i]));
    if (b.length == 1) b = '0' + b;
    line += b;
    ascii += a;
    if (i > 0 && i % 2 == 1) line += ' ';
  }
  if (line != '') {
    if (ascii != '') {
      line = line.padEnd(Math.ceil(line.length / 71) * 71 - 19) + ' | ' + ascii.padEnd(16) + ' |'
    }
    return line;
  }
}
export function hexdump(data, title='', ) {
  console.log('==========', title, '==========');
  console.log(hexdumpstr(data, title));
}

export function parseBinaryData(data, schema, offset, littleEndian) {
  let parsed = {};
  for (let k in schema) {
    let type = schema[k];
    let idx = type.indexOf('['); 
    if (idx != -1) {
      let num = parseInt(type.substring(idx+1, type.indexOf(']')));
      type = type.substr(0, idx);

      parsed[k] = readPrimitiveArray(data, type, offset, num, littleEndian);
      offset += sizeof(type) * num;
    } else {
      parsed[k] = readPrimitive(data, type, offset, littleEndian);
      offset += sizeof(type);
    }
  }
  return parsed;
}

function sizeof(type) {
  switch(type) {
    case 'Int8':
    case 'Uint8':
      return 1;
    case 'Int16':
    case 'Uint16':
      return 2;
    case 'Int32':
    case 'Uint32':
      return 4;
  }
  // unknown, default to one byte
  console.warn('Unknown type in sizeof()', type);
  return 1;
}
function readPrimitive(data, type, byteOffset, littleEndian) {
  if (typeof data['get' + type] == 'function') {
    //console.log('read', type, byteOffset, this._data);
    return data['get' + type](byteOffset, littleEndian);
  } else {
    console.warn('Unknown type', type);
  }
  return null;
}
function readPrimitiveArray(data, type, byteOffset, length, littleEndian) {
  // Allocate a new TypedArray of the given type, and populate its values

  // FIXME - this way of referencing the TypedArray types is hacky. We should keep an extendable mapping instead

  // TODO - instead of allocating a new array, we could point the array to the same ArrayBuffer with the right offset
  //        and avoid allocation. This might cause problems with byte alignment, though.

//console.log('deh', data, type, byteOffset, length, littleEndian, window[type + 'Array']);
  let arr = new window[type + 'Array'](length); 
  let size = sizeof(type);
  // little endian
  for (let i = 0; i < length; i++) {
    arr[i] = readPrimitive(data, type, byteOffset + (i) * size);
  }
  return arr;
}
