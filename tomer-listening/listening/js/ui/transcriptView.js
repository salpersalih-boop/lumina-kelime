import { esc, ICONS } from './dom.js';

/**
 * Dinleme metni. Cevaplar kontrol edilene kadar kilitli kalır (dinleme
 * becerisini ölçmek için); sonra açılır ve her sorunun kanıt cümlesi
 * soru numarasıyla işaretlenir. Oynatma sırasında okunan satır vurgulanır.
 *
 * @param {HTMLElement} root
 * @param {object} set
 * @param {Record<string, string>} colors konuşmacı id → renk
 */
export function mountTranscript(root, set, colors = {}) {
  const multi = Object.keys(set.speakers).length > 1;

  function renderLocked() {
    root.innerHTML = `
      <div class="ls-tr ls-tr-locked">
        ${ICONS.lock}
        <div><b>Dinleme metni</b>Cevaplarını kontrol ettikten sonra açılır.</div>
      </div>`;
  }

  /** @param {{evidence: string}[]} questions */
  function reveal(questions) {
    const marks = set.script.map(() => []);
    questions.forEach((q, qi) => {
      const needle = q.evidence.toLowerCase();
      const line = set.script.findIndex(l => l.text.toLowerCase().includes(needle));
      if (line >= 0) marks[line].push({ n: qi + 1, needle });
    });

    const highlight = (text, lineMarks) => {
      if (!lineMarks.length) return esc(text);
      // Kanıt parçalarını <mark> ile sar; çakışmaları önlemek için sırayla işle.
      const ranges = lineMarks
        .map(m => ({ ...m, start: text.toLowerCase().indexOf(m.needle) }))
        .filter(m => m.start >= 0)
        .sort((a, b) => a.start - b.start);
      let out = '';
      let pos = 0;
      for (const r of ranges) {
        if (r.start < pos) continue;
        const end = r.start + r.needle.length;
        out += esc(text.slice(pos, r.start)) + `<mark><sup>${r.n}</sup>${esc(text.slice(r.start, end))}</mark>`;
        pos = end;
      }
      return out + esc(text.slice(pos));
    };

    root.innerHTML = `
      <details class="ls-tr" open>
        <summary>Dinleme metni</summary>
        <ol class="ls-lines ${multi ? 'is-dialogue' : ''}" lang="en">
          ${set.script.map((l, i) => `
            <li data-line="${i}">
              ${multi ? `<span class="ls-who" style="--voice:${colors[l.speaker] ?? 'var(--accent-1)'}">${esc(set.speakers[l.speaker].name)}</span>` : ''}
              <span>${highlight(l.text, marks[i])}</span>
            </li>`).join('')}
        </ol>
      </details>`;
  }

  function setActiveLine(index) {
    root.querySelectorAll('.ls-lines li').forEach(li => {
      li.classList.toggle('is-active', Number(li.dataset.line) === index);
    });
  }

  renderLocked();
  return { reveal, lock: renderLocked, setActiveLine };
}
