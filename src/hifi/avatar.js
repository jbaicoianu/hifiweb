export class HifiAvatar {
  constructor() {
    this.position = new THREE.Vector3();
    this.orientation = new THREE.Quaternion();
    this.clearUpdates();
    this.sequenceId = 0;
  }
  setPosition(pos) {
    this.position.copy(pos);
    this.hasUpdates = true;
  }
  clearUpdates() {
    this.hasUpdates = false;
  }
}
