import { Emitter } from '../../core/emitter.js';
import { cumulative, estimateSeconds, locate, clamp01 } from '../../core/timing.js';

/**
 * Web Speech API ile metni cümle cümle seslendiren oynatıcı.
 *
 * Neden cümle cümle? speechSynthesis.pause()/resume() tarayıcılar arasında
 * güvenilir değil (Chrome uzun cümlelerde kesiliyor). Bunun yerine metin
 * parçalara bölünür; duraklatma = iptal, devam = o cümleden yeniden başlama.
 *
 * Olaylar: state ('idle'|'playing'|'paused'|'ended'), progress, segment, error
 * Tüm oynatıcılar (SpeechPlayer, AudioFilePlayer) aynı arayüzü uygular.
 */
export class SpeechPlayer extends Emitter {
  #synth;
  #segments;
  #lengths;
  #starts;
  #total;
  #lang;
  #rate;
  #voiceMap;
  #gapMs;

  #state = 'idle';
  #index = 0;
  #token = 0;       // eski utterance olaylarını yok saymak için
  #ratio = 0;
  #segStartedAt = 0;
  #boundary = -1;
  #raf = 0;
  #timer = 0;

  /**
   * @param {{segments: {text: string, speaker: string}[], lang: string, rate?: number,
   *          voiceMap: Map<string, {voice: SpeechSynthesisVoice|null, pitch: number}>,
   *          gapMs?: number, synth?: SpeechSynthesis}} opts
   */
  constructor({ segments, lang, rate = 1, voiceMap, gapMs = 300, synth = globalThis.speechSynthesis }) {
    super();
    this.#synth = synth;
    this.#segments = segments;
    this.#lengths = segments.map(s => s.text.length);
    ({ starts: this.#starts, total: this.#total } = cumulative(this.#lengths));
    this.#lang = lang;
    this.#rate = rate;
    this.#voiceMap = voiceMap;
    this.#gapMs = gapMs;
  }

  get kind() { return 'speech'; }
  get state() { return this.#state; }
  get rate() { return this.#rate; }
  /** Tahmini süre (sn). */
  get duration() { return estimateSeconds(this.#total, this.#rate); }
  get isEstimate() { return true; }

  play() {
    if (this.#state === 'playing' || this.#state === 'destroyed') return;
    if (this.#state === 'ended') this.#index = 0;
    this.#setState('playing');
    this.#speakCurrent();
  }

  pause() {
    if (this.#state !== 'playing') return;
    this.#stopSpeech();
    this.#setState('paused');
    // Devam edildiğinde cümlenin başından okunacak; ilerlemeyi oraya çek.
    this.#emitProgress(this.#starts[this.#index] / this.#total);
  }

  toggle() {
    this.#state === 'playing' ? this.pause() : this.play();
  }

  restart() {
    this.#stopSpeech();
    this.#index = 0;
    this.#emitProgress(0);
    this.#setState('idle');
    this.play();
  }

  /** @param {number} ratio 0–1 */
  seek(ratio) {
    const wasPlaying = this.#state === 'playing';
    this.#stopSpeech();
    this.#index = locate(this.#lengths, clamp01(ratio) * this.#total).index;
    this.#emitProgress(this.#starts[this.#index] / this.#total);
    this.emit('segment', this.#index);
    if (wasPlaying) {
      this.#speakCurrent();
    } else if (this.#state === 'ended') {
      this.#setState('paused');
    }
  }

  setRate(rate) {
    this.#rate = rate;
    if (this.#state === 'playing') {
      this.#stopSpeech();
      this.#speakCurrent();
    } else {
      this.#emitProgress(this.#ratio);
    }
  }

  destroy() {
    this.#stopSpeech();
    this.#state = 'destroyed';
    this.removeAll();
  }

  // ── iç işleyiş ─────────────────────────────────────────────

  #speakCurrent() {
    const token = ++this.#token;
    const seg = this.#segments[this.#index];
    const voice = this.#voiceMap.get(seg.speaker);

    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = this.#lang;
    u.rate = this.#rate;
    u.pitch = voice?.pitch ?? 1;
    if (voice?.voice) u.voice = voice.voice;

    u.onboundary = e => {
      if (token === this.#token && typeof e.charIndex === 'number') this.#boundary = e.charIndex;
    };
    u.onend = () => {
      if (token === this.#token) this.#advance(token);
    };
    u.onerror = e => {
      if (token !== this.#token || e.error === 'interrupted' || e.error === 'canceled') return;
      this.#stopSpeech();
      this.#setState('paused');
      this.emit('error', { message: `Seslendirme başarısız oldu (${e.error}).` });
    };

    this.#boundary = -1;
    this.#segStartedAt = performance.now();
    this.emit('segment', this.#index);

    if (this.#synth.paused) this.#synth.resume();
    this.#synth.speak(u);
    this.#tick(token);
  }

  #advance(token) {
    cancelAnimationFrame(this.#raf);
    const i = this.#index;
    this.#emitProgress((this.#starts[i] + this.#lengths[i]) / this.#total);

    if (i >= this.#segments.length - 1) {
      this.#index = 0;
      this.#setState('ended');
      return;
    }
    this.#index = i + 1;
    this.#timer = setTimeout(() => {
      if (token === this.#token && this.#state === 'playing') this.#speakCurrent();
    }, this.#gapMs);
  }

  /** Cümle içindeki ilerlemeyi boundary olayından, yoksa süre tahmininden hesaplar. */
  #tick(token) {
    const loop = () => {
      if (token !== this.#token) return;
      const len = this.#lengths[this.#index];
      const estMs = estimateSeconds(len, this.#rate) * 1000;
      const elapsed = (performance.now() - this.#segStartedAt) / estMs;
      const within = this.#boundary >= 0 ? this.#boundary / len : Math.min(elapsed, 0.95);
      this.#emitProgress((this.#starts[this.#index] + Math.min(within, 0.99) * len) / this.#total);
      this.#raf = requestAnimationFrame(loop);
    };
    this.#raf = requestAnimationFrame(loop);
  }

  #stopSpeech() {
    this.#token++;
    clearTimeout(this.#timer);
    cancelAnimationFrame(this.#raf);
    try { this.#synth.cancel(); } catch { /* yoksay */ }
  }

  #emitProgress(ratio) {
    this.#ratio = clamp01(ratio);
    this.emit('progress', { ratio: this.#ratio, elapsed: this.#ratio * this.duration, duration: this.duration });
  }

  #setState(state) {
    this.#state = state;
    this.emit('state', state);
  }
}
