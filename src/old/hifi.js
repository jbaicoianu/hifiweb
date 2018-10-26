import * as struct from '../utils/struct.js';
import { Enum } from '../utils/enum.js';
import { Flags } from '../utils/flags.js';

const PacketType = new Enum([
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

class NLPacket extends struct.define({
  sequenceNumberAndBitfield: new struct.Uint32_t,

  packetType: new struct.Uint8_t,
  version: new struct.Uint8_t,
  localNodeID: new struct.Uint16_t,
  payload: new struct.Struct_t
}) {
  constructor(args) {
    super(args);

    if (args && args.packetType) {
      this.packetTypeClass = PacketTypeDefs[args.packetType];
      this.packetType = PacketType[args.packetType];
    }
  }
  get headerLength() {
    return super.size();
  }
  get byteLength() {
    return this.headerLength + (this.payload ? this.payload.size() : 0);
  }
  setPayload(payload) {
    this.payload = payload;
  }
  write(data, offset) {
    if (!data) {
      data = new ArrayBuffer(this.size() + this.payload.size());
      offset = 0;
    }
    let fin = super.write(data, offset);
    if (this.payload) {
      this.payload.write(fin, this.headerLength);
    }
    return fin;
  }
  read(data, offset=0) {
    super.read(data, offset);

    this.sequenceNumber = this.sequenceNumberAndBitfield & 0x07FFFFF;
    this.flags = {
      control: this.sequenceNumberAndBitField >> 31 & 1,
      reliable: this.sequenceNumberAndBitField >> 30 & 1,
      message: this.sequenceNumberAndBitField >> 29 & 1,
    };

    if (!isNaN(this.packetType) && isFinite(this.packetType)) {
      let packetType = PacketType.fromValue(this.packetType);
      this.packetTypeClass = PacketTypeDefs[packetType];
      if (this.packetTypeClass) {
        this.setPayload(new this.packetTypeClass());
        this.payload.read(data, offset + 24);
      }
    }
  }
};

class QHostAddress extends struct.define({
  protocol: new struct.Int8_t,
  addr: new struct.Uint32_t,
}) { };
class HifiAddress extends struct.define({
  address: QHostAddress,
  port: new struct.Uint16_t
}) { };

class Ping extends struct.define({
  pingType: new struct.Uint8_t,
  time: new struct.Uint64_t
}) { };

class PingReply extends struct.define({
  pingType: new struct.Uint8_t,
  pingTime: new struct.Uint64_t,
  time: new struct.Uint64_t
}) { };
class SelectedAudioFormat extends struct.define({
  codec: new struct.String_t,
}) { };
class Node extends struct.define({
  nodeType: new struct.Char_t,
  nodeUUID: new struct.UUID_t,
  // FIXME - this should be a HifiAddress/QHostAddress, which supports ipv4 and ipv6 addresses
  nodePublicAddressType: new struct.Int8_t,
  nodePublicAddress: new struct.Uint32_t,
  nodePublicPort: new struct.Uint16_t,
  // FIXME - this should also be a HifiAddress/QHostAddress
  nodeLocalAddressType: new struct.Int8_t,
  nodeLocalAddress: new struct.Uint32_t,
  nodeLocalPort: new struct.Uint16_t,
  permissions: new struct.Uint32_t,
  replicated: new struct.Boolean_t,
  sessionLocalID: new struct.Uint16_t,
  connectionSecretUUID: new struct.UUID_t,
}) { };
class DomainList extends struct.define({
  domainUUID: new struct.UUID_t,
  domainLocalID: new struct.Uint16_t,
  newUUID: new struct.UUID_t,
  newLocalID: new struct.Uint16_t,
  permissions: new struct.Uint32_t,
  authenticated: new struct.Boolean_t,
  //domains: new struct.StructList_t(Node)
}) { 
  read(data, offset) {
    let d = super.read(data, offset);
//console.log('READ DOMAINLIST', d, data, offset, this);

    let buf = (data instanceof DataView ? new DataView(data.buffer, offset + data.byteOffset) : new DataView(data, offset));

    let payloadOffset = 41 - 18,
        payloadLength = buf.byteLength - payloadOffset;

//console.log('!!', this.byteLength, buf.byteLength, offset, payloadOffset, payloadLength);
    let idx = payloadOffset;
    this.domains = [];
    while (idx < data.byteLength) {
      let node = new Node().read(buf, idx);
      //console.log(' - read node:', node, node.byteLength);
      this.domains.push(node);
      idx += node.byteLength;
    }
    return d;
  }
};

const AvatarDataHasFlags = new Flags([
  'avatar_global_position',
  'avatar_bounding_box',
  'avatar_orientation',
  'avatar_scale',
  'look_at_position',
  'audio_loudness',
  'sensor_to_world_matrix',
  'additional_flags',
  'parent_info',
  'avatar_local_position',
  'face_tracker_info',
  'joint_data',
  'joint_default_pose_flags',
  'grab_joints'
]);

class AvatarData extends struct.define({
  sequenceId: new struct.Uint16_t,
  hasFlags: new struct.Uint16_t,
  updates: new struct.StructList_t
}) {
  updateFromAvatar(avatar) {
    this.updates = [];
    this.sequenceId = avatar.sequenceId++;

    let hasFlags = 0;
    let sendPosition = true,
        sendOrientation = true;
    if (sendPosition) {
      hasFlags |= AvatarDataHasFlags.avatar_global_position;
      let globalpos = new AvatarGlobalPosition();
      globalpos.globalPositionX = avatar.position.x;
      globalpos.globalPositionY = avatar.position.y;
      globalpos.globalPositionZ = avatar.position.z;
      this.updates.push(globalpos);
    }
  }  
};

class AvatarGlobalPosition extends struct.define({
  globalPositionX: new struct.Float_t,
  globalPositionY: new struct.Float_t,
  globalPositionZ: new struct.Float_t
}) { };

var PacketTypeDefs = {
  NLPacket: NLPacket,
  Ping: Ping,
  PingReply: PingReply,
  SelectedAudioFormat: SelectedAudioFormat,
  DomainList: DomainList,
  AvatarData: AvatarData,
};

export {
  PacketType,

  NLPacket,
  Ping,
  PingReply,
  SelectedAudioFormat,
  DomainList,
  AvatarDataHasFlags,
  AvatarData,
  AvatarGlobalPosition
};
