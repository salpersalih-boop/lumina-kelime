import { SEGMENT_GAP_MS } from '../../config.js';
import { Emitter } from '../../core/emitter.js';
import { loadVoices, assignVoices } from '../voices.js';
import { SpeechPlayer } from './speechPlayer.js';
import { AudioFilePlayer } from './audioFilePlayer.js';

/**
 * Bir set için uygun oynatıcıyı seçer (strateji/fabrika).
 *  - audio.src varsa → AudioFilePlayer (gerçek kayıt)
 *  - yoksa ve tarayıcı TTS destekliyorsa → SpeechPlayer
 *  - hiçbiri yoksa → UnsupportedPlayer (anlaşılır hata mesajı verir)
 *
 * @param {object} set doğrulanmış içerik seti
 * @param {{rate?: number, resolve: (path: string) => string}} opts
 */
export async function createPlayer(set, { rate, resolve }) {
  const segments = set.script;
  const playbackRate = rate ?? set.audio.rate ?? 1;

  if (set.audio.src) {
    return new AudioFilePlayer({ src: resolve(set.audio.src), rate: playbackRate, segments });
  }

  if (!('speechSynthesis' in globalThis) || typeof globalThis.SpeechSynthesisUtterance !== 'function') {
    return new UnsupportedPlayer();
  }

  const voices = await loadVoices();
  const isDialogue = Object.keys(set.speakers).length > 1;

  return new SpeechPlayer({
    segments,
    lang: set.audio.lang,
    rate: playbackRate,
    voiceMap: assignVoices(voices, set.audio.lang, set.speakers),
    gapMs: isDialogue ? SEGMENT_GAP_MS.dialogue : SEGMENT_GAP_MS.monologue,
  });
}

class UnsupportedPlayer extends Emitter {
  get kind() { return 'none'; }
  get state() { return 'idle'; }
  get rate() { return 1; }
  get duration() { return 0; }
  get isEstimate() { return true; }
  play() {
    this.emit('error', { message: 'Bu tarayıcı seslendirmeyi desteklemiyor. Chrome, Edge ya da Safari\'nin güncel sürümünü deneyin.' });
  }
  pause() {}
  toggle() { this.play(); }
  restart() { this.play(); }
  seek() {}
  setRate() {}
  destroy() { this.removeAll(); }
}
