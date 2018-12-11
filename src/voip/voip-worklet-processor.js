import { RingBuffer } from '../utils/ringbuffer.js';
import { Resampler } from './resampler.js';

export class VOIPWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new RingBuffer();
    this.buffers = [];
    this.sampleRate = 24000;
    this.port.onmessage = (event) => this.handleMessage(event.data);
    console.log('Initialized VOIP worklet');
  }
  process(inputs, outputs, parameters) {

    // TODO - we should be able to take microphone capture in as an input, then we could encode it and
    //        send it to the main thread using postMessage to be sent back to the server

    // Output buffered audio data as received from MixedAudio packets
    let output = outputs[0];
    let outputChannel = output[0];
    //console.log('worklet process: ' + output.length + ', ' + output[0].length);
    let buf = new Float32Array(outputChannel.length);
    //console.log('output ' + outputChannel.length);
    
    //this.buffer.read(outputChannel, outputChannel.length);
    // Unroll ring buffer into output channel
    // FIXME - I'd expect to have to handle stereo channels directly here, but it's acting like a mono device
    this.buffer.read(buf, outputChannel.length);

    for (let i = 0; i < outputChannel.length; i++) {
      let idx = i;
      output[0][idx] = buf[i]; 
    }

    return true;
  }
  handleMessage(message) {
    //console.log('worklet got data' + ' ' + message.buffer.byteLength + ', ' + message.buffer.byteOffset);
    let bufview = new DataView(message.buffer);

    let pcm16 = new Uint16Array(message.buffer.dataLength / 2);
    let pcmfloat = new Float32Array(pcm16.length);
    for (let i = 0; i < 480; i++) {
      // Read bytes as unsigned little endian pcm16 data
      pcm16[i] = bufview.getUint16(i * 2, true);

      // Convert unsigned pcm16 data to float range from -1..1
      pcmfloat[i] = ((pcm16[i] / 32767) - 1);
    }

    //console.log(pcm16.join(' '));

    // Use Resampler class to resample to different rates, if needed
    // I expected the data to be sent as 24000 Hz, but it seems to be 48,000, or I'm handling channels wrong

    //var resampler = new Resampler(48000, this.sampleRate * 2, 1, pcmfloat);
    //resampler.resampler(pcmfloat.length);
    //var newbuf = new Uint16Array(resampler.outputBuffer.length);

    // FIXME - Just using the float data mostly works, although it's very distorted
    this.buffer.add(pcmfloat);
    //this.buffers.push(resampler.outputBuffer);
  }
}
registerProcessor('voip-worklet-processor', VOIPWorkletProcessor);
