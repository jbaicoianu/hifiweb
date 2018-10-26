export class Enum {
  constructor(values) {
    for (let i = 0; i < values.length; i++) {
      this[values[i]] = i;
    }
    return Object.freeze(this);
  }
  fromValue(value) {
    for (var k in this) {
      if (this[k] == value) return k;
    }
  }
};

