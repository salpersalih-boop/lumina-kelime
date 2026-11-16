import { esc, listen } from '../dom.js';
import { hashOf } from '../../core/route.js';
import { LENGTH_CLASSES } from '../../core/sets.js';
import { backLink, lengthChip, kindChip, timeChip, scoreBadge } from './parts.js';

/**
 * Bir zorluktaki metinlerin listesi; uzunluğa göre süzülebilir.
 * @param {HTMLElement} root
 * @param {{level: {id: string}, sublevel: {id: string, label: string},
 *          items: {n: number, title: string, topic: string, length: {id: string, label: string},
 *                  seconds: string, kind: string, questions: number, best: number|null}[],
 *          filter: string, onFilter: (id: string) => void}} model
 */
export function renderSets(root, { level, sublevel, items, filter, onFilter }) {
  const filters = [{ id: 'all', label: 'Tümü' }, ...LENGTH_CLASSES.map(c => ({ id: c.id, label: c.label }))];
  const done = items.filter(i => i.best != null).length;

  root.innerHTML = `
    <div class="ls-screen">
      ${backLink({ name: 'sublevels', level: level.id }, `${level.id} zorlukları`)}
      <header class="ls-head">
        <span class="ls-kicker">${esc(level.id)} · Dinleme</span>
        <h1 tabindex="-1"><span class="ls-grad-text">${esc(sublevel.label)}</span> metinler</h1>
        <p>${items.length} metin · ${done} tamamlandı. Bir metin seç; dinledikten sonra soruları cevapla.</p>
      </header>
      <div class="ls-toolbar">
        <div class="ls-seg" role="group" aria-label="Uzunluğa göre süz">
          ${filters.map(f => `<button type="button" data-filter="${f.id}" aria-pressed="${f.id === filter}">${esc(f.label)}</button>`).join('')}
        </div>
        <span class="ls-count" aria-live="polite"></span>
      </div>
      <ul class="ls-grid ls-grid-sets"></ul>
    </div>`;

  const list = root.querySelector('.ls-grid-sets');
  const count = root.querySelector('.ls-count');

  function draw(active) {
    const shown = active === 'all' ? items : items.filter(i => i.length.id === active);
    count.textContent = active === 'all' ? `${items.length} metin` : `${shown.length} / ${items.length} metin`;
    list.innerHTML = shown.map(it => `
      <li>
        <a class="ls-card ls-set ${it.best != null ? 'is-done' : ''}" href="${hashOf({ name: 'lesson', level: level.id, sub: sublevel.id, n: it.n })}">
          <div class="ls-set-top">
            <span class="ls-num">${it.n}</span>
            ${lengthChip(it.length)}
            ${scoreBadge(it.best)}
          </div>
          <h2 lang="en">${esc(it.title)}</h2>
          <p class="ls-set-topic">${esc(it.topic)}</p>
          <div class="ls-set-foot">
            ${timeChip(it.seconds)}
            ${kindChip(it.kind)}
            <span class="ls-chip">${it.questions} soru</span>
          </div>
        </a>
      </li>`).join('') || '<li class="ls-count">Bu uzunlukta metin yok.</li>';
    root.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === active)));
  }

  const off = listen(root, 'click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    draw(btn.dataset.filter);
    onFilter(btn.dataset.filter);
  });

  draw(filter);
  return { destroy: off };
}
