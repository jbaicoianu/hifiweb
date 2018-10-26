import { PacketReceiver } from './packetreceiver.js';
import { HifiNode, NodeTypeMap } from './node.js';
import { HifiAvatar } from './avatar.js';
import * as hmac from '../hmac.js';

console.log('hmac!', hmac);
window.hmac = hmac;

export class HifiClient {
  constructor() {
    this.nodes = {};
    this.relayserver = 'ws://hifi.janusvr.com:8118';
    this.domain = 'hifi://janusvr';

    this.startTime = new Date().getTime();
/*
    let receiver = this.receiver = new PacketReceiver();
    receiver.registerListener(HifiPacketType.ICEPing, (data) => {
      //console.log('handle ping', data);
    });
    receiver.registerListener(HifiPacketType.STUNResponse, (data) => {
      //console.log('handle STUNResponse', data);
    });
    receiver.registerListener(HifiPacketType.DomainConnectRequest, (data) => this.handleDomainConnectRequest(data));
    receiver.registerListener(HifiPacketType.DomainList, (data) => this.handleDomainList(data));
    receiver.registerListener(HifiPacketType.MixedAudio, (data) => this.handleAudioPacket(data));

    this.packetdebugger = document.createElement('struct-viewer');
    document.body.appendChild(this.packetdebugger);

    this.packets = hifipackets;
*/

    this.avatar = new HifiAvatar();

    this.connectToRelay();
  }

  connectToRelay() {
    console.log('Starting connection to hifi relay');
    this.webrtcoptions = {};
    this.peerconnection = null;
    this.channels = {
      domain: null,
      audio: null,
      avatar: null,
      entity: null,
      entityscript: null,
      message: null,
      asset: null,
    };
    this.remoteCandidates = [];
    this.signalserver = new WebSocket(this.relayserver);
    this.signalserver.addEventListener('message', (ev) => this.handleSignalMessage(ev));
  }

  connectToDomain(domain) {
    var msg ={
      type: 'domain',
      domain_name: domain
    };
    this.signalserver.send(JSON.stringify(msg));
  }

  handleSignalMessage(event) {
    var msg = JSON.parse(event.data);
    //console.log("message", msg);

    switch (msg.type) {
      case 'candidate':
        if (msg.candidate && msg.candidate.candidate) {
          if (!this.hasAnswer) {
            this.remoteCandidates.push(msg.candidate);
          } else {
            console.log("Received ICE candidate", msg.candidate);
            this.peerconnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        }
        break;
      case 'answer':
        console.log("answer");
        this.peerconnection.setRemoteDescription(new RTCSessionDescription(msg))
        .then(() => {
          this.hasAnswer = true;
          var i = 0;
          for (i = 0; i < this.remoteCandidates.length; i++) {
            this.peerconnection.addIceCandidate(new RTCIceCandidate(this.remoteCandidates[i]));
          }
        });
        break;
      case 'connected':
        //Send Domain Name to relay for lookup
        this.connectToDomain(this.domain);

        this.peerconnection = new RTCPeerConnection({
          iceServers: [{
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
              "stun:stun3.l.google.com:19302",
              "stun:stun4.l.google.com:19302"
            ]}]}, this.webrtcoptions);
        console.log('Created peer connection', this.peerconnection);

        let nodes = this.nodes;
/*
        let dataConstraint = {};

        channels.domain = this.peerconnection.createDataChannel('domain_server_dc', dataConstraint);
        channels.domain.addEventListener('message', (ev) => this.handleDomainPacket(ev));

        channels.audio = this.peerconnection.createDataChannel('audio_mixer_dc', dataConstraint);
        channels.audio.addEventListener('message', (ev) => this.handleAudioPacket(ev));

        channels.avatar = this.peerconnection.createDataChannel('avatar_mixer_dc', dataConstraint);
        channels.avatar.addEventListener('message', (ev) => this.handleAvatarPacket(ev));

        channels.entity = this.peerconnection.createDataChannel('entity_server_dc', dataConstraint);
        channels.entity.addEventListener('message', (ev) => this.handleEntityPacket(ev));

        channels.entityscript = this.peerconnection.createDataChannel('entity_script_server_dc', dataConstraint);
        channels.entityscript.addEventListener('message', (ev) => this.handleEntityScriptPacket(ev));

        channels.message = this.peerconnection.createDataChannel('messages_mixer_dc', dataConstraint);
        channels.message.addEventListener('message', (ev) => this.handleMessagePacket(ev));

        channels.asset = this.peerconnection.createDataChannel('asset_server_dc', dataConstraint);
        channels.asset.addEventListener('message', (ev) => this.handleAssetPacket(ev));
*/

        nodes.domain = new HifiNode('domain', this.peerconnection);

        //nodes.domain.addEventListener('receive', (ev) => console.log('der', ev));
        nodes.domain.addPacketHandler('DomainList', (packet) => this.handleDomainList(packet));

        nodes.avatar = new HifiNode('avatar', this.peerconnection);
        nodes.audio = new HifiNode('audio', this.peerconnection);
        nodes.asset = new HifiNode('asset', this.peerconnection);
        nodes.entity = new HifiNode('entity', this.peerconnection);
        nodes.entityscript = new HifiNode('entityscript', this.peerconnection);
        nodes.message = new HifiNode('message', this.peerconnection);

        nodes.avatar.addPacketHandler('Ping', (packet) => this.handlePing(packet));
        nodes.avatar.addPacketHandler('PingReply', (packet) => this.handlePingReply(packet));

        this.peerconnection.addEventListener('icecandidate', (ev) => this.handleICECandidate(ev));;
        this.peerconnection.createOffer().then((desc) => this.handleSdpOffer(desc), null);

        break;
      default:
        console.log("unknown websocket message type", msg);
        break;
    }
  }

  handleSdpOffer(desc) {
    if (this.peerconnection) {
      this.peerconnection.setLocalDescription(desc);
      var msg ={
        type: 'offer',
        sdp: desc.sdp
      };
      console.log('Offer from PeerConnection \n', msg.sdp);

      this.signalserver.send(JSON.stringify(msg));
    }
  }
  handleICECandidate(event) {
    if (event.candidate) {
      var msg ={
        type: 'candidate',
        candidate: event.candidate
      };
      console.log('Send ICE candidate: \n' + event.candidate.candidate + '\n' + event.candidate.sdpMid + '\n' + event.candidate.sdpMLineIndex);
      this.signalserver.send(JSON.stringify(msg));
    }
  }

  createPacket(packetType, args={}) {
    let nlpacket = new this.packets.NLPacket({packetType: packetType});
    let dt = (new Date().getTime() - this.startTime) / 1000;
    if (this.packets[packetType]) {
      let packet = new this.packets[packetType](args);
      nlpacket.setPayload(packet);
    } else {
      console.warn('Unknown packet type:', packetType);
    }
    let packetel = new HifiPacket({segment: { payload: nlpacket.write()} });
    document.querySelector('hifi-packetlist').addPacket(packetel, true, dt);
    return nlpacket;
  }

  handlePing(packet) {
//console.log('ping!', packet);
  }
  handlePingReply(packet) {
//console.log('pingreply!', packet);
  }
  handleDomainList(packet) {
console.log('got a domain list', packet);
    for (let i = 0; i < packet.nodes.length; i++) {
      let n = packet.nodes[i],
          node = this.nodes[NodeTypeMap[n.nodeType]];
      if (node.uuid != n.uuid) {
console.log('update node', n, node);
        node.updateNode(n, packet.localID);
        //node.clientLocalID = packet.newLocalID;
      }
    }
  }
};

