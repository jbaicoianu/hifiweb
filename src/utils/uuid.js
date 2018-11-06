export function toRfc4122(uuid) {
  let arr = new Uint8Array(16);
  let dv = new DataView(arr.buffer);

  let parts = uuid.split('-');
//console.log(parts, parseInt(parts[0], 16),parseInt(parts[1] + parts[2], 16),parseInt(parts[3] + parts[4].substring(0, 4), 16));
  dv.setUint32(0, parseInt(parts[0].padStart(8, '0'), 16), false);
  dv.setUint16(4, parseInt(parts[1].padStart(4, '0'), 16), false);
  dv.setUint16(6, parseInt(parts[2].padStart(4, '0'), 16), false);

  let lastpart = parts[3].padStart(4, '0') + parts[4].padStart(12, '0');
//console.log(lastpart);
  for (let i = 0; i < 8; i++) {
    dv.setUint8(8 + i, parseInt(lastpart.substring(i * 2, i * 2 + 2), 16));
  }
  return arr;
}
