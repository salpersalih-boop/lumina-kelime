import { esc, ICONS } from '../dom.js';
import { hashOf } from '../../core/route.js';

/** Ekranlarda ortak küçük parçalar (HTML üretir, içerik her zaman esc ile kaçışlanır). */

export const backLink = (route, label) =>
  `<a class="ls-back" href="${hashOf(route)}">${ICONS.arrow}<span>${esc(label)}</span></a>`;

export const lengthChip = length =>
  `<span class="ls-chip ls-len ls-len-${esc(length.id)}">${esc(length.label)}</span>`;

export const kindChip = kind =>
  `<span class="ls-chip">${kind === 'Diyalog' ? ICONS.chat : ICONS.mic}${esc(kind)}</span>`;

export const timeChip = seconds => `<span class="ls-chip">${ICONS.clock}${esc(seconds)}</span>`;

/** En iyi sonuç rozeti: %100 → yeşil, %50+ → sarı, altı → kırmızı, hiç çözülmediyse "Yeni". */
export function scoreBadge(best) {
  if (best == null) return '<span class="ls-score new">Yeni</span>';
  const tone = best >= 80 ? 'good' : best >= 50 ? 'mid' : 'bad';
  return `<span class="ls-score ${tone}" title="En iyi sonucun">%${best}</span>`;
}

export const difficultyBars = rank =>
  `<span class="ls-bars" aria-hidden="true">${[1, 2, 3].map(n => `<i class="${n <= rank ? 'on' : ''}"></i>`).join('')}</span>`;

export const ring = (done, total) => {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<span class="ls-ring" style="--p:${pct}" role="img" aria-label="${done}/${total} tamamlandı"><span>${done}/${total}</span></span>`;
};

export const meter = (done, total) =>
  `<span class="ls-meter" aria-hidden="true"><i style="--v:${total ? (done / total) * 100 : 0}%"></i></span>`;

export function emptyState({ title, text, action }) {
  return `
    <section class="ls-empty">
      <h2>${esc(title)}</h2>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${action ? `<a class="ls-btn ls-btn-primary" href="${action.href}">${esc(action.label)}</a>` : ''}
    </section>`;
}
