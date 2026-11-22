import { esc, ICONS } from './dom.js';
import { cumulative, locate } from '../core/timing.js';

/**
 * Dinleme metni (okuyarak dinleme).
 *
 * - Başta kapalıdır; "Metni göster" tuşuyla istenildiği an açılır ve kapanır.
 * - Seslendirme sırasında okunan satır ve o an okunan kelime arka planda
 *   işaretlenir (karaoke). Kelime konumu oynatıcının ilerlemesinden bulunur:
 *   tarayıcı kelime sınırı bildiriyorsa birebir, bildirmiyorsa süre tahminiyle.
 * - Cevaplar kontrol edilince metin kendiliğinden açılır ve her sorunun kanıt
 *   cümlesi soru numarasıyla işaretlenir.
 *
 * @param {HTMLElement} root
 * @param {object} set
 * @param {Record<string, string>} colors konuşmacı id → renk
 */
export function mountTranscript(root, set, colors = {}) {
  const multi = Object.keys(set.speakers).length > 1;
  const lengths = set.script.map(l => l.text.length);
  const { total } = cumulative(lengths);

  let open = false;
  let marks = set.script.map(() => []);   // kanıt işaretleri (kontrolden sonra)
  let graded = false;
  let active = { line: -1, word: -1 };

  /** Satırı kelime/boşluk parçalarına böler; kanıt aralıklarını işaretler. */
  function lineHtml(text, lineMarks) {
    const ranges = lineMarks
      .map(m => ({ n: m.n, start: text.toLowerCase().indexOf(m.needle), len: m.needle.length }))
      .filter(r => r.start >= 0);
    const evidenceAt = pos => ranges.find(r => pos >= r.start && pos < r.start + r.len);
    const seen = new Set();
    let pos = 0;
    return (text.match(/\S+|\s+/g) ?? []).map(tok => {
      const at = pos;
      pos += tok.length;
      const ev = evidenceAt(at);
      const sup = ev && !seen.has(ev.n) ? (seen.add(ev.n), `<sup>${ev.n}</sup>`) : '';
      if (/^\s+$/.test(tok)) return `<span class="ls-sp${ev ? ' is-ev' : ''}">${esc(tok)}</span>`;
      return `<span class="ls-w${ev ? ' is-ev' : ''}" data-c="${at}">${sup}${esc(tok)}</span>`;
    }).join('');
  }

  function render() {
    if (!open) {
      root.innerHTML = `
        <section class="ls-tr ls-tr-closed">
          <span class="ls-tr-icon">${ICONS.chat}</span>
          <div><b>Dinleme metni</b>${graded ? 'Kanıt cümleleri işaretli.' : 'İstersen metni açıp okuyarak dinle; okunan yer işaretlenir.'}</div>
          <button type="button" class="ls-btn ls-tr-toggle" aria-expanded="false">Metni göster</button>
        </section>`;
      return;
    }
    root.innerHTML = `
      <section class="ls-tr is-open">
        <header class="ls-tr-head">
          <b>Dinleme metni</b>
          <button type="button" class="ls-btn ls-tr-toggle" aria-expanded="true">Metni gizle</button>
        </header>
        <ol class="ls-lines ${multi ? 'is-dialogue' : ''}" lang="${esc(set.audio.lang)}">
          ${set.script.map((l, i) => `
            <li data-line="${i}">
              ${multi ? `<span class="ls-who" style="--voice:${colors[l.speaker] ?? 'var(--accent-1)'}">${esc(set.speakers[l.speaker].name)}</span>` : ''}
              <span class="ls-say">${lineHtml(l.text, marks[i])}</span>
            </li>`).join('')}
        </ol>
      </section>`;
    paint(true);
  }

  function setOpen(value) {
    open = value;
    render();
    root.querySelector('.ls-tr-toggle')?.focus();
  }

  const onClick = e => { if (e.target.closest('.ls-tr-toggle')) setOpen(!open); };
  root.addEventListener('click', onClick);

  // ── okunan yer ──
  function paint(force = false) {
    if (!open) return;
    const lines = root.querySelectorAll('.ls-lines > li');
    lines.forEach(li => li.classList.toggle('is-active', Number(li.dataset.line) === active.line));
    root.querySelectorAll('.ls-w.is-now').forEach(w => w.classList.remove('is-now'));
    const li = lines[active.line];
    if (!li) return;
    const words = [...li.querySelectorAll('.ls-w')];
    let now = null;
    for (const w of words) { if (Number(w.dataset.c) <= active.word) now = w; else break; }
    now?.classList.add('is-now');
    if (force) return;
    // Okunan satır görünmüyorsa (metin ekrandayken) yumuşakça kaydır
    const box = root.getBoundingClientRect();
    const r = li.getBoundingClientRect();
    const onScreen = box.bottom > 0 && box.top < innerHeight;
    if (onScreen && (r.top < 70 || r.bottom > innerHeight - 20)) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /** Oynatıcı ilerlemesi (0–1) → satır ve kelime. */
  function setProgress(ratio) {
    if (!total) return;
    const { index, offset } = locate(lengths, Math.min(ratio * total, total - 0.001));
    const word = Math.floor(offset);
    if (index === active.line && word === active.word) return;
    const lineChanged = index !== active.line;
    active = { line: index, word };
    paint(!lineChanged);
  }

  function setActiveLine(index) {
    if (index < 0) { active = { line: -1, word: -1 }; paint(true); return; }
    if (index === active.line) return;
    active = { line: index, word: -1 };
    paint();
  }

  /** @param {{evidence: string}[]} questions */
  function reveal(questions) {
    marks = set.script.map(() => []);
    questions.forEach((q, qi) => {
      const needle = q.evidence.toLowerCase();
      const line = set.script.findIndex(l => l.text.toLowerCase().includes(needle));
      if (line >= 0) marks[line].push({ n: qi + 1, needle });
    });
    graded = true;
    open = true;
    render();
  }

  /** Tekrar çözerken: kanıt işaretlerini kaldır, metni kapat. */
  function lock() {
    marks = set.script.map(() => []);
    graded = false;
    open = false;
    render();
  }

  render();
  return {
    reveal, lock, setActiveLine, setProgress,
    destroy() { root.removeEventListener('click', onClick); },
    get isOpen() { return open; },
  };
}

