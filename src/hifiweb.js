import { BinaryReader, Enum, parseBinaryData, hexdump, hexdumpstr } from './net/utils.js';
import * as pcap from './net/pcap.js';

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
    hexdump(this._data, this.getPacketType() + ' (' + this.packetType + ') ' + this.packet.srcAddr + ':' + this.packet.segment.srcPort + ' => ' + this.packet.dstAddr + ':' + this.packet.segment.dstPort);
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


let receiver = new HifiPacketReceiver();
receiver.registerListener(HifiPacketType.ICEPing, (data) => {
  //console.log('handle ping', data);
});
receiver.registerListener(HifiPacketType.STUNResponse, (data) => {
  //console.log('handle STUNResponse', data);
});
receiver.registerListener(HifiPacketType.DomainConnectRequest, (data) => {
  console.log('handle DomainConnectRequest', data);
});

/*
receiver.registerListener(HifiPacketType.MicrophoneAudioNoEcho, (data) => {
  console.log('do the MicrophoneAudioNoEcho', data);
});
*/

function handleAudioPacket(packet) {
  console.log('Received audio packet', packet, packet.isNonSourced(), packet.isNonVerified());
/*
  let foo = parseBinaryData(packet._data, {
    sequence: 'Uint16'
  }, packet.headerOffset + 8, true);
*/
  let msg = packet.getMessage();
  hexdump(msg, 'Packet message');
  console.log(msg);
  let boo = new BinaryReader(msg);
  boo.littleEndian = true;

  let seq = boo.read('Uint16', 0);
  let strlen = boo.read('Uint32', 2);
  let str = boo.readString(6, Math.min(strlen, boo._data.byteLength - 6));
  console.log('Received audio packet', seq, strlen, str, msg);
  let offset = 2 + 4 + strlen;
  
}

receiver.registerListener(HifiPacketType.SilentAudioFrame, handleAudioPacket);
receiver.registerListener(HifiPacketType.MixedAudio, handleAudioPacket);

class HifiPacketList extends HTMLElement {
  constructor() {
    super();
  }
  load(url) {
    let capture = new pcap.PCAPReader();
    let servers = {
      'stun': '54.67.22.242',
      'domain': '35.162.187.39',
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
console.log('diff', start.diff(ts), ts, start);
        if (packet.dstAddr == servers.domain || packet.srcAddr == servers.domain) {
          try {
setTimeout(() => {
            let hifipacket = new HifiPacket(packet);
            //console.log('the packet: ' + packet.srcAddr + ':' + packet.segment.srcPort + ' => ' + packet.dstAddr + ':' + packet.segment.dstPort, HifiPacketType.fromValue(hifipacket.packetType), hifipacket, packet);
            packets.push(hifipacket);
            receiver.handlePacket(hifipacket);

            let packetel = document.createElement('hifi-packet');
            packetel.setPacket(hifipacket, hifipacket.packet.srcAddr == servers.self);
            this.appendChild(packetel);
}, 0);
          } catch (e) {
            console.warn('Failed to parse HifiPacket!', packet, e);
          }
        }
      });
    });

  }
}
class HifiPacketDebug extends HTMLElement {
  setPacket(packet, sendpacket) {
    let header = document.createElement('h3'),
        subheader = document.createElement('h4'),
        flags = document.createElement('ul'),
        hex = document.createElement('pre');
    header.innerHTML = packet.getPacketType() + ' (' + packet.packetType + ') ' + 'seqid ' + packet.sequenceNumber;

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

  }
}
customElements.define('hifi-packetlist', HifiPacketList);
customElements.define('hifi-packet', HifiPacketDebug);

let plist = document.createElement('hifi-packetlist');
plist.load('data/hifi-packet-dump-pcm.pcap');
document.body.appendChild(plist);
