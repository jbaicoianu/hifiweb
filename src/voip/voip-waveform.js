export class VoipWaveform extends HTMLElement {
  connectedCallback() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.getAttribute('width') || 200;
    this.canvas.height = this.getAttribute('height') || 40;
    this.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

  }
  attach(source) {
    let audioctx = source.context;
console.log('attach to source', source);
    this.analyser = audioctx.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);
    if (!this.dataArray) {
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.update();
    }
  }
  update() {
    this.canvas.width = this.canvas.width;


    this.analyser.getByteTimeDomainData(this.dataArray);

    let ctx = this.ctx;

    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0,255,0)';
    ctx.beginPath();

    let bufferLength = this.analyser.frequencyBinCount;

    let slicewidth = this.canvas.width / bufferLength;
    for (let i = 0, x = 0; i < bufferLength; i++) {
      let y = (this.dataArray[i] / 128) * (this.canvas.height / 2);
      if (i == 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += slicewidth;
    }

    ctx.lineTo(this.canvas.width, this.canvas.height/2);
    ctx.stroke();


    requestAnimationFrame(() => this.update());
  }
};
customElements.define('voip-waveform', VoipWaveform);
