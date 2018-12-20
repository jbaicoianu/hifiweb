console.log('started the worker');

//import { NodeList } from './nodelist.js';

class NodeListWorker {
  connectToRelay(relay) {
    console.log('[NodeList-Worker] Starting connection to hifi relay', relay);
    this.webrtcoptions = {};
    this.peerconnection = null;
    this.channel = null;
    this.remoteCandidates = [];
    this.connected = false;
    this.signalserver = new WebSocket(relay);
    this.signalserver.addEventListener('close', (ev) => { this.connected = false; this.stopIcePingTimer(); this.stopNegotiateAudioFormatTimer(); this.stopSilentAudioTimer();});
    this.signalserver.addEventListener('error', (ev) => { this.connected = false; console.log('error!  reconnecting in 1sec...'); setTimeout(() => this.connectToRelay(), 1000); });
    this.signalserver.addEventListener('message', (ev) => { this.handleSignalMessage(ev); });
  }

  connectToDomain(domain) {
    var msg ={
      type: 'domain',
      domain_name: domain
      //username: 'test',
      //password: 'test'
    };
    this.signalserver.send(JSON.stringify(msg));
  }
  disconnectFromRelay() {
    for (var k in this.nodes) {
      delete this.nodes[k];
    }
    this.publicSocket.close();
    this.signalserver.close();
  }

  handleSignalMessage(event) {
    var msg = JSON.parse(event.data);
    //console.log("message", msg);

    switch (msg.type) {
      case 'candidate':
        if (msg.candidate && msg.candidate.candidate) {
          if (!this.hasAnswer) {
            this.remoteCandidates.push(msg.candidate);
          } else {
            console.log("[NodeList-Worker] Received ICE candidate", msg.candidate);
            this.peerconnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        }
        break;
      case 'answer':
        console.log("[NodeList-Worker] answer");
        this.peerconnection.setRemoteDescription(new RTCSessionDescription(msg))
        .then(() => {
          this.hasAnswer = true;
          var i = 0;
          for (i = 0; i < this.remoteCandidates.length; i++) {
            this.peerconnection.addIceCandidate(new RTCIceCandidate(this.remoteCandidates[i]));
          }
        });
        break;
      case 'connected':
        //Send Domain Name to relay for lookup
        this.connectToDomain(this.domain);

        this.peerconnection = new RTCPeerConnection({
          iceServers: [{
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
              "stun:stun3.l.google.com:19302",
              "stun:stun4.l.google.com:19302"
            ]}]}, this.webrtcoptions);
        console.log('[NodeList-Worker] Created peer connection', this.peerconnection);

        let dataConstraint = {};
        this.publicSocket = this.peerconnection.createDataChannel('datachannel', dataConstraint);
        this.publicSocket.addEventListener('message', (ev) => this.handlePacket(ev));
        console.log('[NodeList-Worker] Created data channel', this.peerconnection, this.publicSocket);

        let nodes = this.nodes;
        nodes.domain = new HifiNode(NodeType.DomainServer, this.publicSocket);
        this.domainHandler = nodes.domain;
        this.dispatchEvent(new CustomEvent('node_add', { detail: nodes.domain }));

        nodes.domain.addPacketHandler('DomainList', (packet) => this.handleDomainList(packet));
        nodes.domain.addPacketHandler('ICEPing', (packet) => this.handleIcePing(packet));
        nodes.domain.addPacketHandler('ICEPingReply', (packet) => this.handleIcePingReply(packet));

        nodes.avatar = new HifiNode(NodeType.AvatarMixer, this.publicSocket);
        nodes.audio = new HifiNode(NodeType.AudioMixer, this.publicSocket);
        nodes.asset = new HifiNode(NodeType.AssetServer, this.publicSocket);
        nodes.entity = new HifiNode(NodeType.EntityServer, this.publicSocket);
        nodes.entityscript = new HifiNode(NodeType.EntityScriptServer, this.publicSocket);
        nodes.message = new HifiNode(NodeType.MessagesMixer, this.publicSocket);

        this.dispatchEvent(new CustomEvent('node_add', { detail: nodes.avatar }));
        this.dispatchEvent(new CustomEvent('node_add', { detail: nodes.audio }));
        this.dispatchEvent(new CustomEvent('node_add', { detail: nodes.asset }));
        this.dispatchEvent(new CustomEvent('node_add', { detail: nodes.entity }));
        this.dispatchEvent(new CustomEvent('node_add', { detail: nodes.entityscript }));
        this.dispatchEvent(new CustomEvent('node_add', { detail: nodes.message }));

        // FIXME - ping handling should be handled by the nodes themselves, we're just doing one manually as a test for now
        //nodes.avatar.addPacketHandler('Ping', (packet) => this.handlePing(packet));
        //nodes.avatar.addPacketHandler('PingReply', (packet) => this.handlePingReply(packet));

        this.peerconnection.addEventListener('icecandidate', (ev) => this.handleICECandidate(ev));;
        this.peerconnection.createOffer().then((desc) => this.handleSdpOffer(desc), null);

        this.dispatchEvent(new CustomEvent('create'));

        break;
      default:
        console.log("[NodeList-Worker] unknown websocket message type", msg);
        break;
    }
  }

  handleSdpOffer(desc) {
    if (this.peerconnection) {
      this.peerconnection.setLocalDescription(desc);
      var msg ={
        type: 'offer',
        sdp: desc.sdp
      };
      console.log('[NodeList-Worker] Offer from PeerConnection \n', msg.sdp);

      this.signalserver.send(JSON.stringify(msg));
    }
  }
  handleICECandidate(event) {
    if (event.candidate) {
      var msg ={
        type: 'candidate',
        candidate: event.candidate
      };
      console.log('[NodeList-Worker] Send ICE candidate: \n' + event.candidate.candidate + '\n' + event.candidate.sdpMid + '\n' + event.candidate.sdpMLineIndex);
      this.signalserver.send(JSON.stringify(msg));
    }
  }
  handlePacket(event) {
    if (event.data) {
        //Check packet for the type of server that we are communicating with
        var servertype = String.fromCharCode((new Uint8Array(event.data.slice(0,1)))[0]);
        //console.log('servertype', servertype)

        //Send packet to correct node
        var nodedata = event.data.slice(1);
        this.nodes[NodeTypeMap[servertype]].handleNodePacket(nodedata);
    }
  }
  handleMessage(ev) {
    let msg = ev.data;
    if (msg.type == 'connect') {
      console.log('[NodeList-worker] connect');
      this.connectToRelay(ev.data.relay);
    }
  }
}

let nodelist = new NodeListWorker();

onconnect = function(ev) {
  let port = ev.ports[0];
  console.log('[NodeList-Worker] Connected a new port', port);
  port.onmessage = (msg) => {
    console.log('[NodeList-Worker] worker port got message', msg);
    nodelist.handleMessage(msg);
  }

  setInterval(() => port.postMessage({type: 'yup'}), 1000);
}

