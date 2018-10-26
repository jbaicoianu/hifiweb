# HifiWeb
Preliminary efforts to bring High Fidelity functionality to the web.

client
  - nodes
    - domain
    - avatar
    - audio
    - messages
    - entity
    - entityscript
    - assets
  - avatar
    - position
    - orientation
  - world
    - environment
    - remoteplayers


HifiWebClient {
  connectToRelay()
  setDomain(domain)
}

HifiNode {
  sendPacket(packet)
  addPacketHandler(type, callback)
}
