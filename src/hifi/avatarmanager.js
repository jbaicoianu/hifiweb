// Based on https://github.com/highfidelity/hifi/blob/fac9188dfb6b83c561f75038c0b83039c0e9203b/interface/src/avatar/AvatarManager.h
import { HifiAvatar } from './avatar.js';

export class HifiAvatarManager extends EventTarget {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.avatars = {};
    this.myAvatar = null;
  }
  setSpace() {
  }
  getMyAvatar() {
    return this.myAvatar;
  }
  getMyAvatarPosition() {
    return (this.myAvatar ? this.myAvatar.position : null);
  }
  getAvatar(avatarID) {
    // TODO - This function should return a script proxy which exposes the Q_INVOKABLE methods to room scripts
    return this.getAvatarBySessionID(avatarID);
  }
  getAvatarBySessionID(sessionID) {
    if (this.avatars[sessionID]) {
      return this.avatars[sessionID];
    }
    return null;
  }
  getNumAvatarsUpdated(deltaTime) {
  }
  getNumAvatarsNotUpdated(deltaTime) {
  }
  updateMyAvatar(deltaTime) {
  }
  updateOtherAvatars(deltaTime) {
  }
  sendIdentityRequest(avatarID) {
  }
  setMyAvatarDataPacketsPaused(pause) {
  }
  postUpdate(deltaTime, scene) {
  }
  clearOtherAvatars() {
  }
  deleteAllAvatars() {
  }
  getObjectsToRemoveFromPhysics(motionStates) {
  }
  getObjectsToAddToPhysics(motionStates) {
  }
  getObjectsToChange(motionStates) {
  }
  handleChangedMotionStates(motionStates) {
  }
  handleCollisionEvents(collisionEvents) {
  }
  addAvatar(sessionUUID, mixer) {
  }
  processAvatarIdentityPacket(message, sendingNode) {
    // https://github.com/highfidelity/hifi/blob/2eb801bdc69eb4131948c7ed9c5446eb8122a8eb/libraries/avatars/src/AvatarHashMap.cpp#L287-L328
    // TODO - AvatarIdentity packets can apparently contain multiple identities, for now we just deal with the first one
    let avatarIdentity = message;
console.log('avatar identity!', message, this);
    let identityUUID = avatarIdentity.avatarSessionUUID;
    if (!identityUUID) {
      console.warn('Refusing to process identity packet for null avatar ID', message);
      return;
    }

    // TODO - this is where we'd implement avatar ignore functionality
    //if (!nodeList.isIgnoringNode(identityUUID) || nodeList.getRequestDomainListData())
    {
      let avatar = this.newOrExistingAvatar(identityUUID, sendingNode);
      avatar.processAvatarIdentity(avatarIdentity);
    }
  }
  newOrExistingAvatar(sessionUUID, sendingNode) {
    let avatar = this.avatars[sessionUUID];
    if (!avatar) {
      avatar = new HifiAvatar(sessionUUID);
      this.avatars[sessionUUID] = avatar;
    }
    return avatar;
  }
  processAvatarDataPacket(message, sendingNode) {
    message.updates.forEach(avatarUpdate => this.parseAvatarUpdate(avatarUpdate, sendingNode));
  }
  parseAvatarUpdate(avatarUpdate, sendingNode) {
    let avatar = this.newOrExistingAvatar(avatarUpdate.uuid);
    avatar.processAvatarData(avatarUpdate.avatardata, sendingNode);
  }
  processKillAvatarPacket(killAvatar, sendingNode) {
    let avatar = this.newOrExistingAvatar(killAvatar.uuid);
    avatar.processKillAvatar(killAvatar, sendingNode);
  }
};
