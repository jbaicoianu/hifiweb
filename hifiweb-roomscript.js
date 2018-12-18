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
      this.hifi = new hifi.HifiClient();

      //this.createObject('hifidebug', { hifi: this.hifi });
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
          orientation = player.orientation._target,
          view_dir = player.view_dir,
          avatar = this.hifi.avatar;
  
      if (avatar) {
        if (pos.distanceTo(avatar.position) > .001) {
          avatar.setPosition(pos);
        }
        if (!orientation.equals(avatar.orientation)) {
          avatar.setOrientation(orientation);
        }
        if (!view_dir.equals(avatar.view_dir)) {
          avatar.setViewDir(view_dir);
        }
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
      collision_id: 'cylinder',
      collision_trigger: true,
      col: 'red',
      scale: V(.04, .005, .04),
      rotation: V(90, 0, 0),
      pos: V(-.6, .0625, .03),
      onclick: (ev) => {
        let hifi = this.hifi;
        if (!hifi.connected) {
          hifi.connectToRelay();
          this.indicator.col = 'yellow';
        } else {
          hifi.disconnectFromRelay();
          this.indicator.col = 'red';
        }
      }
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
    if (!this.nodes[node.typeName]) {
      this.createNode(node);
    } else {
      this.nodes[node.typeName].setNode(node);
    }
    this.updateNodePositions();
  },
  handleNodeChange(ev) {
    let node = ev.detail;
    if (!this.nodes[node.typeName]) {
      this.createNode(node);
    } else {
      this.nodes[node.typeName].setNode(node);
    }
    this.updateNodePositions();
  },
  createNode(node) {
    let nodeobj = this.nodes[node.typeName] = this.createObject('hifidebug_node');
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
      collision_id: 'cube',
      collision_trigger: true,
      col: V(.8), //(this.node ? nodecolors[this.node.typeName] : V(1,1,0)),
      scale: V(.1,.1,.05),
      pos: V(0, -.05, 0)
    });
    this.packetparticles = this.createObject('particle', {
      count: 500,
      scale: V(.02),
      col: V(1,0,0),
      duration: Infinity,
      pos: V(0,-.05,0),
      loop: true
    });
    this.packetlog = this.createObject('hifidebug_packetlog', {
      node: this.node
    });
    this.currentParticle = 0;

    this.nodeobject.addEventListener('click', (ev) => this.handleClick(ev));
  },
  setNode(node) {
    if (this.node !== node) {
      // FIXME - I don't think this works, we need bound member functions rather than fat arrow functions
      //node.removeEventListener('receive', (ev) => this.handleReceive(ev));
      //node.removeEventListener('send', (ev) => this.handleSend(ev));
      node.addEventListener('receive', (ev) => this.handleReceive(ev));
      node.addEventListener('send', (ev) => this.handleSend(ev));
    }
    this.node = node;
    if (!this.nodelabel) {
      this.nodelabel = this.createObject('text', {
        text: node.typeName,
        verticalalign: 'middle',
        font_size: '.02',
        thickness: .005,
        font_scale: false,
        col: nodecolors[node.typeName],
        pos: V(0, -.05, .025),
      });
    } else if (this.nodelabel.text != node.typeName) {
      this.nodelabel.text = node.typeName;
      this.nodelabel.col = nodecolors[node.typeName];
    }
    if (this.nodeobject) {
      //this.nodeobject.col = nodecolors[node.typeName];
    }
    // FIXME - I don't think this works, we need bound member functions rather than fat arrow functions
    //node.addEventListener('receive', (ev) => this.handleReceive(ev));
    //node.addEventListener('send', (ev) => this.handleSend(ev));
  },
  update() {
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
  },
  handleReceive(ev) {
    if (this.paused) return;
    let particles = this.packetparticles,
        num = this.currentParticle++ % particles.count,
        packet = ev.detail;

    this.packetlog.logRecv(packet);

    //let color = (packet.obfuscationlevel ? V(1,0,0) : V(0,1,0));
    let color;
    if (packet.controlBitAndType) {
      color = V(0,1,1);
    } else if (packet.obfuscationlevel) {
      color = V(1, 0, 0);
    } else {
      color = V(0,1,0);
    }
    particles.setPoint(num, V(-.02 + Math.random() / 50,-Math.random() / 5,-.035 + Math.random() / 50), V(0, -2, 0), V(0,0,0), color);
    setTimeout(() => { particles.setPoint(num, V(0, -9999, 0)); }, 400);
  },
  handleSend(ev) {
//console.log('handle send', this.packetlog.log.items);
    if (this.paused) return;
    let packet = ev.detail;
    let particles = this.packetparticles,
        num = this.currentParticle++ % particles.count;

    this.packetlog.logSend(packet);

    let color;
    if (packet.controlBitAndType) {
      color = V(0,1,1);
    } else {
      color = V(1,.5,0);
    }
    particles.setPoint(num, V(.02 + Math.random() / 50,-.85 + Math.random() / 5,-.035 + Math.random() / 50), V(0, 2, 0), V(0,0,0), color);
    setTimeout(() => { particles.setPoint(num, V(0, -9999, 0)); }, 400);
  },
  handleClick(ev) {
    console.log('show packet log', this.packetlog);

    this.packetlog.showLog();
  }
});
room.registerElement('hifidebug_packetlog', {
  node: null,
  create() {
    this.log = elation.elements.create('collection-simple', { }); // TODO - maybe a timeseries-optimized collection type would be a good idea here?
console.log('new packet log', this.log);
  },
  logSend(packet) {
/*
    this.log.add({
      dir: 'send',
      time: new Date().getTime(),
      packet: packet
    });
*/
  },
  logRecv(packet) {
/*
    this.log.add({
      dir: 'recv',
      time: new Date().getTime(),
      packet: packet
    });
*/
  },
  showLog() {
    if (!this.window) {
      this.panel = elation.elements.create('ui-window-content', {
        class: 'hifidebug-packetlog'
      });
      this.loglist = elation.elements.create('hifidebug-packetlist', {
        collection: this.log,
        itemcomponent: 'hifidebug-packet',
        append: this.panel,
        autoscroll: 1
      });
      this.window = elation.elements.create('ui-window', {
        title: "Packet log: " + this.node.typeName,
        content: this.panel,
        append: document.body
      });
    } else {
      this.window.show();
    }
console.log('show it', this.window);
  }
});
elation.elements.define('hifidebug-packetlist', class extends elation.elements.ui.list {
  render() {
    return;
  }
  oncollection_add(ev) {
    let wasScrollAtBottom = this.isScrollAtBottom(this.autoscrollmargin);

    let packet = elation.elements.create('hifidebug-packet', {
      value: ev.data.item,
      append: this
    });

    while (this.childNodes.length > 1000) {
      this.removeChild(this.firstChild);
    }

    this.applyAutoScroll(wasScrollAtBottom);
  }
});
elation.elements.define('hifidebug-packet', class extends elation.elements.ui.item {
  create() {
/*
    this.packetobj = this.createObject('object', {
      id: 'cone',
      scale: V(.02, .06, .02),
      col: V(0,1,1),
      collision_id: 'sphere',
      collision_trigger: true
    });
*/
//this.innerHTML = 'dood';

    if (this.value) this.setPacket(this.value);
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
  }
  setPacket(data) {
    let packet = data.packet;

    let header = document.createElement('h3'),
        subheader = document.createElement('h4'),
        flags = document.createElement('ul'),
        hex = document.createElement('pre');

    header.innerHTML = packet.packetName + ' (' + packet.packetType + ') ' + 'seqid ' + packet.sequenceNumber;

    if (data.dir == 'send') {
      this.className = 'sending';
      //subheader.innerHTML = packet.packet.srcAddr + ':' + packet.packet.segment.srcPort + ' <strong>=&gt;</strong> ' + packet.packet.dstAddr + ':' + packet.packet.segment.dstPort;
    } else {
      this.className = 'receiving';
      //subheader.innerHTML = packet.packet.dstAddr + ':' + packet.packet.segment.dstPort + ' <strong>&lt;=</strong> ' + packet.packet.srcAddr + ':' + packet.packet.segment.srcPort;
    }

    //hex.innerHTML += hexdumpstr(packet._data);

    let flag_control = document.createElement('li'),
        flag_reliable = document.createElement('li'),
        flag_message = document.createElement('li');

    flags.className = 'packetflags';

    flag_control.innerHTML = 'control';
    flag_reliable.innerHTML = 'reliable';
    flag_message.innerHTML = 'message';

    if (packet.flags) {
      if (packet.flags.control) flag_control.className = 'selected';
      if (packet.flags.reliable) flag_reliable.className = 'selected';
      if (packet.flags.message) flag_message.className = 'selected';
    }

    flags.appendChild(flag_control);
    flags.appendChild(flag_reliable);
    flags.appendChild(flag_message);

    subheader.appendChild(flags);

    this.appendChild(header);
    this.appendChild(subheader);
    //this.appendChild(hex);

    let structview = document.createElement('struct-view');
    structview.target = packet;
    this.appendChild(structview);

  }
});
