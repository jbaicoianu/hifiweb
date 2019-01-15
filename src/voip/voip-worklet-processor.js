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
      let buffer = inputs[0][0];

      // DEBUG - generate a pure sine wave tone before resampling
      /*
      buffer = new Float32Array(buffer.length);
      if (!this.sincounter) this.sincounter = 0;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.sin(this.sincounter++ / 100.0 * Math.PI);
      }
      */

      if (this.inputSampleRate != this.sampleRate) {
        /*
        if (!this.resampler.inputBufferLength) {
                this.resampler.inputBufferLength = buffer.length;
                this.resampler.initialize();
        }
        buffer = this.resampler.resampler(buffer);
        */
        // FIXME - resampler library introduces scratchiness, use a simple 48000->24000Hz conversion for now
        // TODO - reuse buffer to eliminate gc
        let buffer2 = new Float32Array(buffer.length / 2);
        for (let i = 0; i < buffer2.length; i++) {
          buffer2[i] = buffer[i * 2];
        }
        buffer = buffer2;
      }

      this.port.postMessage({
        type: 'voipdata',
        //buffer: this.encode(resampler.outputBuffer)
        buffer: this.encode(buffer)
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
    if (message.inputSampleRate) {
      this.inputSampleRate = message.inputSampleRate;
      this.resampler = new Resampler(this.inputSampleRate, this.sampleRate, 1);
    } else {
      this.buffer.add(this.decode(message));
    }
  }
};
export class VOIPWorkletProcessorPCM extends VOIPWorkletProcessor {
  encode(input) {
    // Encode into an array of Int16_t values representing PCM data
    let encoded = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      encoded[i] = (Math.max(-.9, Math.min(.9, input[i]))) * 32767;
    }
    return encoded;
  }
  decode(output) {
    // Encode into an array of Int16_t values representing PCM data
    //console.log('worklet got data' + ' ' + message.buffer.byteLength + ', ' + message.buffer.byteOffset);
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
