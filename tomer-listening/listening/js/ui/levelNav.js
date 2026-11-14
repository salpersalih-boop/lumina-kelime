import { esc, listen } from './dom.js';

/**
 * İki katmanlı seviye seçici:
 *   1. satır: ana seviyeler (A1 … C2)
 *   2. satır: seçili seviyenin alt zorlukları (Kolay / Orta / Zor)
 *
 * Saf görünüm: durum dışarıdan gelir, seçim onSelect ile yukarı bildirilir.
 */
export function mountLevelNav(root, { onSelect }) {
  const off = listen(root, 'click', e => {
    const btn = e.target.closest('button[data-level], button[data-sub]');
    if (!btn) return;
    onSelect({
      level: btn.dataset.level ?? root.dataset.level,
      sub: btn.dataset.sub ?? 'kolay',
    });
  });

  // Ok tuşlarıyla aynı satırdaki sekmeler arasında gezinme.
  const offKeys = listen(root, 'keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const row = e.target.closest('[role="tablist"]');
    if (!row) return;
    const tabs = [...row.querySelectorAll('[role="tab"]')];
    const i = tabs.indexOf(e.target);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next?.focus();
    e.preventDefault();
  });

  /**
   * @param {{levels: {id: string, name: string, sets: Record<string, string|null>}[],
   *          sublevels: {id: string, label: string, rank: number, hint: string}[],
   *          selection: {level: string, sub: string},
   *          progress: Record<string, {best: number}>,
   *          setIdOf: (level: string, sub: string) => string}} model
   */
  function render({ levels, sublevels, selection, progress, setIdOf }) {
    // Yeniden çizimden sonra klavye odağını aynı sekmede tut.
    const focused = root.contains(document.activeElement) ? document.activeElement.dataset : null;
    const focusKey = focused?.level ? `[data-level="${focused.level}"]` : focused?.sub ? `[data-sub="${focused.sub}"]` : null;
    root.dataset.level = selection.level;
    const current = levels.find(l => l.id === selection.level);

    const levelTabs = levels.map(l => {
      const ready = sublevels.filter(s => l.sets?.[s.id]).length;
      const active = l.id === selection.level;
      return `
        <button type="button" role="tab" class="lvl" data-level="${esc(l.id)}"
                aria-selected="${active}" tabindex="${active ? 0 : -1}">
          <span class="lvl-code">${esc(l.id)}</span>
          <span class="lvl-name">${esc(l.name)}</span>
          <span class="lvl-count">${ready ? `${ready}/3 set` : 'yakında'}</span>
        </button>`;
    }).join('');

    const subTabs = sublevels.map(s => {
      const active = s.id === selection.sub;
      const available = Boolean(current?.sets?.[s.id]);
      const best = progress[setIdOf(selection.level, s.id)]?.best;
      const bars = [1, 2, 3].map(n => `<i class="${n <= s.rank ? 'on' : ''}"></i>`).join('');
      return `
        <button type="button" role="tab" class="sub" data-sub="${esc(s.id)}"
                aria-selected="${active}" tabindex="${active ? 0 : -1}" ${available ? '' : 'data-empty'}>
          <span class="meter" aria-hidden="true">${bars}</span>
          <span class="sub-text">
            <span class="sub-label">${esc(s.label)}</span>
            <span class="sub-hint">${esc(s.hint)}</span>
          </span>
          ${best != null ? `<span class="best" title="En iyi sonucun">%${best}</span>` : ''}
        </button>`;
    }).join('');

    root.innerHTML = `
      <div class="lvl-row" role="tablist" aria-label="Ana seviye">${levelTabs}</div>
      <div class="sub-row" role="tablist" aria-label="${esc(selection.level)} alt zorluk">${subTabs}</div>`;
    if (focusKey) root.querySelector(focusKey)?.focus();
  }

  return {
    render,
    destroy() { off(); offKeys(); },
  };
}
