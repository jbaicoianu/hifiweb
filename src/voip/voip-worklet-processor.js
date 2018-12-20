import { RingBuffer } from '../utils/ringbuffer.js';
import { Resampler } from './resampler.js';
import { DependencyManager } from '../hifi/dependencymanager.js';
//import { pako } from '../utils/zlib.js';

export class VOIPWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new RingBuffer();
    this.inputbuffer = new RingBuffer();
    this.sampleRate = 24000;
    this.inputChunkSize = 240;
    this.port.onmessage = (event) => this.handleMessage(event);
    console.log('Initialized VOIP worklet');
    this.nodelist = DependencyManager.get('NodeList');
  }
  process(inputs, outputs, parameters) {
    // Output buffered audio data as received from MixedAudio packets
    let output = outputs[0];
    let outputChannel = output[0];
    let buf = new Float32Array(outputChannel.length);
    
    // Unroll ring buffer into output channel
    // FIXME - I'd expect to have to handle stereo channels directly here, but it's acting like a mono device
    this.buffer.read(buf, outputChannel.length);

    // Output audio stream from data we've received from the server
    for (let i = 0; i < outputChannel.length; i++) {
      let idx = i;
      output[0][idx] = buf[i];
      if (output[1]) {
        output[1][idx] = buf[i]; 
      }
    }

    // Capture microphone input, and send it to the main thread when we've queued more than a specified chunk size
    var resampler = new Resampler(48000, this.sampleRate, 1, inputs[0][0]);
    resampler.resampler(inputs[0][0].length);
    this.inputbuffer.add(resampler.outputBuffer);

    let bufferlength = this.inputbuffer.length();
    if (bufferlength >= this.inputChunkSize) {
      let chunk = new Float32Array(this.inputChunkSize);
      let inbuffer = new Int16Array(this.inputChunkSize);

      this.inputbuffer.read(chunk, this.inputChunkSize);

      let idx =  0;
      for (let i = 0; i < chunk.length; i++) {
        inbuffer[i] = (chunk[i]) * 32768;
      }

      this.sendAudioPacket(inbuffer);
    }

    return true;
  }
  sendAudioPacket(audiodata) {
    let pack;
    if (audiodata.length > 0) {
      pack = this.nodelist.createPacket('MicrophoneAudioNoEcho');
      pack.payload.channelFlag = 0;
      pack.payload.audioData = audiodata;
    } else {
      pack = this.nodelist.createPacket('SilentAudioFrame');
      pack.payload.samples = 480;
    }

    pack.payload.sequence = this.audioSequence++;
    pack.payload.codec = '';
/*
    pack.payload.position = this.avatar.position;
    pack.payload.orientation = this.avatar.orientation;
    pack.payload.boundingBoxCorner = this.avatar.position;
*/
    pack.payload.boundingBoxScale = {x: 0, y: 0, z: 0};

    this.nodelist.sendPacket(pack, 'audio');
  }
  handleMessage(message) {
    console.warn('VOIPWorkletProcessor called handleMessage() on base class');
  }
};
export class VOIPWorkletProcessorPCM extends VOIPWorkletProcessor {
  handleMessage(message) {
    if (message.data.messageport) {
      //this.dataport = message.data.messageport;
      //this.dataport.addEventListener('message', (ev) => console.log('audio worklet got message', ev));
      //this.dataport.start();
      this.nodelist.setDataPort(message.data.messageport);
      return;
    }
    //console.log('worklet got data' + ' ' + message.buffer.byteLength + ', ' + message.buffer.byteOffset);
    // FIXME - it seems the data we're getting is a bit longer than the 960 bytes we expect.  Do we have a byte offset issue?
    let bufview = new DataView(message.data.buffer, message.data.byteOffset);

    let pcm16 = new Int16Array(message.data.length / 2);
    let pcmfloat = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      // Read bytes as unsigned little endian pcm16 data
      pcm16[i] = bufview.getInt16(i * 2, true);
      // Convert unsigned pcm16 data to float range from -1..1
      pcmfloat[i] = (pcm16[i] / 32768);
    }

    /*
    // Test data: stereo interleaved sine wave
    for (let i = 0; i < pcm16.length - 1; i+=2) {
      pcmfloat[i+0] = Math.sin(i/pcm16.length * 2.0 * 3.14159 * 2.0);
      pcmfloat[i+1] = Math.sin(i/pcm16.length * 2.0 * 3.14159 * 2.0);
    }
    */

    //console.log('uint8: ' + message.data.length + ' entries, ' + message.data.join(' '));
    //console.log('pcm16: ' + pcm16.length + ' entries, ' + pcm16.join(' '));
    //console.log('pcmfloat: ' + pcmfloat.length + ', ' + pcmfloat.join(' '));

    // Use Resampler class to resample to different rates, if needed
    // I expected the data to be sent as 24000 Hz, but it seems to be 48,000, or I'm handling channels wrong

    //var resampler = new Resampler(48000, this.sampleRate, 1, pcmfloat);
    //resampler.resampler(pcmfloat.length);
    //var newbuf = new Uint16Array(resampler.outputBuffer.length);

    this.buffer.add(pcmfloat);
  }
};
export class VOIPWorkletProcessorZlib extends VOIPWorkletProcessor {
  handleMessage(message) {
    var bytes = window.pako.inflate(message.data, {to: 'arraybuffer'});
    console.log('got zlib data', message.data, bytes);
  }
};
registerProcessor('voip-worklet-processor', VOIPWorkletProcessor);
registerProcessor('voip-worklet-processor-pcm', VOIPWorkletProcessorPCM);
registerProcessor('voip-worklet-processor-zlib', VOIPWorkletProcessorZlib);
