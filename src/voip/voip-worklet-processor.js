import { RingBuffer } from '../utils/ringbuffer.js';
import { Resampler } from './resampler.js';
//import { pako } from '../utils/zlib.js';

export class VOIPWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new RingBuffer();
    this.inputbuffer = new RingBuffer();
    this.sampleRate = 24000;
    this.port.onmessage = (event) => this.handleMessage(event.data);
    console.log('Initialized VOIP worklet');
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
    if (inputs[0][0].length > 0) {
      var resampler = new Resampler(48000, this.sampleRate, 1, inputs[0][0]);
      resampler.resampler(inputs[0][0].length);

      this.port.postMessage({
        type: 'micdata',
        buffer: this.encode(resampler.outputBuffer)
      });

    }

    return true;
  }
  encode(input) {
    console.warn('VOIPWorkletProcessor called encode() on base class');
  }
  decode(output) {
    console.warn('VOIPWorkletProcessor called decode() on base class');
  }
  handleMessage(message) {
    this.buffer.add(this.decode(message));
  }
};
export class VOIPWorkletProcessorPCM extends VOIPWorkletProcessor {
  encode(input) {
    let encoded = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      encoded[i] = (input[i]) * 32768;
    }
    return encoded;
  }
  decode(output) {
    //console.log('worklet got data' + ' ' + message.buffer.byteLength + ', ' + message.buffer.byteOffset);
    // FIXME - it seems the data we're getting is a bit longer than the 960 bytes we expect.  Do we have a byte offset issue?
    let bufview = new DataView(output.buffer, output.byteOffset);

    let pcm16 = new Int16Array(output.length / 2);
    let pcmfloat = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      // read bytes as unsigned little endian pcm16 data
      pcm16[i] = bufview.getInt16(i * 2, true);
      // convert unsigned pcm16 data to float range from -1..1
      pcmfloat[i] = (pcm16[i] / 32768);
    }

    return pcmfloat;
  }
};
export class VOIPWorkletProcessorZlib extends VOIPWorkletProcessor {
  encode(input) {
    var bytes = window.pako.inflate(message, {to: 'arraybuffer'});
    console.log('got zlib data', message, bytes);
  }
  decode(output) {
  }
};
registerProcessor('voip-worklet-processor', VOIPWorkletProcessor);
registerProcessor('voip-worklet-processor-pcm', VOIPWorkletProcessorPCM);
registerProcessor('voip-worklet-processor-zlib', VOIPWorkletProcessorZlib);
