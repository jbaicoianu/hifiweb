let globalpacketpool;
const nodecolors = {
  asset: 0x00b6a3,
  audio: 0xf39621,
  avatar: 0x93278f,
  entity: 0xef3b4e,
  message: 0x1398b,
  entityscript: 0x666633,
  domain: 0x33333,
};

room.registerElement('hificlient', {
  create() {
    if (typeof hifi !== 'undefined') {
console.log('GOT IT');
      this.hifi = new hifi.HifiClient();

      this.createObject('hifidebug', { hifi: this.hifi });
    } else {
      setTimeout(() => this.create(), 100);
    }
  },

  update() {
    this.updateAvatar();
  },

  updateAvatar() {
    if (this.hifi) {
      let pos = player.pos,
          avatar = this.hifi.avatar;
  
      if (pos.distanceTo(avatar.position) > .001) {
        this.hifi.avatar.setPosition(pos);
      }
    }
  }
});

room.registerElement('hifidebug', {
  hifi: null,
  create() {
    if (!this.hifi) {
      let hifi = document.getElementsByTagName('hifi-client');
      this.hifi = hifi[0].hifi;
    }
    console.log('new hifidebug', this.hifi);

    if (this.hifi) {
      this.server = room.createObject('hifidebug_client', { pos: V(0, 1, -2), js_id: "debugclient", hifi: this.hifi});
      //this.server.setClient(this.hifi);
    }
  },
  update() {
    //this.server.pos = player.localToWorld(V(0, 1, -2));
    //this.server.zdir = player.dir;
  }
});
room.registerElement('hifidebug_client', {
  hifi: null,
  create() {
    this.clientobj = this.createObject('object', {
      id: 'cube',
      col: V(0,0,1),
      scale: V(1.4,.25,.1),
    });
    this.clientlabel = this.createObject('text', {
      text: 'client',
      verticalalign: 'middle',
      pos: V(0, 0, .05),
      font_size: '.1',
      font_scale: false,
      thickness: .02,
    });

    this.domain = this.createObject('hifidebug_domain', {
      pos: V(0, 1, 0),
      hifi: this.hifi
    });
  },
  setClient(client) {
    this.hifi = client;
    if (this.domain) {
      this.domain.setClient(client);
    }
  }
});
room.registerElement('hifidebug_domain', {
  hifi: null,
  create() {
    this.domainobj = this.createObject('object', {
      id: 'cube',
      col: V(.5),
      scale: V(1.4,.35,.1),
      pos: V(0, 0, -.02)
    });
    this.indicator = this.createObject('object', {
      id: 'cylinder',
      col: 'red',
      scale: V(.04, .005, .04),
      rotation: V(90, 0, 0),
      pos: V(-.6, .0625, .03)
    });
    this.domainlabel = this.createObject('text', {
      text: 'unconnected',
      align: 'left',
      verticalalign: 'middle',
      font_size: '.075',
      thickness: .015,
      font_scale: false,
      pos: V(-.56, .08, .025),
      col: 'black'
    });
    if (this.hifi) this.setClient(this.hifi);
  },
  setClient(client) {
    this.hifi = client;
    if (client) {
      this.initDomain();
    } else {
      client.addEventListener('create', (ev) => this.initDomain());
    }
  },
  initDomain() {
    this.domainlabel.text = this.hifi.domain;
console.log('DEBUG UPDATE CLIENT', this.hifi, this.hifi.nodes);
    let i = 0;
    this.nodes = {};
    for (var k in this.hifi.nodes) {
      this.createNode(this.hifi.nodes[k]);
      i++;
    }
    this.indicator.col = 'green';
    this.hifi.addEventListener('node_add', (ev) => this.handleNodeAdd(ev));
    this.hifi.addEventListener('node_change', (ev) => this.handleNodeChange(ev));
  },
  updateNodePositions() {
    let i = 0;
    for (let k in this.nodes) {
      this.nodes[k].pos.z = .05;
      this.nodes[k].pos.y = -.075;
      this.nodes[k].pos.x = i * .2 - .6;
      i++;
    }
  },
  handleNodeAdd(ev) {
    let node = ev.detail;
    if (!this.nodes[node.type]) {
      this.createNode(node);
    } else {
      this.nodes[node.type].setNode(node);
    }
    this.updateNodePositions();
  },
  handleNodeChange(ev) {
    let node = ev.detail;
    if (!this.nodes[node.type]) {
      this.createNode(node);
    }
    this.updateNodePositions();
  },
  createNode(node) {
    let nodeobj = this.nodes[node.type] = this.createObject('hifidebug_node');
    nodeobj.setNode(node);
    this.updateNodePositions();
    return nodeobj;
  },
  pause() {
    for (let k in this.nodes) {
      this.nodes[k].pause();
    }
  },
  resume() {
    for (let k in this.nodes) {
      this.nodes[k].resume();
    }
  } 
});
room.registerElement('hifidebug_node', {
  node: null,
  create() {
    this.packets = { incoming: [], outgoing: [] };
    this.nodeobject = this.createObject('object', {
      id: 'cube',
      col: V(.8), //(this.node ? nodecolors[this.node.type] : V(1,1,0)),
      scale: V(.1,.1,.05),
      pos: V(0, -.05, 0)
    });
  },
  setNode(node) {
    this.node = node;
    if (!this.nodelabel) {
      this.nodelabel = this.createObject('text', {
        text: node.type,
        verticalalign: 'middle',
        font_size: '.02',
        thickness: .005,
        font_scale: false,
        col: nodecolors[node.type],
        pos: V(0, -.05, .025),
      });
    } else {
      this.nodelabel.col = nodecolors[node.type];
    }
    if (this.nodeobject) {
      //this.nodeobject.col = nodecolors[node.type];
    }
    node.addEventListener('receive', (ev) => this.handleReceive(ev));
    node.addEventListener('send', (ev) => this.handleSend(ev));
  },
  update() {
  },
  getPacketPool() {
    let useglobal = false;

    if (useglobal) {
      if (!globalpacketpool) {
        globalpacketpool = room.createObject('objectpool', { max: 20, preallocate: true, objecttype: 'hifidebug_packet' });
        globalpacketpool.objectargs = {
          //id: 'hifidebug_packet',
          //scale: V(.02, .06, .02),
          //col: V(1,0,0),
        };
      }
      return globalpacketpool;
    } else {
      if (!this.packetpool) {
        this.packetpool = room.createObject('objectpool', { max: 30, preallocate: true, objecttype: 'hifidebug_packet' });
        this.packetpool.objectargs = {
          //id: 'hifidebug_packet',
          //scale: V(.02, .06, .02),
          //col: V(1,0,0),
        };
      }
      return this.packetpool;
    }
  },
  pause() {
    this.paused = true;
    for (let k in this.children) {
console.log('pause', k, this.children[k]);
      this.children[k].vel = V(0,0,0);
    }
  },
  resume() {
    this.paused = false;
    let packetpool = this.getPacketPool();
    let pending = [];
    for (let i = 0; i < packetpool.pending.length; i++) {
      let p = packetpool.pending[i];
      if (p.parent == this) pending.push(p);
    }
    pending.forEach(p => { this.removeChild(p); packetpool.release(p); });
  },
  handleReceive(ev) {
    if (this.paused) return;
    let packetpool = this.getPacketPool();
    let obj = packetpool.grab({
      //col: V(1,0,0),
      //scale: V(.02, .06, .02),
      col: 'white',
      pos: V(-.02,0,-.035),
      //vel: V(0,-2,0),
      visible: true
    });
    //if (obj.id != 'sphere') obj.id = 'sphere';
    obj.vel.y = -2;
    if (obj.parent != this) {
      this.appendChild(obj);
    }
    obj.setPacket(ev.detail, false);
    setTimeout(() => { if (this == obj.parent && !this.paused) { this.removeChild(obj); packetpool.release(obj); } }, 350);
  },
  handleSend(ev) {
    if (this.paused) return;
    let packetpool = this.getPacketPool();
    let obj = packetpool.grab({
      //scale: V(.02, .06, .02),
      pos: V(.02,-.85,-.035),
      col: 'white',
      //vel: V(0,2,0),
      visible: true
    });
    //if (obj.id != 'sphere') obj.id = 'sphere';
    obj.vel.y = 2;
    if (obj.parent != this) {
      this.appendChild(obj);
    }
    //obj.col = V(1,1,0);
    obj.setPacket(ev.detail, true);
    setTimeout(() => { if (this == obj.parent && !this.paused) { this.removeChild(obj); packetpool.release(obj); } }, 350);
  }
});
room.registerElement('hifidebug_packet', {
  create() {
    this.packetobj = this.createObject('object', {
      id: 'cone',
      scale: V(.02, .06, .02),
      col: V(0,1,1),
      collision_id: 'sphere',
      collision_trigger: true
    });
/*
    this.packetlabel = this.createObject('text', {
      align: 'left',
      verticalalign: 'middle',
      pos: V(.02, 0, 0),
      font_size: .02,
      thickness: .002,
      font_scale: false,
      collision_id: '',
      text: '(unknown)'
    });
*/

    this.addEventListener('click', (ev) => this.handleClick(ev));
  },
  setPacket(packet, wasSent) {
    this.packet = packet;
    if (this.packetlabel) {
      if (this.packet.packetName) {
        this.packetlabel.text = this.packet.packetName;
      } else {
        this.packetlabel.text = '(unknown)';
      }
    } 
    if (this.packetobj) {
      if (wasSent) {
        this.packetobj.col = 'cyan';
        this.packetobj.rotation.z = 0;
      } else {
        this.packetobj.col = 'green';
        this.packetobj.rotation.z = 180;
      }
    }
  },
  handleClick(ev) {
console.log('CLICKED A PACKET', this.packet, ev, this);
  }
});
