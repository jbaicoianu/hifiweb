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
    if (this.listeners[type]) {
      this.listeners[type].forEach(l => l(packet));
    }
  }
};

