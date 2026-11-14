import { Emitter } from '../../core/emitter.js';
import { clamp01 } from '../../core/timing.js';

/**
 * Gerçek ses kaydı (mp3/ogg) için oynatıcı. SpeechPlayer ile aynı arayüzü
 * uygular; set JSON'unda "audio.src" verilirse otomatik olarak bu kullanılır.
 * script satırlarında "start" (saniye) varsa metin vurgusu da çalışır.
 */
export class AudioFilePlayer extends Emitter {
  #audio;
  #starts;
  #state = 'idle';
  #segment = -1;
  #unbind = [];

  constructor({ src, rate = 1, segments = [], audio = new Audio() }) {
    super();
    this.#audio = audio;
    this.#audio.preload = 'metadata';
    this.#audio.src = src;
    this.#audio.playbackRate = rate;
    this.#starts = segments.map(s => s.start).filter(t => typeof t === 'number');

    const on = (type, fn) => {
      this.#audio.addEventListener(type, fn);
      this.#unbind.push(() => this.#audio.removeEventListener(type, fn));
    };
    on('play', () => this.#setState('playing'));
    on('pause', () => { if (!this.#audio.ended) this.#setState('paused'); });
    on('ended', () => this.#setState('ended'));
    on('timeupdate', () => this.#onTime());
    on('loadedmetadata', () => this.#onTime());
    on('error', () => this.emit('error', { message: 'Ses dosyası yüklenemedi.' }));
  }

  get kind() { return 'file'; }
  get state() { return this.#state; }
  get rate() { return this.#audio.playbackRate; }
  get duration() { return Number.isFinite(this.#audio.duration) ? this.#audio.duration : 0; }
  get isEstimate() { return false; }

  play() {
    if (this.#state === 'ended') this.#audio.currentTime = 0;
    this.#audio.play().catch(err => this.emit('error', { message: `Oynatılamadı: ${err.message}` }));
  }
  pause() { this.#audio.pause(); }
  toggle() { this.#audio.paused ? this.play() : this.pause(); }
  restart() { this.#audio.currentTime = 0; this.play(); }
  seek(ratio) { if (this.duration) this.#audio.currentTime = clamp01(ratio) * this.duration; }
  setRate(rate) { this.#audio.playbackRate = rate; }

  destroy() {
    this.#audio.pause();
    this.#unbind.forEach(fn => fn());
    this.#audio.removeAttribute('src');
    this.#audio.load();
    this.#state = 'destroyed';
    this.removeAll();
  }

  #onTime() {
    const t = this.#audio.currentTime;
    const d = this.duration;
    this.emit('progress', { ratio: d ? clamp01(t / d) : 0, elapsed: t, duration: d });

    if (this.#starts.length) {
      let i = 0;
      while (i < this.#starts.length - 1 && t >= this.#starts[i + 1]) i++;
      if (i !== this.#segment) {
        this.#segment = i;
        this.emit('segment', i);
      }
    }
  }

  #setState(state) {
    this.#state = state;
    this.emit('state', state);
  }
}
