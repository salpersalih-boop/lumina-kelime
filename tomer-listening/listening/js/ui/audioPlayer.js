import { SPEED_OPTIONS } from '../config.js';
import { formatTime } from '../core/timing.js';
import { esc, listen, ICONS } from './dom.js';

const BAR_COUNT = 64;
const RING_R = 60;
const RING_C = 2 * Math.PI * RING_R;

/** Konuşmacı renkleri (diyalogda kimin konuştuğu renkle de ayırt edilir; adı da yazılıdır). */
export const VOICE_COLORS = ['#6366f1', '#f57c6e', '#22c55e', '#eab308'];

/** Set id'sinden tekrarlanabilir dalga formu yükseklikleri üretir (dekoratif). */
function waveHeights(seed) {
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const envelope = 0.5 + 0.5 * Math.sin((i / BAR_COUNT) * Math.PI);
    return Math.round((0.22 + ((h >>> 8) % 1000) / 1000 * 0.78) * envelope * 100);
  });
}

/**
 * Ses oynatıcı arayüzü. Herhangi bir oynatıcı (TTS ya da dosya) ile çalışır.
 *
 * @param {HTMLElement} root
 * @param {import('../services/players/speechPlayer.js').SpeechPlayer} player
 * @param {{setId: string, maxPlays: number|null, rate: number,
 *          speakers: {id: string, name: string, color: string}[],
 *          lineSpeakers: string[],
 *          onRateChange?: (r: number) => void}} opts
 */
export function mountAudioPlayer(root, player, { setId, maxPlays, rate, speakers, lineSpeakers, onRateChange }) {
  let plays = 0;
  let lastState = 'idle';
  let dragging = false;

  const bars = waveHeights(setId).map((h, i) => `<span style="--h:${h}%;--i:${i}"></span>`).join('');
  // Setin kendi hızı (ör. 0.85) seçeneklerde yoksa listeye eklenir.
  const options = [...new Set([...SPEED_OPTIONS, rate])].sort((a, b) => a - b);
  const speeds = options.map(s => `<button type="button" data-rate="${s}" aria-pressed="${s === rate}">${s}×</button>`).join('');

  root.innerHTML = `
    <section class="ls-player" data-state="idle" aria-label="Ses oynatıcı">
      <svg width="0" height="0" aria-hidden="true" style="position:absolute">
        <defs><linearGradient id="ls-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--accent-1)"/><stop offset="1" stop-color="var(--accent-2)"/>
        </linearGradient></defs>
      </svg>

      <div class="ls-voices" aria-label="Konuşmacılar">
        ${speakers.map(s => `
          <span class="ls-voice" data-speaker="${esc(s.id)}" style="--voice:${s.color}">
            <b aria-hidden="true">${esc(s.name.charAt(0))}</b>${esc(s.name)}
          </span>`).join('')}
      </div>

      <div class="ls-play-wrap">
        <svg class="ls-play-ring" viewBox="0 0 132 132" aria-hidden="true">
          <circle class="track" cx="66" cy="66" r="${RING_R}"/>
          <circle class="fill" cx="66" cy="66" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${RING_C.toFixed(1)}"/>
        </svg>
        <button type="button" class="ls-play" aria-label="Dinle">${playIcon()}</button>
      </div>

      <p class="ls-time"><span class="ls-elapsed">0:00</span> <span>/ <span class="ls-total"></span></span></p>

      <div class="ls-wave" role="slider" tabindex="0" aria-label="Dinleme ilerlemesi"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00">
        <div class="ls-wave-bars">${bars}</div>
        <div class="ls-wave-bars fill" aria-hidden="true">${bars}</div>
        <div class="ls-wave-head" aria-hidden="true"></div>
      </div>

      <div class="ls-controls">
        <button type="button" class="ls-ctl ls-restart">${ICONS.restart}<span>Baştan</span></button>
        <div class="ls-speed"><span id="ls-speed-label">Hız</span>
          <div class="ls-seg" role="group" aria-labelledby="ls-speed-label">${speeds}</div>
        </div>
        ${maxPlays ? `<span class="ls-plays" aria-label="Dinleme hakkı">
            <span class="ls-plays-text">${maxPlays} hak</span>
            ${Array.from({ length: maxPlays }, () => '<i></i>').join('')}
          </span>` : ''}
      </div>
      <p class="ls-msg" role="status" aria-live="polite"></p>
    </section>`;

  const q = s => root.querySelector(s);
  const el = {
    box: q('.ls-player'),
    play: q('.ls-play'),
    ring: q('.ls-play-ring .fill'),
    wave: q('.ls-wave'),
    elapsed: q('.ls-elapsed'),
    total: q('.ls-total'),
    restart: q('.ls-restart'),
    msg: q('.ls-msg'),
    playsText: q('.ls-plays-text'),
    dots: [...root.querySelectorAll('.ls-plays i')],
    voices: [...root.querySelectorAll('.ls-voice')],
  };

  const say = text => { el.msg.textContent = text; };
  const limitReached = () => maxPlays != null && plays >= maxPlays;

  function drawPlays() {
    if (!maxPlays) return;
    el.dots.forEach((d, i) => d.classList.toggle('used', i < plays));
    const left = maxPlays - plays;
    el.playsText.textContent = left ? `${left} hak kaldı` : 'Hak bitti';
  }

  /** Yeni bir dinleme başlatılabilir mi? (Duraklatıp devam etmek sayılmaz.) */
  function startListen() {
    if (limitReached()) {
      say(`Dinleme hakkın doldu. Cevaplarını kontrol et ya da "Tekrar dene" ile sıfırla.`);
      return false;
    }
    plays++;
    drawPlays();
    return true;
  }

  function setProgress({ ratio, elapsed, duration }) {
    const pct = `${(ratio * 100).toFixed(2)}%`;
    el.box.style.setProperty('--p', pct);
    el.ring.style.strokeDashoffset = String((RING_C * (1 - ratio)).toFixed(1));
    el.elapsed.textContent = formatTime(elapsed);
    el.total.textContent = `${player.isEstimate ? '~' : ''}${formatTime(duration)}`;
    el.wave.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    el.wave.setAttribute('aria-valuetext', formatTime(elapsed));
  }

  function setSpeaker(lineIndex) {
    const id = lineSpeakers[lineIndex];
    el.voices.forEach(v => v.classList.toggle('is-speaking', lastState === 'playing' && v.dataset.speaker === id));
  }

  function setState(state) {
    lastState = state;
    el.box.dataset.state = state;
    const playing = state === 'playing';
    el.play.innerHTML = playing ? ICONS.pause : playIcon();
    el.play.setAttribute('aria-label', playing ? 'Duraklat' : state === 'ended' ? 'Yeniden dinle' : state === 'paused' ? 'Devam et' : 'Dinle');
    if (!playing) setSpeaker(-1);
    if (state === 'ended') say(limitReached() ? 'Dinleme bitti, hakkın doldu. Şimdi soruları cevapla.' : 'Dinleme bitti. Soruları cevapla ya da bir kez daha dinle.');
  }

  const seekFromPointer = e => {
    const r = el.wave.getBoundingClientRect();
    player.seek(Math.min(0.999, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  const unsubs = [
    player.on('state', setState),
    player.on('progress', setProgress),
    player.on('segment', setSpeaker),
    player.on('error', ({ message }) => say(message)),

    listen(el.play, 'click', () => {
      say('');
      if (lastState === 'playing') return player.pause();
      if ((lastState === 'idle' || lastState === 'ended') && !startListen()) return;
      player.play();
    }),
    listen(el.restart, 'click', () => {
      say('');
      if (startListen()) player.restart();
    }),
    listen(root, 'click', e => {
      const btn = e.target.closest('[data-rate]');
      if (!btn) return;
      const r = Number(btn.dataset.rate);
      root.querySelectorAll('[data-rate]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      player.setRate(r);
      onRateChange?.(r);
    }),
    listen(el.wave, 'pointerdown', e => {
      dragging = true;
      el.wave.setPointerCapture(e.pointerId);
      seekFromPointer(e);
    }),
    listen(el.wave, 'pointermove', e => { if (dragging) seekFromPointer(e); }),
    listen(el.wave, 'pointerup', () => { dragging = false; }),
    listen(el.wave, 'keydown', e => {
      const now = Number(el.wave.getAttribute('aria-valuenow')) / 100;
      const step = { ArrowRight: 0.1, ArrowLeft: -0.1, Home: -1, End: 1 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      player.seek(Math.min(0.999, Math.max(0, now + step)));
    }),
    // Boşluk tuşu: bir form öğesi odakta değilse oynat/duraklat.
    listen(document, 'keydown', e => {
      if (e.code !== 'Space' || e.target.closest('input, select, textarea, button, a, [role="slider"]')) return;
      e.preventDefault();
      el.play.click();
    }),
  ];

  drawPlays();
  setProgress({ ratio: 0, elapsed: 0, duration: player.duration });

  return {
    /** "Tekrar dene" sonrasında dinleme hakkını sıfırlar. */
    resetPlays() {
      plays = 0;
      drawPlays();
      say('');
    },
    destroy() {
      unsubs.forEach(fn => fn());
      player.destroy();
    },
  };
}

const playIcon = () => ICONS.play.replace('<svg ', '<svg class="ic-play" ');
