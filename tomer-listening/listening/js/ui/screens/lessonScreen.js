import { createPlayer } from '../../services/players/createPlayer.js';
import { mountAudioPlayer, VOICE_COLORS } from '../audioPlayer.js';
import { mountQuiz } from '../quizView.js';
import { mountTranscript } from '../transcriptView.js';
import { esc, ICONS } from '../dom.js';
import { backLink, lengthChip, kindChip, timeChip } from './parts.js';

/**
 * Ders ekranı: başlık → oynatıcı → sorular → (kontrolden sonra) dinleme metni.
 * Tek sütunlu, odaklı akış. Alt bileşenlerin yaşam döngüsünü yönetir.
 *
 * @param {HTMLElement} root
 * @param {{set: object, level: {id: string, label: string}, sublevel: {id: string, label: string},
 *          summary: {length: object, seconds: string, kind: string, words: number},
 *          position: {n: number, count: number},
 *          dots: {n: number, href: string, done: boolean}[],
 *          prev: string|null, next: {label: string, href: string}|null,
 *          rate: number|null, resolve: (p: string) => string,
 *          onResult: (r: object) => void, onRateChange: (r: number) => void}} opts
 */
export async function renderLesson(root, opts) {
  const { set, level, sublevel, summary, position, dots, prev, next } = opts;
  const speakerIds = Object.keys(set.speakers);
  const colors = Object.fromEntries(speakerIds.map((id, i) => [id, VOICE_COLORS[i % VOICE_COLORS.length]]));

  const pagerLink = (href, cls, label) => href
    ? `<a class="${cls}" href="${href}" aria-label="${label}">${ICONS.arrow}</a>`
    : `<span class="${cls} is-off" aria-hidden="true">${ICONS.arrow}</span>`;

  root.innerHTML = `
    <article class="ls-screen ls-lesson" aria-labelledby="ls-lesson-title">
      <div class="ls-lesson-top">
        ${backLink({ name: 'sets', level: level.id, sub: sublevel.id }, `${level.label} ${sublevel.label} metinleri`)}
        <nav class="ls-pager" aria-label="Metinler arasında geçiş">
          ${pagerLink(prev, 'prev', 'Önceki metin')}
          <span>${position.n} / ${position.count}</span>
          ${pagerLink(next?.sameSublevel ? next.href : null, 'next', 'Sonraki metin')}
        </nav>
      </div>

      <header class="ls-head">
        <div class="ls-chips">
          <span class="ls-chip">${esc(level.label)} · ${esc(sublevel.label)}</span>
          ${lengthChip(summary.length)}
          ${kindChip(summary.kind)}
          ${timeChip(summary.seconds)}
          <span class="ls-chip">${set.questions.length} soru</span>
        </div>
        <h1 id="ls-lesson-title" lang="${esc(set.audio.lang)}" tabindex="-1">${esc(set.title)}</h1>
        ${set.instructions ? `<p class="ls-ins">${esc(set.instructions)}</p>` : ''}
      </header>

      <div class="slot-player"><div class="ls-player ls-player-loading" aria-busy="true"><span class="ls-spinner"></span></div></div>
      <div class="slot-quiz"></div>
      <div class="slot-transcript"></div>

      ${dots.length > 1 ? `
      <nav class="ls-dots" aria-label="${esc(sublevel.label)} metinleri">
        ${dots.map(d => `<a href="${d.href}" class="${d.done ? 'is-done' : ''}" ${d.n === position.n ? 'aria-current="page"' : ''}
            aria-label="Metin ${d.n}${d.done ? ', tamamlandı' : ''}">${d.n}</a>`).join('')}
      </nav>` : ''}
    </article>`;

  const slot = name => root.querySelector(`.slot-${name}`);
  // Yuvaları await'ten önce yakala: bu sırada kullanıcı başka ekrana geçerse
  // root yeniden çizilir ve yeni ekranın yuvalarına dokunmamalıyız.
  const playerSlot = slot('player');
  const transcript = mountTranscript(slot('transcript'), set, colors);

  let audioUi = null;
  const quiz = mountQuiz(slot('quiz'), set, {
    next,
    onGraded(result) {
      transcript.reveal(set.questions);
      opts.onResult(result);
    },
    onRetry() {
      transcript.lock();
      audioUi?.resetPlays();
    },
  });

  let destroyed = false;
  const player = await createPlayer(set, { rate: opts.rate, resolve: opts.resolve });
  if (destroyed || !playerSlot.isConnected) {
    player.destroy();
  } else {
    audioUi = mountAudioPlayer(playerSlot, player, {
      setId: set.id,
      maxPlays: set.audio.maxPlays ?? null,
      rate: player.rate,
      speakers: speakerIds.map(id => ({ id, name: set.speakers[id].name, color: colors[id] })),
      lineSpeakers: set.script.map(l => l.speaker),
      onRateChange: opts.onRateChange,
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
