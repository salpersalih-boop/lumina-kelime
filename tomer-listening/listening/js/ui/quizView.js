import { gradeQuiz, verdict, optionLetter } from '../core/scoring.js';
import { esc, listen, ICONS } from './dom.js';

/**
 * Soru ekranı: şıkları gösterir, "Cevapları Kontrol Et" ile puanlar,
 * doğruları yeşil, yanlışları kırmızı işaretler ve açıklamaları açar.
 *
 * @param {HTMLElement} root
 * @param {object} set
 * @param {{onGraded: (result: ReturnType<typeof gradeQuiz>) => void,
 *          onRetry: () => void, next: {label: string, href: string}|null}} hooks
 */
export function mountQuiz(root, set, { onGraded, onRetry, next }) {
  const { questions } = set;
  const qLang = set.questionLang ?? set.audio.lang; // sorular hedef dilde ya da Türkçe olabilir
  let confirmEmpty = false;
  let graded = false;

  const renderQuestion = (q, qi) => `
    <li class="ls-q" data-q="${esc(q.id)}">
      <fieldset>
        <legend><span class="ls-qn">${qi + 1}</span><span lang="${esc(qLang)}">${esc(q.prompt)}</span></legend>
        <div class="ls-opts">
          ${q.options.map((opt, oi) => `
            <label class="ls-opt">
              <input type="radio" name="${esc(q.id)}" value="${oi}">
              <span class="ls-letter">${optionLetter(oi)}</span>
              <span class="ls-opt-text" lang="${esc(qLang)}">${esc(opt)}</span>
              <span class="ls-mark" aria-hidden="true"></span>
            </label>`).join('')}
        </div>
      </fieldset>
    </li>`;

  root.innerHTML = `
    <form class="ls-quiz" novalidate aria-labelledby="ls-quiz-title">
      <div class="ls-result" hidden tabindex="-1"></div>
      <div class="ls-quiz-head">
        <h2 id="ls-quiz-title">Sorular</h2>
        <span><b class="ls-answered">0</b>/${questions.length} cevaplandı</span>
      </div>
      <div class="ls-progress" aria-hidden="true"><i></i></div>
      <ol class="ls-qlist">${questions.map(renderQuestion).join('')}</ol>
      <div class="ls-quiz-actions">
        <p class="ls-hint" role="status" aria-live="polite"></p>
        <button type="submit" class="ls-btn ls-btn-primary">${ICONS.check}Cevapları Kontrol Et</button>
      </div>
    </form>`;

  const form = root.querySelector('form');
  const hint = root.querySelector('.ls-hint');
  const counter = root.querySelector('.ls-answered');
  const bar = root.querySelector('.ls-progress i');
  const resultBox = root.querySelector('.ls-result');
  const actions = root.querySelector('.ls-quiz-actions');

  const collect = () => Object.fromEntries(questions.map(q => {
    const v = form.elements[q.id]?.value;
    return [q.id, v === '' || v == null ? undefined : Number(v)];
  }));

  function drawCount() {
    const answered = Object.values(collect()).filter(v => v !== undefined).length;
    counter.textContent = String(answered);
    bar.style.setProperty('--v', `${(answered / questions.length) * 100}%`);
  }

  function showResult(result) {
    result.items.forEach((item, i) => {
      const q = questions[i];
      const li = form.querySelector(`[data-q="${CSS.escape(q.id)}"]`);
      const labels = [...li.querySelectorAll('.ls-opt')];
      li.classList.add(item.isCorrect ? 'is-correct' : item.answered ? 'is-wrong' : 'is-skipped');
      labels.forEach((l, oi) => {
        l.classList.add('is-locked');
        if (oi === item.correct) {
          l.classList.add('is-correct');
          l.querySelector('.ls-mark').innerHTML = ICONS.check;
        } else if (oi === item.chosen) {
          l.classList.add('is-wrong');
          l.querySelector('.ls-mark').innerHTML = ICONS.cross;
        } else {
          l.classList.add('is-dim');
        }
      });

      const status = item.isCorrect
        ? 'Doğru!'
        : item.answered
          ? `Yanlış — doğru cevap ${optionLetter(item.correct)}`
          : `Boş bıraktın — doğru cevap ${optionLetter(item.correct)}`;

      li.querySelector('fieldset').insertAdjacentHTML('beforeend', `
        <div class="ls-fb ${item.isCorrect ? 'ok' : 'no'}">
          <p class="ls-fb-status">${status}</p>
          <p class="ls-fb-text">${esc(q.feedback)}</p>
          <p class="ls-fb-quote"><span>Metinde geçen cümle</span><q lang="${esc(set.audio.lang)}">${esc(q.evidence)}</q></p>
        </div>`);
    });

    form.querySelectorAll('input').forEach(input => { input.disabled = true; });

    const v = verdict(result.percent);
    resultBox.dataset.tone = v.tone;
    resultBox.innerHTML = `
      <div class="ls-result-ring" style="--p:${result.percent}" role="img" aria-label="${result.total} soruda ${result.score} doğru, yüzde ${result.percent}">
        <span><b>${result.score}/${result.total}</b><small>%${result.percent}</small></span>
      </div>
      <div>
        <h3>${esc(title(v.tone))}</h3>
        <p>${esc(v.text)}</p>
        <div class="ls-result-actions">
          <button type="button" class="ls-btn ls-btn-secondary" data-act="retry">${ICONS.restart}Tekrar dene</button>
          ${next ? `<a class="ls-btn ls-btn-primary" href="${next.href}">${esc(next.label)} ${ICONS.arrow}</a>` : ''}
        </div>
      </div>`;
    resultBox.hidden = false;
    actions.hidden = true;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultBox.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    resultBox.focus({ preventScroll: true });
  }

  function reset() {
    graded = false;
    confirmEmpty = false;
    form.reset();
    form.querySelectorAll('input').forEach(input => { input.disabled = false; });
    form.querySelectorAll('.ls-q').forEach(li => li.classList.remove('is-correct', 'is-wrong', 'is-skipped'));
    form.querySelectorAll('.ls-opt').forEach(l => {
      l.classList.remove('is-correct', 'is-wrong', 'is-dim', 'is-locked');
      l.querySelector('.ls-mark').innerHTML = '';
    });
    form.querySelectorAll('.ls-fb').forEach(fb => fb.remove());
    resultBox.hidden = true;
    actions.hidden = false;
    hint.textContent = '';
    drawCount();
  }

  const unsubs = [
    listen(form, 'change', () => {
      drawCount();
      confirmEmpty = false;
      hint.textContent = '';
    }),
    listen(form, 'submit', e => {
      e.preventDefault();
      if (graded) return;
      const answers = collect();
      const empty = questions.filter(q => answers[q.id] === undefined).length;
      if (empty && !confirmEmpty) {
        confirmEmpty = true;
        hint.textContent = `${empty} soru boş. Yine de kontrol etmek için butona tekrar bas.`;
        return;
      }
      graded = true;
      const result = gradeQuiz(questions, answers);
      showResult(result);
      onGraded(result);
    }),
    listen(resultBox, 'click', e => {
      if (e.target.closest('[data-act="retry"]')) {
        reset();
        onRetry();
        root.querySelector('.ls-quiz-head').scrollIntoView({ block: 'start' });
      }
    }),
  ];

  return { destroy: () => unsubs.forEach(fn => fn()) };
}

const title = tone => ({
  perfect: 'Kusursuz!',
  good: 'Çok iyi!',
  fair: 'Fena değil',
  low: 'Bir kez daha dene',
}[tone]);
