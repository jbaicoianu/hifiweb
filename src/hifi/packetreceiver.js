export class PacketReceiver {
  constructor() {
    this.listeners = {};
  }
  registerListener(type, handler) {
    if (!(type in this.listeners)) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(handler);
  }
  handlePacket(packet) {
    let type = packet.packetType;
    let num = 0;
    if (this.listeners[type]) {
      this.listeners[type].forEach(l => { l(packet.payload); num++; });
    }
    return num;
  }
};

