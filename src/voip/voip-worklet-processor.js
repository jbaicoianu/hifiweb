import { RingBuffer } from '../utils/ringbuffer.js';
import { Resampler } from './resampler.js';

export class VOIPWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new RingBuffer();
    this.sampleRate = 48000; // FIXME - I expected sampleRate to be 24000 acording to hifi's source, but it appear to be 48000
    this.port.onmessage = (event) => this.handleMessage(event.data);
    console.log('Initialized VOIP worklet');
  }
  process(inputs, outputs, parameters) {
    // TODO - we should be able to take microphone capture in as an input, then we could encode it and
    //        send it to the main thread using postMessage to be sent back to the server

    // Output buffered audio data as received from MixedAudio packets
    let output = outputs[0];
    let outputChannel = output[0];
    let buf = new Float32Array(outputChannel.length);
    
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
    // FIXME - it seems the data we're getting is a bit longer than the 960 bytes we expect.  Do we have a byte offset issue?
    let bufview = new DataView(message.buffer);

    let pcm16 = new Uint16Array(message.buffer.byteLength / 2);
    let pcmfloat = new Float32Array(pcm16.length);
    for (let i = 0; i < 480; i++) {
      // Read bytes as unsigned little endian pcm16 data
      pcm16[i] = bufview.getUint16(i * 2, true);

      // Convert unsigned pcm16 data to float range from -1..1
      pcmfloat[i] = ((pcm16[i] / 32767) - 1);
    }
    //console.log('pcm16: ' + pcm16.length + ', ' + pcm16.join(' '));
    //console.log('pcmfloat: ' + pcmfloat.length + ', ' + pcmfloat.join(' '));

    // Use Resampler class to resample to different rates, if needed
    // I expected the data to be sent as 24000 Hz, but it seems to be 48,000, or I'm handling channels wrong

    //var resampler = new Resampler(48000, this.sampleRate, 1, pcmfloat);
    //resampler.resampler(pcmfloat.length);
    //var newbuf = new Uint16Array(resampler.outputBuffer.length);

    // FIXME - Just using the float data mostly works, although it's very distorted
    this.buffer.add(pcmfloat);
  }
}
registerProcessor('voip-worklet-processor', VOIPWorkletProcessor);
