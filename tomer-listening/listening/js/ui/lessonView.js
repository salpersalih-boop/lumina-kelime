import { createPlayer } from '../services/players/createPlayer.js';
import { mountAudioPlayer } from './audioPlayer.js';
import { mountQuiz } from './quizView.js';
import { mountTranscript } from './transcriptView.js';
import { esc } from './dom.js';

/**
 * Bir dinleme setinin tam ekranı: başlık + oynatıcı + metin + sorular.
 * Alt bileşenlerin yaşam döngüsünü yönetir; destroy() hepsini temizler.
 */
export async function mountLesson(root, { set, level, sublevel, position, rate, resolve, next, onNext, onResult, onRateChange }) {
  const voiceCount = Object.keys(set.speakers).length;
  const kind = voiceCount > 1 ? `Diyalog · ${voiceCount} konuşmacı` : 'Monolog';

  root.innerHTML = `
    <article class="lesson" aria-labelledby="lesson-title">
      <div class="lesson-side">
        <header class="lesson-head">
          <p class="lesson-tag"><span class="tag-lvl">${esc(level.id)}</span>${esc(sublevel.label)} · Metin ${position.n}/${position.count} · ${esc(set.topic)}</p>
          <h2 id="lesson-title" lang="en">${esc(set.title)}</h2>
          <p class="lesson-meta"><span class="len len-${esc(position.length.id)}">${esc(position.length.label)}</span> ${position.words} kelime · ${esc(kind)} · ${set.questions.length} soru</p>
          ${set.instructions ? `<p class="lesson-ins">${esc(set.instructions)}</p>` : ''}
        </header>
        <div class="slot-player"><div class="player player-loading" aria-busy="true">Sesler hazırlanıyor…</div></div>
        <div class="slot-transcript"></div>
      </div>
      <div class="lesson-main slot-quiz"></div>
    </article>`;

  const slot = name => root.querySelector(`.slot-${name}`);
  // Yuvaları await'ten önce yakala: bu sırada kullanıcı başka sete geçerse
  // root yeniden çizilir ve yeni dersin yuvalarına dokunmamalıyız.
  const playerSlot = slot('player');
  const transcript = mountTranscript(slot('transcript'), set);

  // Sorular ses motorunu beklemeden hemen gösterilir.
  let audioUi = null;
  const quiz = mountQuiz(slot('quiz'), set, {
    next,
    onNext,
    onGraded(result) {
      transcript.reveal(set.questions);
      onResult(result);
    },
    onRetry() {
      transcript.lock();
      audioUi?.resetPlays();
    },
  });

  let destroyed = false;
  const player = await createPlayer(set, { rate, resolve });
  if (destroyed || !playerSlot.isConnected) {
    player.destroy();
  } else {
    audioUi = mountAudioPlayer(playerSlot, player, {
      setId: set.id,
      maxPlays: set.audio.maxPlays ?? null,
      rate: player.rate,
      onRateChange,
    });
    player.on('segment', i => transcript.setActiveLine(i));
    player.on('state', s => { if (s === 'ended') transcript.setActiveLine(-1); });
  }

  return {
    destroy() {
      destroyed = true;
      audioUi?.destroy();
      quiz.destroy();
    },
  };
}

/** Henüz içerik eklenmemiş alt seviye için boş durum ekranı. */
export function renderEmpty(root, { level, sublevel, firstAvailable, onGo }) {
  const path = `content/${level.id.toLowerCase()}/${sublevel.id}/01.json`;
  root.innerHTML = `
    <section class="empty">
      <p class="lesson-tag"><span class="tag-lvl">${esc(level.id)}</span>${esc(sublevel.label)}</p>
      <h2>Bu alt seviyenin içeriği henüz eklenmedi</h2>
      <p>${esc(level.id)} ${esc(level.name)} · ${esc(sublevel.label)} için yeni bir set eklemek üzere
         <code>${esc(path)}</code> dosyasını oluşturup <code>content/manifest.json</code> içindeki listeye bu yolu ekle.
         Biçim için README'deki "İçerik şeması" bölümüne bak.</p>
      ${firstAvailable ? `<button type="button" class="btn btn-primary" data-go>${esc(firstAvailable.label)}</button>` : ''}
    </section>`;
  root.querySelector('[data-go]')?.addEventListener('click', onGo);
}
