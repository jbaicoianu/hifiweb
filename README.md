# HifiWeb
Preliminary efforts to bring High Fidelity functionality to the web.

## Developer Notes
This project consisted of two parallel development projects - the HifiWeb client, and a webrtc-to-hifi relay server.  Both projects required us to quickly obtain familiarity with High Fidelity's underlying network protocol, which turned out to be a larger undertaking than we initially thought.  

The bulk of the work involved in creating the client once the relay was functional consisted of writing a binary protocol handler in JavaScript to handle HiFi's network packets.  We started off implementing the packets necessary for negotiating the connection handshake process.  Once we finished that we started implementing more packets - AvatarData, SelectedAudioFormat, MixedAudio, etc.  It took us about a month to get the first working session where a HiFi user was able to tell that a HifiWeb user was in the same room, and they could see each other moving about.

From there we started implementing VOIP.  Playing back HiFi's MixedAudio packets turned out not to be too hard, but the voice input side of things caused us some problems due to browser inconsistencies with the WebAudio API.  The solution we ended up with uses an AudioWorklet to handle the audio on a separate thread, which leads to better performance when the app is busy doing other things like rendering the world.  We ran into some issues with third party audio resampling libraries introducing sound artifacts, but once we realized the problem and got all the audio parameters dialed in, the resulting audio finally came through crystal clear.

In the course of developing the relay and the client packet handling library, we developed some debug tools to help us along the way.  A packet visualizer lets us see the flow of packets that are sent between the client and the server.  We can drill down to conversations between the client and each assignment-client node, and inspect the order and contents of individual packets as they're exchanged.  This proved to be invaluable for debugging connection issues and implementing parsers for the various types of packets High Fidelity supports.


## Basic App Structure
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



