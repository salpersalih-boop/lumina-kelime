import { SPEED_OPTIONS } from '../config.js';
import { formatTime } from '../core/timing.js';
import { esc, listen, ICONS } from './dom.js';

const BAR_COUNT = 56;

/** Set id'sinden tekrarlanabilir dalga formu yükseklikleri üretir (dekoratif). */
function waveHeights(seed) {
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const envelope = 0.55 + 0.45 * Math.sin((i / BAR_COUNT) * Math.PI);
    return Math.round((0.25 + ((h >>> 8) % 1000) / 1000 * 0.75) * envelope * 100);
  });
}

/**
 * Özel ses oynatıcı arayüzü. Herhangi bir oynatıcı (TTS ya da dosya) ile çalışır.
 * @param {HTMLElement} root
 * @param {import('../services/players/speechPlayer.js').SpeechPlayer} player
 * @param {{setId: string, maxPlays: number|null, rate: number, onRateChange?: (r: number) => void}} opts
 */
export function mountAudioPlayer(root, player, { setId, maxPlays, rate, onRateChange }) {
  let plays = 0;
  let lastState = 'idle';
  let dragging = false;

  const bars = waveHeights(setId).map(h => `<span style="--h:${h}%"></span>`).join('');
  const speeds = SPEED_OPTIONS.map(s => `<option value="${s}" ${s === rate ? 'selected' : ''}>${s}×</option>`).join('');

  root.innerHTML = `
    <div class="player" data-state="idle">
      <div class="wave" aria-hidden="true">
        <div class="wave-base">${bars}</div>
        <div class="wave-fill">${bars}</div>
      </div>
      <div class="pl-main">
        <button type="button" class="pl-play" aria-label="Oynat">${ICONS.play}</button>
        <div class="pl-track" role="slider" tabindex="0" aria-label="Dinleme ilerlemesi"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00">
          <div class="pl-fill"></div><div class="pl-thumb"></div>
        </div>
        <span class="pl-time"><span class="pl-elapsed">0:00</span> / <span class="pl-total">${player.isEstimate ? '~' : ''}${formatTime(player.duration)}</span></span>
      </div>
      <div class="pl-tools">
        <button type="button" class="pl-btn pl-restart">${ICONS.restart}<span>Baştan</span></button>
        <label class="pl-speed"><span>Hız</span><select>${speeds}</select></label>
        <span class="pl-plays" ${maxPlays ? '' : 'hidden'}>Dinleme <b>0</b>/${esc(maxPlays ?? '')}</span>
      </div>
      <p class="pl-msg" role="status" aria-live="polite"></p>
    </div>`;

  const el = {
    box: root.querySelector('.player'),
    play: root.querySelector('.pl-play'),
    track: root.querySelector('.pl-track'),
    elapsed: root.querySelector('.pl-elapsed'),
    total: root.querySelector('.pl-total'),
    restart: root.querySelector('.pl-restart'),
    speed: root.querySelector('.pl-speed select'),
    plays: root.querySelector('.pl-plays b'),
    msg: root.querySelector('.pl-msg'),
  };

  const say = text => { el.msg.textContent = text; };
  const limitReached = () => maxPlays != null && plays >= maxPlays;

  /** Yeni bir dinleme başlatılabilir mi? (Duraklatıp devam etmek sayılmaz.) */
  function startListen() {
    if (limitReached()) {
      say(`Dinleme hakkın doldu (${maxPlays}/${maxPlays}). Cevaplarını kontrol et ya da "Tekrar dene" ile sıfırla.`);
      return false;
    }
    plays++;
    el.plays.textContent = String(plays);
    return true;
  }

  function setProgress({ ratio, elapsed, duration }) {
    const pct = (ratio * 100).toFixed(2);
    el.box.style.setProperty('--p', `${pct}%`);
    el.elapsed.textContent = formatTime(elapsed);
    el.total.textContent = `${player.isEstimate ? '~' : ''}${formatTime(duration)}`;
    el.track.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    el.track.setAttribute('aria-valuetext', formatTime(elapsed));
  }

  function setState(state) {
    lastState = state;
    el.box.dataset.state = state;
    const playing = state === 'playing';
    el.play.innerHTML = playing ? ICONS.pause : ICONS.play;
    el.play.setAttribute('aria-label', playing ? 'Duraklat' : state === 'ended' ? 'Yeniden dinle' : 'Oynat');
    if (state === 'ended') say(limitReached() ? 'Dinleme bitti. Dinleme hakkın doldu.' : 'Dinleme bitti.');
  }

  const seekFromPointer = e => {
    const r = el.track.getBoundingClientRect();
    player.seek((e.clientX - r.left) / r.width);
  };

  const unsubs = [
    player.on('state', setState),
    player.on('progress', setProgress),
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
    listen(el.speed, 'change', () => {
      const r = Number(el.speed.value);
      player.setRate(r);
      onRateChange?.(r);
    }),
    listen(el.track, 'pointerdown', e => {
      dragging = true;
      el.track.setPointerCapture(e.pointerId);
      seekFromPointer(e);
    }),
    listen(el.track, 'pointermove', e => { if (dragging) seekFromPointer(e); }),
    listen(el.track, 'pointerup', () => { dragging = false; }),
    listen(el.track, 'keydown', e => {
      const now = Number(el.track.getAttribute('aria-valuenow')) / 100;
      const step = { ArrowRight: 0.1, ArrowLeft: -0.1, Home: -1, End: 1 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      player.seek(Math.min(0.999, Math.max(0, now + step)));
    }),
  ];

  // Boşluk tuşu: sayfada yazı alanı odakta değilse oynat/duraklat.
  unsubs.push(listen(document, 'keydown', e => {
    if (e.code !== 'Space' || e.target.closest('input, select, textarea, button, [role="slider"]')) return;
    e.preventDefault();
    el.play.click();
  }));

  setProgress({ ratio: 0, elapsed: 0, duration: player.duration });

  return {
    /** "Tekrar dene" sonrasında dinleme hakkını sıfırlar. */
    resetPlays() {
      plays = 0;
      el.plays.textContent = '0';
      say('');
    },
    destroy() {
      unsubs.forEach(fn => fn());
      player.destroy();
    },
  };
}
