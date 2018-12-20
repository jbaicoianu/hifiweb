import { DependencyManager } from './dependencymanager.js';
import { HifiNode, NodeType, NodeTypeMap } from './node.js';
import { ConicalViewFrustum } from './packets.js';
import { HifiAvatar } from './avatar.js';
import { HifiAvatarManager } from './avatarmanager.js';
import { VOIP } from '../voip/voip.js';

class HifiClient extends EventTarget {
  constructor() {
    super();

    this.nodes = {};
    this.relayserver = 'wss://hifirelay.janusvr.com:8119';
    this.domain = 'hifi://janusvr';

    // Read domain from input, if specified
    // TODO - this should just be an argument when starting he client
    let domaininput = document.getElementById('domaininput');
    if (domaininput && domaininput.value) {
      this.domain = domaininput.value;
    }

    this.startTime = new Date().getTime();
    /*
    this.packetdebugger = document.createElement('struct-viewer');
    document.body.appendChild(this.packetdebugger);
    */

    //this.avatar = new HifiAvatar();
    this.avatars = new HifiAvatarManager();
    this.avatar = null;

    this.nodelist = DependencyManager.get('NodeList');

    this.voip = new VOIP();
    this.voip.addEventListener('voipdata', (ev) => this.handleVOIPData(ev));
    this.audiobuffer = [];

    this.nodelist.connectToRelay(this.relayserver, this.domain);
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
  startNegotiateAudioFormatTimer() {
    if (!this.negotiateAudioFormatTimer) {
      this.nodes.audio.addPacketHandler('SelectedAudioFormat', (packet) => this.handleSelectedAudioFormat(packet));
      this.negotiateAudioFormatTimer = setInterval(() => this.negotiateAudioFormat(), 250);
    }
  }
  negotiateAudioFormat() {
    let pack = this.nodes.audio.createPacket('NegotiateAudioFormat');
    pack.payload.codecs = ['pcm'];
console.log('negotiate audio!', pack, pack.hmac);
    this.nodes.audio.sendPacket(pack);
  }
  startAvatarUpdates() {
    // FIXME - need to register with Entity server?

console.log('start avatar updates', this.sessionUUID);
    this.avatar = this.avatars.newOrExistingAvatar(this.sessionUUID);
    let displayname = document.getElementById('displaynameinput');
    if (displayname && displayname.value) {
      this.avatar.setDisplayName(displayname.value);
    }
    this.avatar.sendIdentityPacket(this.nodes.avatar);

    setInterval(() => this.sendAvatarUpdate(), 20);

    this.nodes.avatar.addPacketHandler('BulkAvatarData', (packet) => this.handleBulkAvatarData(packet));
    this.nodes.avatar.addPacketHandler('AvatarIdentity', (packet) => this.handleAvatarIdentity(packet));
    this.nodes.avatar.addPacketHandler('KillAvatar', (packet) => this.handleKillAvatar(packet));
  }
  sendAvatarUpdate() {
    if (this.nodes.avatar && this.avatar.hasUpdates) {
      // https://github.com/highfidelity/hifi/blob/master/libraries/avatars/src/AvatarData.cpp#L2152-L2188
      let pack = this.nodes.avatar.createPacket('AvatarData');
      pack.payload.updateFromAvatar(this.avatar);
      this.nodes.avatar.sendPacket(pack);

      let pack2 = this.nodes.avatar.createPacket('AvatarQuery');
      pack2.payload.numberOfViews = 1;
      var views = [];
      let view = new ConicalViewFrustum();
      view.position = this.avatar.position;
      view.direction =  this.avatar.view_dir;
      view.angle = 1.0; //DEFAULT_VIEW_ANGLE
      view.clip = 100.0; //DEFAULT_VIEW_FAR_CLIP
      view.radius = 10.0; //DEFAULT_VIEW_RADIUS
      views.push(view);
      pack2.payload.views = views;
      this.nodes.avatar.sendPacket(pack2);
      //console.log(pack2);

      this.avatar.clearUpdates();
    }
  }
  reset() {
    console.log('TODO - domain handler reset');
  }
  setPermissions(permissions) {
    // TODO - parse permissions based on bitmask
    // https://github.com/highfidelity/hifi/blob/master/libraries/networking/src/LimitedNodeList.cpp#L152-L18
    // https://github.com/highfidelity/hifi/blob/master/libraries/networking/src/NodePermissions.h#L67-L79
    this.permissions = permissions;
  }
  setAuthenticatePackets(authenticate) {
    this.authenticate = authenticate;
  }
  startIcePingTimer() {
    if (!this.icePingTimer) {
      this.icePingTimer = setInterval(() => this.sendIcePing(), 1000);
      this.domainListRequestTimer = setInterval(() => this.sendDomainListRequest(), 1000);
    }
  }
  sendIcePing() {
    if (this.connected) {
      let ping = this.nodes.domain.createPacket('ProxiedICEPing', { pingType: 2 });
      this.nodes.domain.sendPacket(ping);
    }
  }
  sendDomainListRequest() {
    if (this.connected) {
      let domainlistrequest = this.nodes.domain.createPacket('ProxiedDomainListRequest', {});
//console.log('proxieddomainlistrequest!', domainlistrequest);
      this.nodes.domain.sendPacket(domainlistrequest);
    }
  }
  sendIcePingReply(ping) {
    if (this.connected) {
      let pingreply = this.nodes.domain.createPacket('ProxiedICEPingReply', {
        pingType: ping.pingType
      });
      this.nodes.domain.sendPacket(pingreply);
    }
  }
  stopIcePingTimer() {
    if (this.icePingTimer) {
      clearTimeout(this.icePingTimer);
      this.icePingTimer = false;
    }
    if (this.domainListRequestTimer) {
      clearTimeout(this.domainListRequestTimer);
      this.domainListRequestTimer = false;
    }
  }
  stopNegotiateAudioFormatTimer() {
    if (this.negotiateAudioFormatTimer) {
      clearTimeout(this.negotiateAudioFormatTimer);
      this.negotiateAudioFormatTimer = false;
    }
  }
  stopSilentAudioTimer() {
    if (this.silentAudioTimer) {
      clearTimeout(this.silentAudioTimer);
      this.silentAudioTimer = false;
    }
  }
  handleIcePing(packet) {
    this.sendIcePingReply(packet);
  }
  handleIcePingReply(packet) {
//console.log('pingreply!', packet);
  }
  handleDomainList(packet) {
    // Based on NodeList::processDomainServerList
    // https://github.com/highfidelity/hifi/blob/master/libraries/networking/src/NodeList.cpp#L616
    this.dispatchEvent(new CustomEvent('receivedDomainServerList'));
    //console.log('domain list', packet)

    if (this.connected && this.domainHandler.getUUID() != packet.domainUUID) {
      console.warn('IGNORING DomainList packet from ' + packet.domainUUID + ' while connected to ' + this.domainHandler.getUUID());
      return;
    }

    // when connected, if the session ID or local ID were not null and changed, we should reset
    if (this.connected &&
        ((this.sessionLocalID != HifiNode.NULL_LOCAL_ID && packet.sessionLocalID != this.sessionLocalID) ||
         (this.sessionUUID && packet.sessionUUID != this.sessionUUID))) {
      console.log('Local ID or Session ID changed while connected to domain - forcing reset');
      this.reset(true);

      // tell the domain handler that we're no longer connected so that below
      // it can re-perform actions as if we just connected
      this.connected = false;
    }

    this.sessionLocalID = packet.sessionLocalID;
    this.sessionUUID = packet.sessionUUID;

    let newconnection = false;
    // If this was the first domain-server list from this domain, we've now connected
    if (!this.connected) {
      //this.domainHandler.setLocalID(packet.domainLocalID);
      this.domainHandler.domainSessionLocalID = packet.domainLocalID;
      this.domainHandler.uuid = packet.domainUUID;
      this.connected = true;
      this.dispatchEvent(new CustomEvent('connect'));
      newconnection = true;
      this.startIcePingTimer();
    }

    this.setPermissions(packet.permissions);
    this.setAuthenticatePackets(packet.authenticated);

    for (let i = 0; i < packet.nodes.length; i++) {
      let n = packet.nodes[i],
          node = this.nodes[NodeTypeMap[n.nodeType]];
      if (node.uuid != n.uuid) {
        node.updateNode(n, packet.sessionLocalID);
        this.dispatchEvent(new CustomEvent('node_change', { detail: node }));
      }
    }
    if (newconnection) {
      setTimeout(() => {
            this.startAvatarUpdates();
            this.startNegotiateAudioFormatTimer();
      }, 500);
    }
  }
  handleAvatarIdentity(packet) {
//console.log('got avatar identity', packet);
    this.avatars.processAvatarIdentityPacket(packet);
  }
  handleBulkAvatarData(packet) {
//console.log('got bulk avatar data', packet);
    this.avatars.processAvatarDataPacket(packet);
  }
  handleKillAvatar(packet) {
console.log('got avatar kill', packet);
    this.avatars.processKillAvatarPacket(packet);
  }
  handleSelectedAudioFormat(packet) {
    this.stopNegotiateAudioFormatTimer();
    this.audioSequence = 0;
console.log('got selected audio format', packet);
    this.startSilentAudioTimer();
  }
  startSilentAudioTimer() {
    if (!this.silentAudioTimer) {
      this.nodes.audio.addPacketHandler('SilentAudioFrame', (packet) => this.handleSilentAudio(packet));
      this.nodes.audio.addPacketHandler('MixedAudio', (packet) => this.handleMixedAudio(packet));

      this.silentAudioTimer = setInterval(() => this.sendAudioPacket(), 10);
    }
  }
  handleSilentAudio(packet) {
    //console.log('got silent audio', packet);
  }
  handleMixedAudio(packet) {
    //console.log('mic data', packet);

    /*let pack = this.nodes.audio.createPacket('MicrophoneAudioNoEcho');
    pack.payload.sequence = this.audioSequence++;
    pack.payload.codec = '';
    pack.payload.channelFlag = 1;
    pack.payload.position = this.avatar.position;
    pack.payload.orientation = this.avatar.orientation;
    pack.payload.boundingBoxCorner = this.avatar.position;
    pack.payload.boundingBoxScale = {x: 0, y: 0, z: 0};
    pack.payload.audioData = packet.audioData;
    this.nodes.audio.sendPacket(pack);*/

    this.voip.processVOIPData(packet.audioData);
  }
  sendAudioPacket() {
    //console.log('silent audio');
    let pack;
    if (this.audiobuffer.length > 0) {
      pack = this.nodes.audio.createPacket('MicrophoneAudioNoEcho');
      pack.payload.channelFlag = 0;
      pack.payload.audioData = this.audiobuffer.shift();
    } else {
      pack = this.nodes.audio.createPacket('SilentAudioFrame');
      pack.payload.samples = 480;
    }

    pack.payload.sequence = this.audioSequence++;
    pack.payload.codec = '';
    pack.payload.position = this.avatar.position;
    pack.payload.orientation = this.avatar.orientation;
    pack.payload.boundingBoxCorner = this.avatar.position;
    pack.payload.boundingBoxScale = {x: 0, y: 0, z: 0};

    this.nodes.audio.sendPacket(pack);
  }
  handleVOIPData(ev) {
    this.audiobuffer.push(ev.detail);
  }
};

export {
  HifiClient
};
