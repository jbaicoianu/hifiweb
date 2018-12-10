import * as struct from '../utils/struct.js';
import { Enum } from '../utils/enum.js';
import { Flags } from '../utils/flags.js';

const DefaultPacketVersion = 22;

var ObfuscationLevel = {
  NoObfuscation: 0x0, // 00
  ObfuscationL1: 0x1, // 01
  ObfuscationL2: 0x2, // 10
  ObfuscationL3: 0x3 // 11
};


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
  'BulkAvatarTraits',


  'ProxiedICEPing',
  'ProxiedICEPingReply',
  'ProxiedDomainListRequest',

  'NUM_PACKET_TYPE'
]);

const NonVerifiedPackets = [
  PacketType.NodeJsonStats,
  PacketType.EntityQuery,
  PacketType.OctreeDataNack,
  PacketType.EntityEditNack,
  PacketType.DomainListRequest,
  PacketType.StopNode,
  PacketType.DomainDisconnectRequest,
  PacketType.UsernameFromIDRequest,
  PacketType.NodeKickRequest,
  PacketType.NodeMuteRequest,
];
const NonSourcedPackets = [
  PacketType.StunResponse,
  PacketType.CreateAssignment,
  PacketType.RequestAssignment,
  PacketType.DomainServerRequireDTLS,
  PacketType.DomainConnectRequest,
  PacketType.DomainList,
  PacketType.DomainConnectionDenied,
  PacketType.DomainServerPathQuery,
  PacketType.DomainServerPathResponse,
  PacketType.DomainServerAddedNode,
  PacketType.DomainServerConnectionToken,
  PacketType.DomainSettingsRequest,
  PacketType.OctreeDataFileRequest,
  PacketType.OctreeDataFileReply,
  PacketType.OctreeDataPersist,
  PacketType.DomainContentReplacementFromUrl,
  PacketType.DomainSettings,
  PacketType.ICEServerPeerInformation,
  PacketType.ICEServerQuery,
  PacketType.ICEServerHeartbeat,
  PacketType.ICEServerHeartbeatACK,
  PacketType.ICEPing,
  PacketType.ICEPingReply,
  PacketType.ICEServerHeartbeatDenied,
  PacketType.AssignmentClientStatus,
  PacketType.StopNode,
  PacketType.DomainServerRemovedNode,
  PacketType.UsernameFromIDReply,
  PacketType.OctreeFileReplacement,
  PacketType.ReplicatedMicrophoneAudioNoEcho,
  PacketType.ReplicatedMicrophoneAudioWithEcho,
  PacketType.ReplicatedInjectAudio,
  PacketType.ReplicatedSilentAudioFrame,
  PacketType.ReplicatedAvatarIdentity,
  PacketType.ReplicatedKillAvatar,
  PacketType.ReplicatedBulkAvatarData,
];

    // Combined form of Packet and NLPacket
    //  - NLPacket:  https://github.com/highfidelity/hifi/blob/master/libraries/networking/src/NLPacket.h#L27-L40
    //  - Packet: https://github.com/highfidelity/hifi/blob/master/libraries/networking/src/udt/Packet.h#L29-L44
    //                         Packet Header Format
    //
    //     0                   1                   2                   3
    //     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    //    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    //    |C|R|M| O |               Sequence Number                       |
    //    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    //    | P |                     Message Number                        |  Optional (only if M = 1)
    //    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    //    |                         Message Part Number                   |  Optional (only if M = 1)
    //    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    //    |  Packet Type  |    Version    | Local Node ID - sourced only  |
    //    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    //    |                                                               |
    //    |                 MD5 Verification - 16 bytes                   |
    //    |                 (ONLY FOR VERIFIED PACKETS)                   |
    //    |                                                               |
    //    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    //
    //    C: Control bit
    //    R: Reliable bit
    //    M: Message bit
    //    O: Obfuscation level
    //    P: Position bits
    //    NLPacket format:

class NLPacket extends struct.define({
  sequenceNumberAndBitfield: new struct.Uint32_t,
  //messageHeader: new struct.Struct_t, // optional, only if message header is set
  packetType: new struct.Uint8_t,
  version: new struct.Uint8_t,
  localNodeID: new struct.Uint16_t,
  hmac: new struct.Hex128_t,
  payload: new struct.Struct_t
}) {
  constructor(args) {
    super(args);

    this.flags = {
      control: false,
      reliable: false,
      message: false
    };

    if (args && args.packetType) {
      this.packetTypeClass = PacketTypeDefs[args.packetType];
      this.packetType = PacketType[args.packetType];
      this.packetName = args.packetType;
    }
  }
  get headerLength() {
    return NLPacket.totalHeaderSize(this.packetType, this.flags.message); //super.size();
  }
  get byteLength() {
    return this.headerLength + (this.payload ? this.payload.size() : 0);
  }
  setPayload(payload) {
    this.payload = payload;
  }
  write(data, offset) {
    if (!data) {
      data = new ArrayBuffer(this.headerLength + this.payload.size());
      offset = 0;
    }
    this.sequenceNumberAndBitfield =
      this.flags.control << 31 |
      this.flags.reliable << 30 |
      this.flags.message << 29 |
      this.flags.obfuscationlevel << 27 |
      this.sequenceNumber;

    let fin = super.write(data, offset);
    return fin;
  }

  read(data, offset=0) {
    //super.read(data, offset);
    let buf = (data instanceof DataView ? new DataView(data.buffer, offset + data.byteOffset) : new DataView(data, offset));
    this._data = buf;
    this.sequenceNumberAndBitfield = buf.getUint32(0, true);
    let headerOffset = 4;

    this.sequenceNumber = (this.sequenceNumberAndBitfield & 0x07FFFFFF) >>> 0;
    this.flags = {
        control: this.sequenceNumberAndBitfield >>> 31 & 1,
        reliable: this.sequenceNumberAndBitfield >>> 30 & 1,
        message: this.sequenceNumberAndBitfield >>> 29 & 1,
    };
    this.obfuscationlevel = this.sequenceNumberAndBitfield >>> 27 & 3;
    if (this.obfuscationlevel != ObfuscationLevel.NoObfuscation) {
        let unobfuscated = this.obfuscate(data, offset, ObfuscationLevel.NoObfuscation);
        let buf = new DataView(unobfuscated.buffer);
        //console.log("deobfuscating", this, data, unobfuscated);
    }

    if (this.flags.reliable) {
      //console.log('got a reliable packet', this);
    }
    if (this.flags.message) {
      //console.log('got a message packet', this);
      this.messageNumber = buf.getUint32(headerOffset, true);
      this.messagePartNumber = buf.getUint32(headerOffset + 4, true);
      headerOffset += 8;
    }

    this.packetType = buf.getUint8(headerOffset);
    this.version = buf.getUint8(headerOffset + 1);
    this.localNodeID = buf.getUint16(headerOffset + 1, true);

    //hmac: new struct.Hex128_t,
    // FIXME - need to read HMAC string for packet verification

    if (!isNaN(this.packetType) && isFinite(this.packetType)) {
      let packetType = PacketType.fromValue(this.packetType);

      this.packetTypeClass = PacketTypeDefs[packetType];
      this.packetName = packetType;
      if (this.packetTypeClass) {
        this.setPayload(new this.packetTypeClass());
        let payloadOffset = NLPacket.totalHeaderSize(this.packetType, this.flags.message);
        let payloaddata = new Uint8Array(data, offset + payloadOffset, data.byteLength - offset - payloadOffset);//, this.payload.size());
        //this.payload.read(data, offset + NLPacket.totalHeaderSize(this.packetType, this.flags.message));
        this.payload.read(payloaddata.buffer, payloaddata.byteOffset);

        // Debug code - store a reference to the original underlying data so we can refer back to it to make sure the values are correct later
        //console.log('Packet serialization comparison:', payloaddata, new Uint8Array(this.payload.write()));
        this.payload.rawdata = payloaddata;
      }
    }
  }
  static totalHeaderSize(packetType, isMessage) {
    return 4 + // sizeof(this.sequenceNumberAndBitfield)
           (isMessage ? 8 : 0) + // sizeof(messageNumber) + szeof(messagePartNumber), optional
           NLPacket.localHeaderSize(packetType); // sourceID + verification hash, optional
  }
  static localHeaderSize(packetType) {
    let nonSourced = NonSourcedPackets.indexOf(packetType) != -1,
        nonVerified = NonVerifiedPackets.indexOf(packetType) != -1;
    const NUM_BYTES_LOCALID = 2;
    const NUM_BYTES_MD5_HASH = 16;
    // sizeof(packetType) + sizeof(packetVersion) + extras
    let optionalSize = 2 + (nonSourced ? 0 : NUM_BYTES_LOCALID) + ((nonSourced || nonVerified) ? 0 : NUM_BYTES_MD5_HASH);
//console.log('OPTSIZE', optionalSize, nonSourced, nonVerified, this.packetType, NonVerifiedPackets);
    
    return optionalSize; 
  }
  static fromReceivedPacket(data) {
    let nlpacket = new NLPacket();
    try {
      nlpacket.read(data);
    } catch (e) {
      console.log('failed to parse packet', nlpacket, data, e);
    }
    return nlpacket;
  }
  verify(hmac) {
    //let data = this.payload.rawdata; //this.payload.write();
    let data = this.payload.getDataBytes();
    let computedhash = hmac.calculateHash(this.payload.getDataBytes());
    //console.log(this.packetName, this.hmac, computedhash, hmac.calculateHash(new Uint8Array(this.payload.write())), this);
    return computedhash == this.hmac;
  }
  writeVerificationHash(hmac) {
    let newhash = hmac.calculateHash(this.payload.getDataBytes());
    this.hmac = newhash;
    return newhash;
  }
  isReliable() {
    return this.flags.reliable;
  }
  obfuscate(data,offset,obfuscationlevel) {
    var KEYS = [[0x0, 0x0],
        [0x63627269, 0x73736574],
        [0x73626972, 0x61726461],
        [0x72687566, 0x666d616e]];

    var obfuscation_key =
        [KEYS[this.obfuscationlevel][0] ^ KEYS[obfuscationlevel][0],
        KEYS[this.obfuscationlevel][1] ^ KEYS[obfuscationlevel][1]]; // Undo old and apply new one.

    if (obfuscation_key != 0) {
        var obfuscateddata = new Uint8Array(data);
        var unobfuscateddata = new Uint8Array(data.byteLength);

        var j = 4 + ((this.flags.message == 1) ? 8 : 0);
        var size = data.byteLength - j;

        for (var k = 0; k < j; ++k) {
          unobfuscateddata[k] = obfuscateddata[k];
        }

        for (var i = 0; i < size; ++i) {
            var xorvalue;
            if ((i % 8) >= 4) {
              xorvalue = (((obfuscation_key[0]) >>> (8*((i % 8) - 4))) & 0xFF);
            }
            else {
              xorvalue = (((obfuscation_key[1]) >>> (8*(i % 8))) & 0xFF);
            }
            unobfuscateddata[j] = (obfuscateddata[j] ^ xorvalue) >>> 0;
            //console.log(obfuscateddata[j], unobfuscateddata[j], xorvalue);
            ++j;
        }
        //super.read(unobfuscateddata.buffer,offset);
        //this.obfuscationlevel = obfuscationlevel;
        return unobfuscateddata;
        //console.log(this.sequenceNumber, this.flags.control, this.flags.reliable, this.flags.message, this.obfuscationlevel)
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

class ICEPing extends struct.define({
  uuid: new struct.UUID_t,
  pingType: new struct.Uint8_t
}) {
  static version() { return 18; }
};
class ICEPingReply extends struct.define({
  uuid: new struct.UUID_t,
  pingType: new struct.Uint8_t
}) {
  static version() { return 17; }
};
class ProxiedICEPing extends struct.define({
  pingType: new struct.Uint8_t
}) {
};
class ProxiedICEPingReply extends struct.define({
  pingType: new struct.Uint8_t
}) {
};
class ProxiedDomainListRequest extends struct.define({
}) {
};

class Ping extends struct.define({
  pingType: new struct.Uint8_t,
  time: new struct.Uint64_t,
  connectionid: new struct.Int64_t
}) {
  static version() { return 18; }
};

class PingReply extends struct.define({
  pingType: new struct.Uint8_t,
  pingTime: new struct.Uint64_t,
  time: new struct.Uint64_t
}) {
};
class NegotiateAudioFormat extends struct.define({
  numberOfCodecs: new struct.Uint8_t,
  codecs: new struct.StringList_t
}) {
};
class SelectedAudioFormat extends struct.define({
  codec: new struct.String_t,
}) { };
class Node extends struct.define({
  nodeType: new struct.Char_t,
  uuid: new struct.UUID_t,
  // FIXME - this should be a HifiAddress/QHostAddress, which supports ipv4 and ipv6 addresses
  nodePublicAddressType: new struct.Int8_t,
  nodePublicAddress: new struct.Uint32BE_t,
  nodePublicPort: new struct.Uint16BE_t,
  // FIXME - this should also be a HifiAddress/QHostAddress
  nodeLocalAddressType: new struct.Int8_t,
  nodeLocalAddress: new struct.Uint32BE_t,
  nodeLocalPort: new struct.Uint16BE_t,
  permissions: new struct.Uint32BE_t,
  replicated: new struct.Boolean_t,
  sessionLocalID: new struct.Uint16BE_t,
  connectionSecretUUID: new struct.UUID_t,
}) { };
class DomainList extends struct.define({
  domainUUID: new struct.UUID_t,
  domainLocalID: new struct.Uint16BE_t,
  sessionUUID: new struct.UUID_t,
  sessionLocalID: new struct.Uint16BE_t,
  permissions: new struct.Uint32BE_t,
  authenticated: new struct.Boolean_t,
  nodes: new struct.StructList_t()
}) { 
  read(data, offset) {
    let d = super.read(data, offset);
    if (!offset) offset = 0;

    let buf = (data instanceof DataView ? new DataView(data.buffer, offset + data.byteOffset) : new DataView(data, offset));

    let payloadOffset = 41,
        payloadLength = buf.byteLength - payloadOffset;

//console.log('!!', this.size(), buf.byteLength, offset, payloadOffset, payloadLength);
    let idx = payloadOffset;
    this.nodes = [];
    while (idx < data.byteLength - 24) { // FIXME - not sure where the extra 24 bytes are coming from
      let node = new Node().read(data, idx + offset);
      //console.log(' - read node:', node, node.size(), idx, data.byteLength);
      this.nodes.push(node);
      idx += node.size();
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

class AvatarDataUpdates extends struct.define({
  //uuid: new struct.UUID_t,
  hasFlags: new struct.Uint16_t,
  //sequenceId: new struct.Uint16_t,
  updates: new struct.StructList_t
}) {
  read(data, offset) {
    let buf = super.read(data, offset);

    this.updates = [];

    let hasAvatarGlobalPosition  = this.hasFlag(AvatarDataHasFlags.avatar_global_position),
        hasAvatarBoundingBox     = this.hasFlag(AvatarDataHasFlags.avatar_bounding_box),
        hasAvatarOrientation     = this.hasFlag(AvatarDataHasFlags.avatar_orientation),
        hasAvatarScale           = this.hasFlag(AvatarDataHasFlags.avatar_scale),
        hasLookAtPosition        = this.hasFlag(AvatarDataHasFlags.look_at_position),
        hasAudioLoudness         = this.hasFlag(AvatarDataHasFlags.audio_loudness),
        hasSensorToWorldMatrix   = this.hasFlag(AvatarDataHasFlags.sensor_to_world_matrix),
        hasAdditionalFlags       = this.hasFlag(AvatarDataHasFlags.additional_flags),
        hasParentInfo            = this.hasFlag(AvatarDataHasFlags.parent_info),
        hasAvatarLocalPosition   = this.hasFlag(AvatarDataHasFlags.avatar_local_position),
        hasFaceTrackerInfo       = this.hasFlag(AvatarDataHasFlags.face_tracker_info),
        hasJointData             = this.hasFlag(AvatarDataHasFlags.joint_data),
        hasJointDefaultPoseFlags = this.hasFlag(AvatarDataHasFlags.joint_default_pose_flags),
        hasGrabJoints            = this.hasFlag(AvatarDataHasFlags.grab_joints);

/*
console.log('avatardata', this, AvatarDataHasFlags, this.hasFlags,
  hasAvatarGlobalPosition,
  hasAvatarBoundingBox,
  hasAvatarOrientation,
  hasAvatarScale,
  hasLookAtPosition,
  hasAudioLoudness,
  hasSensorToWorldMatrix,
  hasAdditionalFlags,
  hasParentInfo,
  hasAvatarLocalPosition,
  hasFaceTrackerInfo,
  hasJointData,
  hasJointDefaultPoseFlags,
  hasGrabJoints
);
*/


    //let idx = 18; // sizeof(uuid) + sizeof(uint16_t)
    let idx = 2; // sizeof(uint16_t)
    if (hasAvatarGlobalPosition) idx += this.readAvatarUpdate(data, offset + idx, AvatarGlobalPosition);
    if (hasAvatarBoundingBox) idx += this.readAvatarUpdate(data, offset + idx, AvatarBoundingBox);
    if (hasAvatarOrientation) idx += this.readAvatarUpdate(data, offset + idx, AvatarOrientation);
    if (hasAvatarScale) idx += this.readAvatarUpdate(data, offset + idx, AvatarScale);
    if (hasLookAtPosition) idx += this.readAvatarUpdate(data, offset + idx, LookAtPosition);
    if (hasAudioLoudness) idx += this.readAvatarUpdate(data, offset + idx, AudioLoudness);
    if (hasSensorToWorldMatrix) idx += this.readAvatarUpdate(data, offset + idx, SensorToWorldMatrix);
    if (hasAdditionalFlags) idx += this.readAvatarUpdate(data, offset + idx, AdditionalFlags);
    if (hasParentInfo) idx += this.readAvatarUpdate(data, offset + idx, ParentInfo);
    if (hasAvatarLocalPosition) idx += this.readAvatarUpdate(data, offset + idx, AvatarLocalPosition);
    if (hasFaceTrackerInfo) idx += this.readAvatarUpdate(data, offset + idx, FaceTrackerInfo);
    //if (hasJointData) idx += this.readAvatarUpdate(data, offset + idx, JointData);
    //if (hasJointDataDefaultPoseFlags) idx += this.readAvatarUpdate(data, offset + idx, JointDataDefaultPoseFlags);
    //if (hasGrabJoints) idx += this.readAvatarUpdate(data, offset + idx, GrabJoints);
  }
  readAvatarUpdate(data, offset, type) {
    let update = new type();
    update.read(data, offset);
    this.updates.push(update);
    return update.size();
  }
  updateFromAvatar(avatar) {
    // https://github.com/highfidelity/hifi/blob/master/libraries/avatars/src/AvatarData.cpp#L239-L822
    // https://github.com/highfidelity/hifi/blob/master/libraries/avatars/src/AvatarData.h#L120-L297
    this.updates = [];
    //this.uuid = avatar.uuid;

    let hasFlags = 0;
    let sendPosition = true,
        sendOrientation = true;
    if (sendPosition) {
      hasFlags |= AvatarDataHasFlags.avatar_global_position;
      let update = new AvatarGlobalPosition();
      update.globalPositionX = avatar.position.x;
      update.globalPositionY = avatar.position.y;
      update.globalPositionZ = avatar.position.z;
      this.updates.push(update);
    }
    if (sendOrientation) {
      hasFlags |= AvatarDataHasFlags.avatar_orientation;
      let update = new AvatarOrientation();
      update.orientation.x = avatar.orientation.x;
      update.orientation.y = avatar.orientation.y;
      update.orientation.z = avatar.orientation.z;
      update.orientation.w = avatar.orientation.w;
      this.updates.push(update);
    }
    this.hasFlags = hasFlags;
  }
  hasFlag(flag) {
    return (this.hasFlags & flag) == flag
  }
};

class AvatarGlobalPosition extends struct.define({
  globalPositionX: new struct.Float_t,
  globalPositionY: new struct.Float_t,
  globalPositionZ: new struct.Float_t
}) { };
class AvatarBoundingBox extends struct.define({
  sizeX: new struct.Float_t,
  sizeY: new struct.Float_t,
  sizeZ: new struct.Float_t,
  originX: new struct.Float_t,
  originY: new struct.Float_t,
  originZ: new struct.Float_t
}) { };
class AvatarOrientation extends struct.define({
  orientation: new struct.SixByteQuat_t,
}) { };
class AvatarScale extends struct.define({
  scale: new struct.Uint16_t, // FIXME - the native client uses something called a SmallFloat here, "compressed by packFloatRatioToTwoByte"
}) { };
class LookAtPosition extends struct.define({
  lookAtPositionX: new struct.Float_t,
  lookAtPositionY: new struct.Float_t,
  lookAtPositionZ: new struct.Float_t
}) { };
class AudioLoudness extends struct.define({
  audioLoudness: new struct.Uint8_t
}) { };
class SensorToWorldMatrix extends struct.define({
  sensorToWorldQuat: new struct.SixByteQuat_t,
  sensorToWorldScale: new struct.Uint16_t,
  sensorToWorldTransX: new struct.Float_t,
  sensorToWorldTransY: new struct.Float_t,
  sensorToWorldTransZ: new struct.Float_t,
}) { };
class AdditionalFlags extends struct.define({
  flags: new struct.Uint16_t
}) { };
class ParentInfo extends struct.define({
  parentUUID: new struct.UUID_t,
  parentJointIndex: new struct.Uint16_t
}) { };
class AvatarLocalPosition extends struct.define({
  localPositionX: new struct.Float_t,
  localPositionY: new struct.Float_t,
  localPositionZ: new struct.Float_t
}) { };
class FaceTrackerInfo extends struct.define({
  leftEyeBlink: new struct.Float_t,
  rightEyeBlink: new struct.Float_t,
  averageLoudness: new struct.Float_t,
  browAudioLift: new struct.Float_t,
  numBlendshapeCoefficients: new struct.Uint8_t
}) { };
class JointData extends struct.define({
  rotationX: new struct.Float_t,
  rotationY: new struct.Float_t,
  rotationZ: new struct.Float_t,
  rotationW: new struct.Float_t,
  positionX: new struct.Float_t,
  positionY: new struct.Float_t,
  positionZ: new struct.Float_t,
  rotationSet: new struct.Boolean_t,
  translationSet: new struct.Boolean_t,
}) { };
class FarGrabJoints extends struct.define({
  leftFarGrabPositionX: new struct.Float_t,
  leftFarGrabPositionY: new struct.Float_t,
  leftFarGrabPositionZ: new struct.Float_t,
  leftFarGrabRotationX: new struct.Float_t,
  leftFarGrabRotationY: new struct.Float_t,
  leftFarGrabRotationZ: new struct.Float_t,
  leftFarGrabRotationW: new struct.Float_t,

  rightFarGrabPositionX: new struct.Float_t,
  rightFarGrabPositionY: new struct.Float_t,
  rightFarGrabPositionZ: new struct.Float_t,
  rightFarGrabRotationX: new struct.Float_t,
  rightFarGrabRotationY: new struct.Float_t,
  rightFarGrabRotationZ: new struct.Float_t,
  rightFarGrabRotationW: new struct.Float_t,

  mouseFarGrabPositionX: new struct.Float_t,
  mouseFarGrabPositionY: new struct.Float_t,
  mouseFarGrabPositionZ: new struct.Float_t,
  mouseFarGrabRotationX: new struct.Float_t,
  mouseFarGrabRotationY: new struct.Float_t,
  mouseFarGrabRotationZ: new struct.Float_t,
  mouseFarGrabRotationW: new struct.Float_t,
}) { };

class AvatarIdentity extends struct.define({
  avatarSessionUUID: new struct.UUID_t,
  identitySequenceNumber: new struct.Uint32BE_t,
  //attachmentData: new struct.StructList_t,
  attachmentName: new struct.StringUTF16_t,
  //attachmentJointName: new struct.StringUTF16_t,
  displayName: new struct.StringUTF16_t,
  sessionDisplayName: new struct.StringUTF16_t,
  isReplicated: new struct.Boolean_t,
  lookAtSnappingEnabled: new struct.Boolean_t
}) {
  static version() { return 44; }
};
class AvatarData extends struct.define({
  avatarDataSequenceNumber: new struct.Uint16_t,
  avatarData: new struct.Struct_t
}) {
  static version() { return 44; }
  updateFromAvatar(avatar) {
    if (!this.avatarData) {
      this.avatarData = new AvatarDataUpdates();
    }
    this.avatarDataSequenceNumber = avatar.sequenceId++;
    this.avatarData.updateFromAvatar(avatar);
  }
};
class BulkAvatarData extends struct.define({
  updates: new struct.StructList_t,
}) {
  read(data, offset) {
    let idx = 0;
    this.updates = [];
    while (idx < data.byteLength - offset) {
      let update = this.readAvatarUpdate(data, offset + idx);
      this.updates.push(update);
      idx += update.size();
      break; // FIXME - just do one avatar for now, until we get AvatarData packet parsing nailed down
    }
  }
  readAvatarUpdate(data, offset) {
    let avatarupdate = new BulkAvatarDataUpdate();
    avatarupdate.read(data, offset);
//console.log(' - avatar data', avatar, offset);
    return avatarupdate;
  }
};
class BulkAvatarDataUpdate extends struct.define({
  uuid: new struct.UUID_t,
  avatardata: new struct.Struct_t,
}) {
  read(data, offset) {
    super.read(data, offset);
    this.avatardata = new AvatarDataUpdates();
    this.avatardata.read(data, offset + 16);
  }
};
class KillAvatar extends struct.define({
  uuid: new struct.UUID_t,
  reason: new struct.Uint8_t,
}) { };
class SilentAudioFrame extends struct.define({
  sequence: new struct.Uint16_t,
  codec: new struct.String_t,
  samples: new struct.Int16_t,
  positionX: new struct.Float_t,
  positionY: new struct.Float_t,
  positionZ: new struct.Float_t,
  orientationX: new struct.Float_t,
  orientationY: new struct.Float_t,
  orientationZ: new struct.Float_t,
  orientationW: new struct.Float_t,
  position2X: new struct.Float_t,
  position2Y: new struct.Float_t,
  position2Z: new struct.Float_t,
  zeroX: new struct.Float_t,
  zeroY: new struct.Float_t,
  zeroZ: new struct.Float_t,
}) {
  static version() { return 23; }
  read() {
    //console.log('FIXME - reading SilentAudioFrame is very different from writing it');
  }
};
class MixedAudio extends struct.define({
  sequence: new struct.Uint16_t,
  codec: new struct.String_t,
  audiodata: new struct.ByteArray_t,
}) {
  static version() { return 23; }
};

var PacketTypeDefs = {
  NLPacket: NLPacket,
  Ping: Ping,
  PingReply: PingReply,
  NegotiateAudioFormat: NegotiateAudioFormat,
  SelectedAudioFormat: SelectedAudioFormat,
  DomainList: DomainList,
  AvatarIdentity: AvatarIdentity,
  AvatarData: AvatarData,
  BulkAvatarData: BulkAvatarData,
  KillAvatar: KillAvatar,
  SilentAudioFrame: SilentAudioFrame,
  MixedAudio: MixedAudio,
  ICEPing: ICEPing,
  ICEPingReply: ICEPingReply,
  ProxiedICEPing: ProxiedICEPing,
  ProxiedICEPingReply: ProxiedICEPingReply,
  ProxiedDomainListRequest: ProxiedDomainListRequest,
};

export function versionForPacketType(packetType) {
  let version = DefaultPacketVersion;
  if (PacketTypeDefs[packetType] && typeof PacketTypeDefs[packetType].version == 'function') {
    version = PacketTypeDefs[packetType].version()
  }
  return version;
}

export {
  PacketType,

  NLPacket,
  Ping,
  PingReply,
  NegotiateAudioFormat,
  SelectedAudioFormat,
  DomainList,
  AvatarIdentity,
  AvatarDataHasFlags,
  AvatarData,
  BulkAvatarData,
  KillAvatar,
  SilentAudioFrame,
  MixedAudio,
  ICEPing,
  ICEPingReply,
  ProxiedICEPing,
  ProxiedICEPingReply,
  ProxiedDomainListRequest,

  AvatarGlobalPosition,
  AvatarBoundingBox,
  AvatarOrientation,
  AvatarScale,
  LookAtPosition,
  AudioLoudness,
  SensorToWorldMatrix,
  AdditionalFlags,
  ParentInfo,
  AvatarLocalPosition,
  FaceTrackerInfo,
  JointData,
  FarGrabJoints
};
