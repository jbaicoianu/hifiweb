export class Flags {
  constructor(values) {
    for (let i = 0; i < values.length; i++) {
      this[values[i]] = 1 << i;
    }
    return Object.freeze(this);
  }
  fromValue(value) {
    for (var k in this) {
      if (this[k] == value) return k;
    }
  }
};

