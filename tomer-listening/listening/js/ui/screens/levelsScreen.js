import { esc } from '../dom.js';
import { hashOf } from '../../core/route.js';
import { meter } from './parts.js';

/**
 * Giriş ekranı: genel ilerleme + seviye kartları (A1 … C2).
 * @param {HTMLElement} root
 * @param {{levels: {id: string, name: string, total: number, done: number}[],
 *          stats: {done: number, total: number, average: number|null}}} model
 */
export function renderLevels(root, { levels, stats }) {
  root.innerHTML = `
    <div class="ls-screen">
      <header class="ls-head">
        <span class="ls-kicker">TÖMER · İngilizce</span>
        <h1 tabindex="-1">Dinleme ve <span class="ls-grad-text">Anlama</span></h1>
        <p>Seviyeni seç, kısa ve uzun metinleri dinle, soruları cevapla. Her sorunun açıklaması metindeki cümleyi gösterir.</p>
      </header>

      <div class="ls-kpis">
        <div class="ls-kpi"><b>${stats.done}</b><span>tamamlanan metin</span></div>
        <div class="ls-kpi"><b>${stats.total}</b><span>toplam metin</span></div>
        <div class="ls-kpi"><b>${stats.average == null ? '–' : `%${stats.average}`}</b><span>ortalama başarı</span></div>
      </div>

      <nav aria-label="Seviyeler">
        <ul class="ls-grid ls-grid-levels">
          ${levels.map(l => `<li>${levelCard(l)}</li>`).join('')}
        </ul>
      </nav>
    </div>`;
  return { destroy() {} };
}

function levelCard(l) {
  const body = `
    <span class="ls-level-code ls-grad-text">${esc(l.id)}</span>
    <span class="ls-level-name">${esc(l.name)}</span>
    <span class="ls-level-meta">${l.total ? `${l.total} metin · ${l.done} tamamlandı` : 'İçerik hazırlanıyor'}</span>
    ${l.total ? meter(l.done, l.total) : '<span class="ls-soon">Yakında</span>'}`;
  return l.total
    ? `<a class="ls-card ls-level" href="${hashOf({ name: 'sublevels', level: l.id })}">${body}</a>`
    : `<div class="ls-card ls-level" aria-disabled="true">${body}</div>`;
}
