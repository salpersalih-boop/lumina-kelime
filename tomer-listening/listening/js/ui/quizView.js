import { gradeQuiz, verdict, optionLetter } from '../core/scoring.js';
import { esc, listen, ICONS } from './dom.js';

/**
 * Soru ekranı: şıkları gösterir, "Cevapları Kontrol Et" ile puanlar,
 * doğruları yeşil, yanlışları kırmızı işaretler ve açıklamaları açar.
 *
 * @param {HTMLElement} root
 * @param {object} set
 * @param {{onGraded: (result: ReturnType<typeof gradeQuiz>) => void,
 *          onRetry: () => void, next: {label: string}|null, onNext: () => void}} hooks
 */
export function mountQuiz(root, set, { onGraded, onRetry, next, onNext }) {
  const { questions } = set;
  let confirmEmpty = false;
  let graded = false;

  const renderQuestion = (q, qi) => `
    <li class="q" data-q="${esc(q.id)}">
      <fieldset>
        <legend><span class="qn">${qi + 1}</span><span class="qp" lang="en">${esc(q.prompt)}</span></legend>
        <div class="opts">
          ${q.options.map((opt, oi) => `
            <label class="opt">
              <input type="radio" name="${esc(q.id)}" value="${oi}">
              <span class="opt-letter">${optionLetter(oi)}</span>
              <span class="opt-text" lang="en">${esc(opt)}</span>
              <span class="opt-mark" aria-hidden="true"></span>
            </label>`).join('')}
        </div>
        <div class="fb" hidden></div>
      </fieldset>
    </li>`;

  root.innerHTML = `
    <form class="quiz" novalidate>
      <div class="quiz-head">
        <h3>Sorular</h3>
        <span class="quiz-count"><b>0</b>/${questions.length} cevaplandı</span>
      </div>
      <ol class="qlist">${questions.map(renderQuestion).join('')}</ol>
      <div class="result" hidden></div>
      <div class="quiz-actions">
        <p class="quiz-hint" role="status" aria-live="polite"></p>
        <button type="submit" class="btn btn-primary">Cevapları Kontrol Et</button>
      </div>
    </form>`;

  const form = root.querySelector('form');
  const hint = root.querySelector('.quiz-hint');
  const counter = root.querySelector('.quiz-count b');
  const resultBox = root.querySelector('.result');
  const actions = root.querySelector('.quiz-actions');

  const collect = () => Object.fromEntries(
    questions.map(q => [q.id, form.elements[q.id]?.value === '' || form.elements[q.id]?.value == null
      ? undefined
      : Number(form.elements[q.id].value)]),
  );

  function showResult(result) {
    result.items.forEach((item, i) => {
      const q = questions[i];
      const li = form.querySelector(`[data-q="${CSS.escape(q.id)}"]`);
      const labels = li.querySelectorAll('.opt');
      li.classList.add(item.isCorrect ? 'is-correct' : item.answered ? 'is-wrong' : 'is-skipped');
      labels[item.correct].classList.add('opt-correct');
      labels[item.correct].querySelector('.opt-mark').innerHTML = ICONS.check;
      if (item.answered && !item.isCorrect) {
        labels[item.chosen].classList.add('opt-wrong');
        labels[item.chosen].querySelector('.opt-mark').innerHTML = ICONS.cross;
      }

      const status = item.isCorrect
        ? 'Doğru'
        : item.answered
          ? `Yanlış — doğru cevap ${optionLetter(item.correct)}`
          : `Boş bıraktın — doğru cevap ${optionLetter(item.correct)}`;

      const fb = li.querySelector('.fb');
      fb.innerHTML = `
        <p class="fb-status">${status}</p>
        <p class="fb-text">${esc(q.feedback)}</p>
        <p class="fb-quote"><span>Metinde:</span> <q lang="en">${esc(q.evidence)}</q></p>`;
      fb.hidden = false;
    });

    form.querySelectorAll('input').forEach(input => { input.disabled = true; });

    const v = verdict(result.percent);
    resultBox.dataset.tone = v.tone;
    resultBox.innerHTML = `
      <div class="score" aria-label="Puan: ${result.total} soruda ${result.score} doğru">
        <span class="score-num">${result.score}<small>/${result.total}</small></span>
        <span class="score-pct">%${result.percent}</span>
      </div>
      <p class="score-text">${esc(v.text)}</p>
      <div class="score-actions">
        <button type="button" class="btn btn-ghost" data-act="retry">${ICONS.restart}Tekrar dene</button>
        ${next ? `<button type="button" class="btn btn-primary" data-act="next">${esc(next.label)} ${ICONS.arrow}</button>` : ''}
      </div>`;
    resultBox.hidden = false;
    actions.hidden = true;
    resultBox.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }

  function reset() {
    graded = false;
    confirmEmpty = false;
    form.reset();
    form.querySelectorAll('input').forEach(input => { input.disabled = false; });
    form.querySelectorAll('.q').forEach(li => li.classList.remove('is-correct', 'is-wrong', 'is-skipped'));
    form.querySelectorAll('.opt').forEach(l => {
      l.classList.remove('opt-correct', 'opt-wrong');
      l.querySelector('.opt-mark').innerHTML = '';
    });
    form.querySelectorAll('.fb').forEach(fb => { fb.hidden = true; fb.innerHTML = ''; });
    resultBox.hidden = true;
    actions.hidden = false;
    hint.textContent = '';
    counter.textContent = '0';
    form.querySelector('input')?.focus();
  }

  const unsubs = [
    listen(form, 'change', () => {
      const answered = Object.values(collect()).filter(v => v !== undefined).length;
      counter.textContent = String(answered);
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
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'retry') { reset(); onRetry(); }
      if (act === 'next') onNext();
    }),
  ];

  return { destroy: () => unsubs.forEach(fn => fn()) };
}
