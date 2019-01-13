import { AvatarGlobalPosition, AvatarOrientation, AvatarTrait } from './packets.js';
export class HifiAvatar {
  constructor(uuid=null, selfavatar=false) {
    this.uuid = uuid;
    this.displayName = 'unknown';
    this.position = new THREE.Vector3();
    this.orientation = new THREE.Quaternion();
    this.view_dir = new THREE.Quaternion();
    this.clearUpdates();
    this.sequenceId = 0;

    this.janusobj = room.createObject('object', { rotation: V(0, 180, 0) });
    let avataroptions = [
/*
      'matthew',
      'artemis',
      'matthew',
      'horseman',
      'fmotrac',
      //'opticalinterpreter',
      //'catmechsuit',
      //'catmechdress',
      'james',
      'mannequin',
      'llmale2',
*/
      'robimo'
    ];
    if (!selfavatar) {
      this.body = this.janusobj.createObject('object', {
        id: avataroptions[Math.floor(Math.random() * avataroptions.length)],
        scale: new THREE.Vector3(.0095, .0095, .0095),
        pos: V(0, -.8, 0)
      });
    }
    this.labelholder = this.janusobj.createObject('object', {
      pos: V(0, 2.0, 0),
      billboard: 'y'
    });
    this.label = this.labelholder.createObject('text', {
      rotation: V(0, 180, 0),
      text: this.displayName,
      font_scale: false,
      font_size: .08,
      col: '#00b4ef'
    });
  }
  setPosition(pos) {
    this.position.copy(pos);
    this.janusobj.pos = this.position;
    this.hasUpdates = true;
    this.sendPosition = true;
  }
  setOrientation(orientation) {
    this.orientation.copy(orientation);

    // FIXME - there seems to be a weird bug where if we send an unchanged orientation from the last frame, our position updates aren't processed
    //         Work around this by adding a random value, then renormalizing.
    this.orientation.x += (Math.random() - .5) / 20000;
    this.orientation.y += (Math.random() - .5) / 20000;
    this.orientation.z += (Math.random() - .5) / 20000;
    this.orientation.w += (Math.random() - .5) / 20000;
    this.orientation.normalize();

//player.orientation = this.orientation;
    if (this.body) {
      this.body.orientation.copy(this.orientation);
    }
    this.hasUpdates = true;
    this.sendOrientation = true;
  }
  setViewDir(view_dir) {
    this.view_dir.copy(view_dir);
  }
  clearUpdates() {
    this.hasUpdates = false;
    this.sendPosition = false;
    this.sendOrientation = false;
  }
  setDisplayName(displayName) {
    this.displayName = displayName;
//console.log(this.janusobj, displayName);
    if (displayName) {
      this.label.text = displayName;
    }
  }
  sendIdentityPacket(node) {
    // Send AvatarIdentity https://github.com/highfidelity/hifi/blob/db87fe96962fe63c847507ead32a11dad2f0f6ae/libraries/avatars/src/AvatarData.cpp#L1973-L1989
    let pack = node.createPacket('AvatarIdentity');
    pack.payload.avatarSessionUUID = this.uuid;
    pack.flags.reliable = true;
    pack.payload.numAttachments = 0;
    pack.payload.attachmentData = [];
    pack.payload.displayName = this.displayName;
    pack.payload.sessionDisplayName = this.displayName;
    pack.payload.isReplicated = false;
    pack.payload.lookAtSnappingEnabled = false;
    node.sendPacket(pack);
  }
  sendTraitPacket(node) {
    // Send SetAvatarTraits packet https://github.com/highfidelity/hifi/blob/e3e400c86f2d43b89df874ec16466845f8369117/libraries/avatars/src/ClientTraitsHandler.cpp#L68-L139
    let pack = node.createPacket('SetAvatarTraits');
    pack.flags.reliable = true;

    let trait = new AvatarTrait()

    //let skeletonURL = 'https://highfidelity.com/api/v1/commerce/entity_edition/28569047-6f1a-4100-af67-8054ec397cc3.fst?certificate_id=MEUCIGoOZWOLWUcOoh%2FUXCOMS2aTDg%2Fiz66nd8spKEynGqejAiEA3XtC83fe3rAWhTD79Xm%2FQeOzU6%2Bpxwe74v0W7f9YSwQ%3D'; // mannequin
    let skeletonURL = 'https://highfidelity.com/api/v1/commerce/entity_edition/6c5d04a5-7637-4c01-9424-03db55e9cb97.fst?certificate_id=MEYCIQDOE3NFsmfIsYomEYrVYbZiW2V7s0EyBW7sf6Otc8Xc%2FAIhANbMMfsCd55SICauJp1OW3gqSknO%2BBy2ZDmM67XeZ81a'; // robimo
    let textenc = new TextEncoder();

    trait.traitType = 0;
    trait.traitVersion = 1;
    trait.traitSize = skeletonURL.length;
    trait.traitData = textenc.encode(skeletonURL);

    pack.payload.traits.push(trait);

console.log('SEND TRAIT', pack);

    node.sendPacket(pack);
  }
  processAvatarIdentity(identity) {
    if (this.displayname != identity.displayName) {
      this.setDisplayName(identity.displayName);
    }
    if (this.displayname != identity.sessionDisplayName && identity.sessionDisplayName != null) {
      this.setDisplayName(identity.sessionDisplayName);
    }
    //console.log('processed identity packet', this.displayName, identity, this);
  }
  processAvatarData(avatarData) {
    //console.log('yup, got some updates', avatarData, this);
    avatarData.updates.forEach(update => {
      if (update instanceof AvatarGlobalPosition) {
        this.position.set(update.globalPosition.x, update.globalPosition.y, update.globalPosition.z);
        this.janusobj.pos = this.position;
//console.log(' - new avatar pos', this.position, update, avatarData, this);
      }
      if (update instanceof AvatarOrientation && this.body) {
//console.log(' - new avatar orientation', update);
        this.body.orientation.copy(update.orientation);
      }
    });
  }
  processAvatarTrait(trait) {
console.log('here is my trait', trait, this);
    // SkeletonURL
    if (trait.traitType == 0) {
      let encoder = new TextDecoder();
      let skeletonURL = encoder.decode(trait.traitData).substring(0, trait.traitSize);
      if (skeletonURL) {
  console.log('load fst from', elation.engine.assets.corsproxy + skeletonURL);
        let baseurl = elation.engine.assets.base.prototype.getBaseURL(skeletonURL);
        fetch(elation.engine.assets.corsproxy + skeletonURL).then(d => d.text()).then(t => this.parseFST(t, baseurl));
      }
    }
  }
  parseFST(fst, baseurl='') {
    let lines = fst.split('\n');
    let attrs = {};
    lines.forEach(l => {
      let keyval = l.split('=');
      if (keyval[0] && keyval[1]) {
        attrs[keyval[0].trim()] = keyval[1].trimStart();
      }
    });
console.log(fst);
    if (attrs.name && attrs.filename) {
console.log('new avatar model', attrs.name, attrs.filename);
      room.loadNewAsset('object', {
        id: attrs.name,
        src: elation.engine.assets.base.prototype.getFullURL(attrs.filename, baseurl)
      });
      if (this.body) {
        this.body.id = attrs.name;
      }
    }
  }
  processKillAvatar(killAvatar, sendingNode) {
    console.log('kill me!', killAvatar);
    this.janusobj.die();
  }
}
