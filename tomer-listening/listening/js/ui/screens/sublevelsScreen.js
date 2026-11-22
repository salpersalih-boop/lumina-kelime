import { esc } from '../dom.js';
import { hashOf } from '../../core/route.js';
import { backLink, difficultyBars, ring } from './parts.js';

/**
 * Seçilen seviyenin zorlukları: Kolay / Orta / Zor kartları.
 * @param {HTMLElement} root
 * @param {{level: {id: string, name: string, flag?: string, app: {short: string, groupLabel: string}},
 *          subs: {id: string, label: string, rank: number, hint: string, details: string[],
 *                 total: number, done: number, questions: number}[]}} model
 */
export function renderSublevels(root, { level, subs }) {
  root.innerHTML = `
    <div class="ls-screen">
      ${backLink({ name: 'levels' }, level.app.groupLabel)}
      <header class="ls-head">
        <span class="ls-kicker">${esc(level.app.short)}</span>
        <h1 tabindex="-1">${level.flag ? `<span aria-hidden="true">${esc(level.flag)}</span> ` : `${esc(level.id)} · `}<span class="ls-grad-text">${esc(level.name)}</span></h1>
        <p>Bir zorluk seç. Her zorlukta kısa, orta ve uzun metinler karışık; böylece hem hızlı konuşmalara hem uzun anlatımlara alışırsın.</p>
      </header>
      <ul class="ls-grid ls-grid-subs">
        ${subs.map(s => `<li>${subCard(level, s)}</li>`).join('')}
      </ul>
    </div>`;
  return { destroy() {} };
}

function subCard(level, s) {
  const inner = `
    <div class="ls-sub-top">${difficultyBars(s.rank)}${s.total ? ring(s.done, s.total) : ''}</div>
    <div>
      <h2>${esc(s.label)}</h2>
      <p>${esc(s.hint)}</p>
    </div>
    <div class="ls-facts">
      <span class="ls-chip">${s.total ? `${s.total} metin` : 'Yakında'}</span>
      ${s.total ? `<span class="ls-chip">Metin başına ${s.questions} soru</span>` : ''}
      ${s.details.map(d => `<span class="ls-chip">${esc(d)}</span>`).join('')}
    </div>`;
  return s.total
    ? `<a class="ls-card ls-sub" href="${hashOf({ name: 'sets', level: level.id, sub: s.id })}">${inner}</a>`
    : `<div class="ls-card ls-sub" aria-disabled="true">${inner}</div>`;
}
