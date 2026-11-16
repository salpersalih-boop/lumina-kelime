import { esc, listen } from './dom.js';

/**
 * Alt seviyedeki metinlerin listesi: numara, başlık, uzunluk ve en iyi sonuç.
 * Saf görünüm: veriyi render() ile alır, seçimi onSelect(n) ile bildirir.
 */
export function mountSetPicker(root, { onSelect }) {
  const offClick = listen(root, 'click', e => {
    const btn = e.target.closest('button[data-n]');
    if (btn) onSelect(Number(btn.dataset.n));
  });

  const offKeys = listen(root, 'keydown', e => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys) && e.key !== 'Home' && e.key !== 'End') return;
    const items = [...root.querySelectorAll('button[data-n]')];
    const i = items.indexOf(document.activeElement);
    if (i === -1) return;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : (i + keys[e.key] + items.length) % items.length;
    items[to].focus();
    revealInList(items[to]);
    e.preventDefault();
  });

  /**
   * @param {{ heading: string,
   *           items: {n: number, title: string, topic: string, length: {id: string, label: string},
   *                   seconds: string, kind: string, best: number|null}[],
   *           current: number }} model
   */
  function render({ heading, items, current }) {
    if (!items.length) {
      root.hidden = true;
      root.innerHTML = '';
      return;
    }
    root.hidden = false;
    const done = items.filter(i => i.best != null).length;
    const hadFocus = root.contains(document.activeElement);

    root.innerHTML = `
      <div class="sp-head">
        <h2 class="sp-title">${esc(heading)}</h2>
        <p class="sp-count">${items.length} metin · ${done} tamamlandı</p>
      </div>
      <ol class="sp-list">
        ${items.map(it => {
          const active = it.n === current;
          return `
          <li>
            <button type="button" class="sp-item" data-n="${it.n}" data-len="${esc(it.length.id)}"
                    aria-current="${active ? 'true' : 'false'}" tabindex="${active ? 0 : -1}"
                    aria-label="Metin ${it.n}: ${esc(it.title)}, ${esc(it.length.label)}, ${esc(it.kind)}${it.best != null ? `, en iyi sonuç yüzde ${it.best}` : ''}">
              <span class="sp-num">${it.n}</span>
              <span class="sp-body">
                <span class="sp-name" lang="en">${esc(it.title)}</span>
                <span class="sp-meta">
                  <span class="len len-${esc(it.length.id)}">${esc(it.length.label)}</span>
                  <span>${esc(it.seconds)}</span>
                  <span>${esc(it.kind)}</span>
                </span>
              </span>
              ${it.best != null ? `<span class="sp-best ${it.best === 100 ? 'is-full' : ''}">%${it.best}</span>` : ''}
            </button>
          </li>`;
        }).join('')}
      </ol>`;

    const activeBtn = root.querySelector('[aria-current="true"]');
    if (hadFocus) activeBtn?.focus();
    if (activeBtn) revealInList(activeBtn);
  }

  return {
    render,
    destroy() { offClick(); offKeys(); },
  };
}

/**
 * Öğeyi yalnızca yatay listenin içinde görünür yapar. scrollIntoView sayfayı
 * da kaydırırdı; kullanıcı aşağıda soruları çözerken yukarı zıplamamalı.
 */
function revealInList(el) {
  const list = el.closest('.sp-list');
  if (!list || list.scrollWidth <= list.clientWidth) return;
  const item = el.parentElement;
  const left = item.offsetLeft - list.offsetLeft;
  const right = left + item.offsetWidth;
  if (left < list.scrollLeft) list.scrollLeft = left - 8;
  else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth + 8;
}
