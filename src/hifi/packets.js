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
  'AudioSoloRequest',

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

const AdditionalFlagValues = new Flags([
    'x5',
    'x4',
    'x3',
    'x2',
    'x1',
    'x0',
    'procedural_blink_face_movement',
    'procedural_eye_face_movement',
    'audio_enabled_face_movement',
    'hand_state_finger_pointing',
    'has_referential',
    'is_eye_tracker_connected',
    'is_face_tracker_connected',
    'hand_state_1',
    'hand_state_0',
    'key_state_1',
    'key_state_0'
]);

class AvatarDataUpdates extends struct.define({
  //uuid: new struct.UUID_t,
  hasFlags: new struct.Uint16_t,
  //sequenceId: new struct.Uint16_t,
  updates: new struct.StructList_t
}) {
  size() {
    return this.byteSize;
  }
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
        hasGrabJoints            = this.hasFlag(AvatarDataHasFlags.grab_joints),
        hasJointDefaultPoseFlags = this.hasFlag(AvatarDataHasFlags.joint_default_pose_flags);

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
    if (hasJointData) idx += this.readAvatarUpdate(data, offset + idx, JointData);
    if (hasJointData && hasGrabJoints) idx += this.readAvatarUpdate(data, offset + idx, FarGrabJoints);
    if (hasJointDefaultPoseFlags) idx += this.readAvatarUpdate(data, offset + idx, JointDataDefaultPoseFlags);

    this.byteSize = idx;
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

    this.hasFlags = 0;
    this.byteSize = 0;
    if (avatar.sendPosition) {
      this.hasFlags |= AvatarDataHasFlags.avatar_global_position;
      let update = new AvatarGlobalPosition();
      update.globalPosition = avatar.position;
      this.updates.push(update);
      this.byteSize += 12;
    }
    if (avatar.sendOrientation) {
      this.hasFlags |= AvatarDataHasFlags.avatar_orientation;
      let update = new AvatarOrientation();
      update.orientation = avatar.orientation
      this.updates.push(update);
      this.byteSize += 16;
    }
  }
  hasFlag(flag) {
    return (this.hasFlags & flag) == flag;
  }
};

class AvatarGlobalPosition extends struct.define({
  globalPosition: new struct.Vec3_t
}) { };
class AvatarBoundingBox extends struct.define({
  boxSize: new struct.Vec3_t,
  origin: new struct.Vec3_t
}) { };
class AvatarOrientation extends struct.define({
  orientation: new struct.SixByteQuat_t,
}) { };
class AvatarScale extends struct.define({
  scale: new struct.TwoByteFloatRatio_t,
}) { };
class LookAtPosition extends struct.define({
  lookAtPosition: new struct.Vec3_t
}) { };
class AudioLoudness extends struct.define({
  audioLoudness: new struct.Uint8_t
}) { };
class SensorToWorldMatrix extends struct.define({
  sensorToWorldQuat: new struct.SixByteQuat_t,
  sensorToWorldScale: new struct.Uint16_t,
  sensorToWorldTrans: new struct.Vec3_t,
}) { };
class AdditionalFlags extends struct.define({
  flags: new struct.Uint16_t
}) { };
class ParentInfo extends struct.define({
  parentUUID: new struct.UUID_t,
  parentJointIndex: new struct.Uint16_t
}) { };
class AvatarLocalPosition extends struct.define({
  localPosition: new struct.Vec3_t
}) { };
class FaceTrackerInfo extends struct.define({
  leftEyeBlink: new struct.Float_t,
  rightEyeBlink: new struct.Float_t,
  averageLoudness: new struct.Float_t,
  browAudioLift: new struct.Float_t,
  numBlendshapeCoefficients: new struct.Uint8_t,
  blendshapeCoefficients: new struct.StructList_t
}) {
  size() {
    return 1 + 16 + 4*this.numBlendshapeCoefficients;
  }
  read(data, offset) {
    if (!offset) offset = 0;

    let buf = new DataView(data, 0);

    let leftEyeBlink = new struct.Float_t;
    this.leftEyeBlink = leftEyeBlink.read(buf,offset);
    offset += 4;

    let rightEyeBlink = new struct.Float_t;
    this.rightEyeBlink = rightEyeBlink.read(buf,offset);
    offset += 4;

    let averageLoudness = new struct.Float_t;
    this.averageLoudness = averageLoudness.read(buf,offset);
    offset += 4;

    let browAudioLift = new struct.Float_t;
    this.browAudioLift = browAudioLift.read(buf,offset);
    offset += 4;

    let numBlendshapeCoefficients = new struct.Uint8_t;
    this.numBlendshapeCoefficients = numBlendshapeCoefficients.read(buf,offset);
    offset += 1;

    if (this.numBlendshapeCoefficients > 0) {
      for (let i = 0; i < this.numBlendshapeCoefficients; i++) {
        let blendshapeCoefficient = new struct.Float_t;
        this.numBlendshapeCoefficients.push(blendshapeCoefficient.read(buf,offset));
        offset += 4;
      }
    }
  }
};
class JointData extends struct.define({
  numJoints: new struct.Uint8_t,
  validityBitsRotations: new struct.BitVector_t,
  rotations: new struct.StructList_t,
  validityBitsTranslations: new struct.BitVector_t,
  translations: new struct.StructList_t,
  fauxJoint0Rotation: new struct.SixByteQuat_t,
  fauxJoint0Translation: new struct.SignedTwoByteVec3_t,
  fauxJoint1Rotation: new struct.SixByteQuat_t,
  fauxJoint1Translation: new struct.SignedTwoByteVec3_t,
}) {
  size() {
    return 1 + 2*(Math.ceil(this.numJoints / 8)) + 6*this.rotations.length + 6*this.translations.length + 24;
  }
  read(data, offset) {
    if (!offset) offset = 0;

    let buf = new DataView(data, 0);

    this.numJoints = buf.getUint8(offset);
    offset++;

    this.rotations = [];
    this.translations = [];

    if (this.numJoints > 0) {
      var validityBitsRotations = new struct.BitVector_t;
      this.validityBitsRotations = validityBitsRotations.read(buf, offset, this.numJoints);
      offset += Math.ceil(this.numJoints / 8);

      for (var i = 0; i < this.validityBitsRotations.length; i++) {
        if (this.validityBitsRotations[i]) {
          let rot = new struct.SixByteQuat_t;
          this.rotations.push(rot.read(buf,offset));
          offset += 6;
        }
      }

      var validityBitsTranslations = new struct.BitVector_t;
      this.validityBitsTranslations = validityBitsTranslations.read(buf, offset, this.numJoints);
      offset += Math.ceil(this.numJoints / 8);

      for (var i = 0; i < this.validityBitsTranslations.length; i++) {
        if (this.validityBitsTranslations[i]) {
          let trans = new struct.SignedTwoByteVec3_t;
          this.translations.push(trans.read(buf,offset));
          offset += 6;
        }
      }
    }

    let f0r = new struct.SixByteQuat_t;
    this.fauxJoint0Rotation = f0r.read(buf,offset);
    offset += 6;

    let f0t = new struct.SignedTwoByteVec3_t;
    this.fauxJoint0Translation = f0t.read(buf,offset);
    offset += 6;

    let f1r = new struct.SixByteQuat_t;
    this.fauxJoint1Rotation = f1r.read(buf,offset);
    offset += 6;

    let f1t = new struct.SignedTwoByteVec3_t;
    this.fauxJoint1Translation = f1t.read(buf,offset);
    offset += 6;
  }
};
class FarGrabJoints extends struct.define({
  leftFarGrabPosition: new struct.Vec3_t,
  leftFarGrabRotation: new struct.Quat_t,

  rightFarGrabPosition: new struct.Vec3_t,
  rightFarGrabRotation: new struct.Quat_t,

  mouseFarGrabPosition: new struct.Vec3_t,
  mouseFarGrabRotation: new struct.Quat_t,
}) { };
class JointDataDefaultPoseFlags extends struct.define({
  numJoints: new struct.Uint8_t,
  rotations: new struct.BitVector_t,
  translations: new struct.BitVector_t
}) {
  size() {
    return 1 + 2*(Math.ceil(this.numJoints / 8));
  }
  read(data, offset) {
    if (!offset) offset = 0;

    let buf = new DataView(data, 0);

    this.numJoints = buf.getUint8(offset);
    offset++;

    if (this.numJoints > 0) {
      var rotations = new struct.BitVector_t;
      this.rotations = rotations.read(buf, offset, this.numJoints);
      offset += Math.ceil(this.numJoints / 8);

      var translations = new struct.BitVector_t;
      this.translations = translations.read(buf, offset, this.numJoints);
      offset += Math.ceil(this.numJoints / 8);
    }
  }
};

class ConicalViewFrustum extends struct.define({
  position: new struct.Vec3_t,
  direction: new struct.Vec3_t,
  angle: new struct.TwoByteFloatAngle_t,
  clip: new struct.TwoByteClipValue_t,
  radius: new struct.Float_t,
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
  static version() { return 45; }
};
class AvatarData extends struct.define({
  avatarDataSequenceNumber: new struct.Uint16_t,
  avatarData: new struct.Struct_t
}) {
  static version() { return 45; }
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
  getDataBytes() {
    if (typeof this.bytes != 'undefined') {
      return new Uint8Array(this.bytes.buffer, this.bytes.byteOffset + this.byteOffset);
    }
    else {
      return super.getDataBytes();
    }
  }
  read(data, offset) {
    let idx = 0;
    this.bytes = data;
    this.byteOffset = offset;
    this.updates = [];
    //let i = 0;
    while (idx < data.byteLength - offset) {
      let update = this.readAvatarUpdate(data, offset + idx);
      this.updates.push(update);
      //console.log("avatar",i++,update);
      idx += update.size();
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
  size() {
    return this.byteSize;
  }
  read(data, offset) {
    super.read(data, offset);
    this.avatardata = new AvatarDataUpdates();
    this.avatardata.read(data, offset + 16);
    this.byteSize = this.avatardata.size() + 16;
  }
};
class KillAvatar extends struct.define({
  uuid: new struct.UUID_t,
  reason: new struct.Uint8_t,
}) { };
class AvatarQuery extends struct.define({
  numberOfViews: new struct.Uint8_t,
  views: new struct.StructList_t,
}) {
  static version() { return 22; }
};
class SilentAudioFrame extends struct.define({
  sequence: new struct.Uint16_t,
  codec: new struct.String_t,
  samples: new struct.Int16_t,
  position: new struct.Vec3_t,
  orientation: new struct.Quat_t,
  boundingBoxCorner: new struct.Vec3_t,
  boundingBoxScale: new struct.Vec3_t,
}) {
  static version() { return 23; }
  read() {
    //console.log('FIXME - reading SilentAudioFrame is very different from writing it');
  }
};
class MixedAudio extends struct.define({
  sequence: new struct.Uint16_t,
  codec: new struct.String_t,
  audioData: new struct.ByteArray_t,
}) {
  static version() { return 23; }
};
class MicrophoneAudioNoEcho extends struct.define({
  sequence: new struct.Uint16_t,
  codec: new struct.String_t,
  channelFlag: new struct.Boolean_t,
  position: new struct.Vec3_t,
  orientation: new struct.Quat_t,
  boundingBoxCorner: new struct.Vec3_t,
  boundingBoxScale: new struct.Vec3_t,
  audioData: new struct.ByteArray_t
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
  AvatarQuery: AvatarQuery,
  SilentAudioFrame: SilentAudioFrame,
  MixedAudio: MixedAudio,
  MicrophoneAudioNoEcho: MicrophoneAudioNoEcho,
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
  AvatarQuery,
  SilentAudioFrame,
  MixedAudio,
  MicrophoneAudioNoEcho,
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
  FarGrabJoints,
  ConicalViewFrustum
};
