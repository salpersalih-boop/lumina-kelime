import { esc } from '../dom.js';
import { hashOf } from '../../core/route.js';
import { meter } from './parts.js';

/**
 * Giriş ekranı: genel ilerleme + grup kartları. Grup, kataloğa göre bir
 * TÖMER seviyesi (A1 … C2) ya da bir dildir (İspanyolca, Portekizce …).
 * @param {HTMLElement} root
 * @param {{app: {kicker: string, heading: [string, string], intro: string, groupLabel: string},
 *          levels: {id: string, name: string, badge: string, total: number, done: number}[],
 *          stats: {done: number, total: number, average: number|null}}} model
 */
export function renderLevels(root, { app, levels, stats }) {
  root.innerHTML = `
    <div class="ls-screen">
      <header class="ls-head">
        <span class="ls-kicker">${esc(app.kicker)}</span>
        <h1 tabindex="-1">${esc(app.heading[0])} <span class="ls-grad-text">${esc(app.heading[1])}</span></h1>
        <p>${esc(app.intro)}</p>
      </header>

      <div class="ls-kpis">
        <div class="ls-kpi"><b>${stats.done}</b><span>tamamlanan metin</span></div>
        <div class="ls-kpi"><b>${stats.total}</b><span>toplam metin</span></div>
        <div class="ls-kpi"><b>${stats.average == null ? '–' : `%${stats.average}`}</b><span>ortalama başarı</span></div>
      </div>

      <nav aria-label="${esc(app.groupLabel)}">
        <ul class="ls-grid ls-grid-levels">
          ${levels.map(l => `<li>${levelCard(l)}</li>`).join('')}
        </ul>
      </nav>
    </div>`;
  return { destroy() {} };
}

function levelCard(l) {
  const body = `
    <span class="ls-level-code ${l.flag ? 'is-flag' : 'ls-grad-text'}" aria-hidden="true">${esc(l.badge)}</span>
    <span class="ls-level-name">${esc(l.name)}</span>
    <span class="ls-level-meta">${l.total ? `${l.total} metin · ${l.done} tamamlandı` : 'İçerik hazırlanıyor'}</span>
    ${l.total ? meter(l.done, l.total) : '<span class="ls-soon">Yakında</span>'}`;
  return l.total
    ? `<a class="ls-card ls-level" href="${hashOf({ name: 'sublevels', level: l.id })}" aria-label="${esc(l.name)}">${body}</a>`
    : `<div class="ls-card ls-level" aria-disabled="true">${body}</div>`;
}
