import { BinaryReader, Enum, parseBinaryData, hexdump, hexdumpstr } from './net/utils.js';
import * as pcap from './net/pcap.js';
import * as structviewer from './net/structviewer.js';
import * as hifipackets from './net/hifi.js';

const HifiPacketType = new Enum([
  'Unknown',
  'StunResponse',
  'DomainList',
  'Ping',
  'PingReply',
  'KillAvatar',
  'AvatarData',
  'InjectAudio',
  'MixedAudio',
  'MicrophoneAudioNoEcho',
  'MicrophoneAudioWithEcho',
  'BulkAvatarData',
  'SilentAudioFrame',
  'DomainListRequest',
  'RequestAssignment',
  'CreateAssignment',
  'DomainConnectionDenied',
  'MuteEnvironment',
  'AudioStreamStats',
  'DomainServerPathQuery',
  'DomainServerPathResponse',
  'DomainServerAddedNode',
  'ICEServerPeerInformation',
  'ICEServerQuery',
  'OctreeStats',
  'UNUSED_PACKET_TYPE_1',
  'AvatarIdentityRequest',
  'AssignmentClientStatus',
  'NoisyMute',
  'AvatarIdentity',
  'NodeIgnoreRequest',
  'DomainConnectRequest',
  'DomainServerRequireDTLS',
  'NodeJsonStats',
  'OctreeDataNack',
  'StopNode',
  'AudioEnvironment',
  'EntityEditNack',
  'ICEServerHeartbeat',
  'ICEPing',
  'ICEPingReply',
  'EntityData',
  'EntityQuery',
  'EntityAdd',
  'EntityErase',
  'EntityEdit',
  'DomainServerConnectionToken',
  'DomainSettingsRequest',
  'DomainSettings',
  'AssetGet',
  'AssetGetReply',
  'AssetUpload',
  'AssetUploadReply',
  'AssetGetInfo',
  'AssetGetInfoReply',
  'DomainDisconnectRequest',
  'DomainServerRemovedNode',
  'MessagesData',
  'MessagesSubscribe',
  'MessagesUnsubscribe',
  'ICEServerHeartbeatDenied',
  'AssetMappingOperation',
  'AssetMappingOperationReply',
  'ICEServerHeartbeatACK',
  'NegotiateAudioFormat',
  'SelectedAudioFormat',
  'MoreEntityShapes',
  'NodeKickRequest',
  'NodeMuteRequest',
  'RadiusIgnoreRequest',
  'UsernameFromIDRequest',
  'UsernameFromIDReply',
  'AvatarQuery',
  'RequestsDomainListData',
  'PerAvatarGainSet',
  'EntityScriptGetStatus',
  'EntityScriptGetStatusReply',
  'ReloadEntityServerScript',
  'EntityPhysics',
  'EntityServerScriptLog',
  'AdjustAvatarSorting',
  'OctreeFileReplacement',
  'CollisionEventChanges',
  'ReplicatedMicrophoneAudioNoEcho',
  'ReplicatedMicrophoneAudioWithEcho',
  'ReplicatedInjectAudio',
  'ReplicatedSilentAudioFrame',
  'ReplicatedAvatarIdentity',
  'ReplicatedKillAvatar',
  'ReplicatedBulkAvatarData',
  'DomainContentReplacementFromUrl',
  'ChallengeOwnership',
  'EntityScriptCallMethod',
  'ChallengeOwnershipRequest',
  'ChallengeOwnershipReply',

  'OctreeDataFileRequest',
  'OctreeDataFileReply',
  'OctreeDataPersist',

  'EntityClone',
  'EntityQueryInitialResultsComplete',

  'NUM_PACKET_TYPE'
]);
const HifiNonVerifiedPackets = [
  HifiPacketType.NodeJsonStats,
  HifiPacketType.EntityQuery,
  HifiPacketType.OctreeDataNack,
  HifiPacketType.EntityEditNack,
  HifiPacketType.DomainListRequest,
  HifiPacketType.StopNode,
  HifiPacketType.DomainDisconnectRequest,
  HifiPacketType.UsernameFromIDRequest,
  HifiPacketType.NodeKickRequest,
  HifiPacketType.NodeMuteRequest,
];
const HifiNonSourcedPackets = [
  HifiPacketType.StunResponse,
  HifiPacketType.CreateAssignment,
  HifiPacketType.RequestAssignment,
  HifiPacketType.DomainServerRequireDTLS,
  HifiPacketType.DomainConnectRequest,
  HifiPacketType.DomainList,
  HifiPacketType.DomainConnectionDenied,
  HifiPacketType.DomainServerPathQuery,
  HifiPacketType.DomainServerPathResponse,
  HifiPacketType.DomainServerAddedNode,
  HifiPacketType.DomainServerConnectionToken,
  HifiPacketType.DomainSettingsRequest,
  HifiPacketType.OctreeDataFileRequest,
  HifiPacketType.OctreeDataFileReply,
  HifiPacketType.OctreeDataPersist,
  HifiPacketType.DomainContentReplacementFromUrl,
  HifiPacketType.DomainSettings,
  HifiPacketType.ICEServerPeerInformation,
  HifiPacketType.ICEServerQuery,
  HifiPacketType.ICEServerHeartbeat,
  HifiPacketType.ICEServerHeartbeatACK,
  HifiPacketType.ICEPing,
  HifiPacketType.ICEPingReply,
  HifiPacketType.ICEServerHeartbeatDenied,
  HifiPacketType.AssignmentClientStatus,
  HifiPacketType.StopNode,
  HifiPacketType.DomainServerRemovedNode,
  HifiPacketType.UsernameFromIDReply,
  HifiPacketType.OctreeFileReplacement,
  HifiPacketType.ReplicatedMicrophoneAudioNoEcho,
  HifiPacketType.ReplicatedMicrophoneAudioWithEcho,
  HifiPacketType.ReplicatedInjectAudio,
  HifiPacketType.ReplicatedSilentAudioFrame,
  HifiPacketType.ReplicatedAvatarIdentity,
  HifiPacketType.ReplicatedKillAvatar,
  HifiPacketType.ReplicatedBulkAvatarData,
];

let HifiPacketParsers = {}; // Static map of packet parse functions

class HifiPacket extends BinaryReader {
  constructor(packet) {
    super(packet.segment.payload, 0);
    this.packet = packet;
    this.parse({
      sequenceNumberAndBitField: 'Uint32',
    });
    this.flags = {
      control: this.sequenceNumberAndBitField >> 31 & 1,
      reliable: this.sequenceNumberAndBitField >> 30 & 1,
      message: this.sequenceNumberAndBitField >> 29 & 1,
    };
    this.sequenceNumber = this.sequenceNumberAndBitField & 0x07FFFFFF;

    let headeroffset = 4;
    if (this.flags.message) {
      this.messageNumberAndBitField = this.read('Uint32', 4);
      this.positionBits = this.messageNumberAndBitField >> 30;
      this.messageNumber = this.messageNumberAndBitField & 0x3fffffff;
      this.messagePartNumber = this.read('Uint32', 8);
      headeroffset += 8;
    }

    this.parse({
      packetType: 'Uint8',
      version: 'Uint8',
      localNodeID: 'Uint16',
      //md5: 'Uint8[16]'
    }, headeroffset);
    this.headerOffset = headeroffset + this.totalHeaderSize();
    //hexdump(this._data, this.getPacketType() + ' (' + this.packetType + ') ' + this.packet.srcAddr + ':' + this.packet.segment.srcPort + ' => ' + this.packet.dstAddr + ':' + this.packet.segment.dstPort);
  }
  totalHeaderSize() {
    return 4 + (this.flags.message ? 16 : 0) + this.localHeaderSize() + 13; //* FIXME - offset is wrong in many case */ 
  }
  localHeaderSize() {
    let nonSourced = this.isNonSourced(),
        nonVerified = this.isNonVerified();
    const NUM_BYTES_LOCALID = 2;
    const NUM_BYTES_MD5_HASH = 16;
    let optionalSize = (nonSourced ? 0 : NUM_BYTES_LOCALID) + ((nonSourced || nonVerified) ? 0 : NUM_BYTES_MD5_HASH);
    
    return 1 + 2 + optionalSize; 
  }

  isNonSourced() {
    return HifiNonSourcedPackets.indexOf(this.packetType) == -1;
  }
  isNonVerified() {
    return HifiNonVerifiedPackets.indexOf(this.packetType) == -1;
  }
  static addPacketParser(type, parsefunc) {
    console.log('Registered new packet type:', type);
    HifiPacketParsers[type] = parsefunc;
  }
  getPacketType() {
    return HifiPacketType.fromValue(this.packetType);
  }
  getMessage() {
    return new DataView(this._data.buffer, this._data.byteOffset + this.headerOffset);
  }
};

class HifiPacketReceiver {
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

class HifiWebClient {
  constructor() {
    this.startTime = new Date().getTime();
    let receiver = this.receiver = new HifiPacketReceiver();
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
    this.signalserver = new WebSocket('ws://hifi.janusvr.com:8118');
    this.signalserver.addEventListener('message', (ev) => this.handleSignalMessage(ev));
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
        var msg ={
          type: 'domain',
          domain_name: 'hifi://janusvr'
        };
        this.signalserver.send(JSON.stringify(msg));

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

        let channels = this.channels;
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

  getPacket(data, srcAddr, srcPort) {
    let nlpacket = new this.packets.NLPacket();
    nlpacket.read(data.data);
//console.log(nlpacket, data.data);
    let packet = new HifiPacket({srcAddr: srcAddr,segment: { srcPort: srcPort, payload: data.data} });
    let dt = (new Date().getTime() - this.startTime) / 1000;
    document.querySelector('hifi-packetlist').addPacket(packet, false, dt);
//console.log('BEEP', nlpacket);
    //this.packetdebugger.add(nlpacket);
    return packet;
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

  handleDomainPacket(data) {
    let hifipacket = this.getPacket(data, 'janusvr', 'domain');
    //console.log('domain packet!', data, hifipacket);
    this.receiver.handlePacket(hifipacket);
  }
  handleAudioPacket(data) {
    let hifipacket = this.getPacket(data, 'janusvr', 'audio');
    //console.log('audio packet!', data, hifipacket);
    this.receiver.handlePacket(hifipacket);
  }
  handleAvatarPacket(data) {
    let hifipacket = this.getPacket(data, 'janusvr', 'avatar');
    //console.log('avatar packet!', data, hifipacket);
    this.receiver.handlePacket(hifipacket);
  }
  handleEntityPacket(data) {
    let hifipacket = this.getPacket(data, 'janusvr', 'entity');
    //console.log('entity packet!', data);
    this.receiver.handlePacket(hifipacket);
  }
  handleEntityScriptPacket(data) {
    let hifipacket = this.getPacket(data, 'janusvr', 'entityscript');
    //console.log('entityscript packet!', data);
    this.receiver.handlePacket(hifipacket);
  }
  handleMessagePacket(data) {
    let hifipacket = this.getPacket(data, 'janusvr', 'message');
    //console.log('message packet!', data);
    this.receiver.handlePacket(hifipacket);
  }
  handleAssetPacket(data) {
    let hifipacket = this.getPacket(data, 'janusvr', 'asset');
    //console.log('asset packet!', data);
    this.receiver.handlePacket(hifipacket);
  }

  /* Individual packet type handlers */
  handleDomainList(packet) {
    packet.parse({
      domainUUID: 'Uint8[16]',
      domainLocalID: 'Uint16',
      newUUID: 'Uint8[16]',
      newLocalID: 'Uint16',
    }, packet.headerOffset);
    console.log('handle DomainList', packet);

  }
  handleDomainConnectRequest(packet) {
    console.log('handle DomainConnectRequest', data);
  }
  handleAudioPacketDecode(packet) {
    //console.log('Received audio packet', packet, packet.isNonSourced(), packet.isNonVerified());
  /*
    let foo = parseBinaryData(packet._data, {
      sequence: 'Uint16'
    }, packet.headerOffset + 8, true);
  */
    let msg = packet.getMessage();
    //hexdump(msg, 'Packet message');
    //console.log(msg);
    let boo = new BinaryReader(msg);
    boo.littleEndian = true;

    let seq = boo.read('Uint16', 0);
    let strlen = boo.read('Uint32', 2);
    let str = boo.readString(6, Math.min(strlen, boo._data.byteLength - 6));
    let offset = 2 + 4 + strlen;
    let data = boo.readArray('Uint8', offset, boo._data.byteLength - offset);
    let pcmdata = pako.inflate(data, {to: 'arraybuffer'});
    console.log('Received audio packet', seq, strlen, str, msg, pcmdata);
  }
};

class HifiAvatar {
  constructor() {
    Object.defineProperties(this, {
      position: { value: { x: 0, y: 0, z: 0 } }
    });
    this.sequenceId = 0;
  }

  toByteArray(dataDetail, lastSendTime) {
    // https://github.com/highfidelity/hifi/blob/1cc2569bd85f27f44ac3767ae09aee3a3c5e082e/libraries/avatars/src/AvatarData.cpp#L238-L773


    let avatardata = new hifipackets.AvatarData();

    return avatardata.write();
  }
}


/*
receiver.registerListener(HifiPacketType.DomainList, (data) => {
  console.log('handle DomainList', data);
  
});
*/

/*
receiver.registerListener(HifiPacketType.MicrophoneAudioNoEcho, (data) => {
  console.log('do the MicrophoneAudioNoEcho', data);
});
*/

//receiver.registerListener(HifiPacketType.SilentAudioFrame, handleAudioPacket);

class HifiPacketList extends HTMLElement {
  constructor() {
    super();
  }
  load(url) {
    let capture = new pcap.PCAPReader();
    let servers = {
      'stun': '54.67.22.242',
      'domain': '35.162.187.39',
      //'domain': '66.70.245.202',
      'self': '192.168.42.248'
    };
    var packets = window.packets = [];
    capture.load(url).then((records) => {
      console.log('Parsed PCAP packets:', records, capture);
      let start = new pcap.PCAPTimestamp(records[0].ts_sec, records[0].ts_usec);
      records.forEach(r => {
        let packet = r.frame.datagram;
        // FIXME - we're only looking at the conversation between the client and domain server right now, which means no ICE or STUN packets right now
        let ts = new pcap.PCAPTimestamp(r.ts_sec, r.ts_usec);
//console.log('diff', start.diff(ts), ts, start);
        if (packet.dstAddr == servers.domain || packet.srcAddr == servers.domain) {
          try {
setTimeout(() => {
            let hifipacket = new HifiPacket(packet);
            //console.log('the packet: ' + packet.srcAddr + ':' + packet.segment.srcPort + ' => ' + packet.dstAddr + ':' + packet.segment.dstPort, HifiPacketType.fromValue(hifipacket.packetType), hifipacket, packet);
            this.addPacket(hifipacket);
//console.log(hifipacket);
}, 0);
          } catch (e) {
            console.warn('Failed to parse HifiPacket!', packet, e);
          }
        }
      });
    });

  }
  addPacket(packet, sendpacket, dt) {
    //window.packets.push(packet);
    //receiver.handlePacket(packet);

    let packetel = document.createElement('hifi-packet');
    packetel.setPacket(packet, sendpacket, dt);
    if (this.childNodes.length > 500) {
      this.removeChild(this.childNodes[0])
    }
console.log(this.scrollTop, this.scrollHeight, this.offsetHeight);
    let atScrollTop = (this.scrollTop >= this.scrollHeight - this.offsetHeight - 150);
    this.appendChild(packetel);
    if (atScrollTop) {
      this.scrollTop = this.scrollHeight;
    }
  }
}
class HifiPacketDebug extends HTMLElement {
  setPacket(packet, sendpacket, dt) {
    let header = document.createElement('h3'),
        subheader = document.createElement('h4'),
        flags = document.createElement('ul'),
        hex = document.createElement('pre');


    header.innerHTML = packet.getPacketType() + ' (' + packet.packetType + ') ' + 'seqid ' + packet.sequenceNumber + '<span class="timestamp">' + dt + '</span>';

    if (sendpacket) {
      this.className = 'sending';
      subheader.innerHTML = packet.packet.srcAddr + ':' + packet.packet.segment.srcPort + ' <strong>=&gt;</strong> ' + packet.packet.dstAddr + ':' + packet.packet.segment.dstPort;
    } else {
      this.className = 'receiving';
      subheader.innerHTML = packet.packet.dstAddr + ':' + packet.packet.segment.dstPort + ' <strong>&lt;=</strong> ' + packet.packet.srcAddr + ':' + packet.packet.segment.srcPort;
    }

    hex.innerHTML += hexdumpstr(packet._data);

    let flag_control = document.createElement('li'),
        flag_reliable = document.createElement('li'),
        flag_message = document.createElement('li');

    flags.className = 'packetflags';

    flag_control.innerHTML = 'control';
    flag_reliable.innerHTML = 'reliable';
    flag_message.innerHTML = 'message';

    if (packet.flags.control) flag_control.className = 'selected';
    if (packet.flags.reliable) flag_reliable.className = 'selected';
    if (packet.flags.message) flag_message.className = 'selected';

    flags.appendChild(flag_control);
    flags.appendChild(flag_reliable);
    flags.appendChild(flag_message);

    subheader.appendChild(flags);

    this.appendChild(header);
    this.appendChild(subheader);
    this.appendChild(hex);

/*
    if (packet.packetType == HifiPacketType.MixedAudio) {
      let button = document.createElement('button');
      button.innerHTML = 'play';
      this.appendChild(button);
      button.addEventListener('click', (ev) => {
console.log('plurt', packet);
      });
    }
*/

  }
}
customElements.define('hifi-packetlist', HifiPacketList);
customElements.define('hifi-packet', HifiPacketDebug);


let plist = document.createElement('hifi-packetlist');
//plist.load('data/hifi-packet-dump-zlib.pcap');
//plist.load('data/hifi-packet-dump-pcm.pcap');
document.body.appendChild(plist);

window.hifiweb = new HifiWebClient();

