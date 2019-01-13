import { VOIPWorkletNode } from './voip-worklet-node.js';
import { VoipControls } from './voip-controls.js';
import { RingBuffer } from '../utils/ringbuffer.js';
//import { VOIPWorkletProcessor } from './voip-worklet-processor.js';

export class VOIP extends EventTarget {
  constructor() {
    super();
    console.log('init voip', this);

    this.inputbuffer = new RingBuffer(65535, Int16Array);
    this.context = new AudioContext();
    if (this.context.audioWorklet) {
      this.context.audioWorklet.addModule('src/voip/voip-worklet-processor.js').then(() => {
        this.worklet = new VOIPWorkletNode(this.context, 'voip-worklet-processor-pcm');
        this.worklet.connect(this.context.destination);
        if (this.audiosource) {
          this.audiosource.connect(this.worklet);
        }
        this.worklet.port.onmessage = (ev) => this.handleMessage(ev);
      }).catch((e, v) => {
        console.error('VOIP worklet failed to initialize', e, e.message);
      });
      document.body.addEventListener('keydown', (ev) => this.handleKeyDown(ev));
      document.body.addEventListener('keyup', (ev) => this.handleKeyUp(ev));

      this.controls = document.createElement('voip-controls');
      document.body.appendChild(this.controls);

    } else {
      console.log('no worklet support, disabling VOIP');
    }
  }
  processVOIPData(data) {
    this.worklet.processVOIPData(data);
  }
  startMicrophoneCapture() {
    console.log('start microphone capture');
    this.starting = true;
    navigator.mediaDevices.getUserMedia({audio: {echoCancellation: false, sampleRate: 24000}, video: false}).then((devices) => this.handleUserMedia(devices));
  }
  stopMicrophoneCapture() {
    if (this.audiosource && this.microphoneCapturing) {
      console.log('stop microphone capture');
      this.audiosource.mediaStream.getTracks()[0].stop();
      if (this.audiosource.numberOfOutputs > 0) {
        this.audiosource.disconnect(this.worklet);
      }
      this.audiosource = false;
      this.microphoneCapturing = false;
      this.controls.indicator.stop();
    }
    this.starting = false;
  }
  hasQueuedInput() {
    return this.inputbuffer.length() > 0;
  }
  getQueuedInput() {
    let len = this.inputbuffer.length();
    let data = new Int16Array(len);
    this.inputbuffer.read(data, len);
    return data;
  }
  handleUserMedia(stream) {
    if (this.starting) {
      console.log('got microphone media stream', stream);
      let source = this.context.createMediaStreamSource(stream);
      if (this.worklet) {
        source.connect(this.worklet);
console.log(this.controls.waveform);
        this.controls.waveform.attach(source);
      }
      this.audiosource = source;
      this.microphoneCapturing = true;
      this.controls.indicator.start();
      this.starting = false;
    }
  }
  handleMessage(ev) {
    this.inputbuffer.add(ev.data.buffer);
  }
  handleKeyDown(ev) {
    // FIXME - chrome seems to be firing in the way I'd expect from keypress, with keyrepeat. We can work with this, but it's weird behavior...
    if ((ev.key == 'v' || ev.key == 'V') && !this.microphoneCapturing ) {
      this.startMicrophoneCapture();
    }
  }
  handleKeyUp(ev) {
    if (ev.key == 'v' || ev.key == 'V') {
      this.stopMicrophoneCapture();
    }
  }
}

