import { SUBLEVELS, SUBLEVEL_IDS, DEFAULT_SELECTION } from './config.js';
import { createStore } from './core/store.js';
import { loadProgress, saveResult } from './core/progress.js';
import { ContentRepository } from './services/contentRepository.js';
import { mountLevelNav } from './ui/levelNav.js';
import { mountLesson, renderEmpty } from './ui/lessonView.js';
import { $, esc } from './ui/dom.js';

/**
 * Uygulama girişi: durum, yönlendirme (#a1-orta) ve bileşenlerin bağlanması.
 */
const repo = new ContentRepository();
const store = createStore({
  levels: [],
  selection: { ...DEFAULT_SELECTION },
  progress: loadProgress(),
  rate: null,          // kullanıcı hız seçtiyse oturum boyunca korunur
});

const navRoot = $('#levelNav');
const lessonRoot = $('#lesson');
let lesson = null;
let loadToken = 0;

const setIdOf = (level, sub) => `${level.toLowerCase()}-${sub}`;
const sublevelOf = id => SUBLEVELS.find(s => s.id === id);

// ── yönlendirme ─────────────────────────────────────────────
function parseHash() {
  const m = /^#([a-c][12])-(kolay|orta|zor)$/i.exec(location.hash);
  return m ? { level: m[1].toUpperCase(), sub: m[2].toLowerCase() } : null;
}

function select(selection) {
  const hash = `#${setIdOf(selection.level, selection.sub)}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
  store.set({ selection });
}

/** Sıradaki alt seviye: Kolay → Orta → Zor → bir üst seviyenin Kolay'ı. */
function nextOf({ level, sub }) {
  const { levels } = store.get();
  const si = SUBLEVEL_IDS.indexOf(sub);
  if (si < SUBLEVEL_IDS.length - 1) return { level, sub: SUBLEVEL_IDS[si + 1] };
  const li = levels.findIndex(l => l.id === level);
  return levels[li + 1] ? { level: levels[li + 1].id, sub: SUBLEVEL_IDS[0] } : null;
}

function labelOf({ level, sub }) {
  return `${level} · ${sublevelOf(sub).label}`;
}

// ── görünüm ─────────────────────────────────────────────────
const nav = mountLevelNav(navRoot, { onSelect: select });

function renderNav() {
  const { levels, selection, progress } = store.get();
  nav.render({ levels, sublevels: SUBLEVELS, selection, progress, setIdOf });
}

async function renderLesson() {
  const token = ++loadToken;
  const { levels, selection, rate } = store.get();
  const level = levels.find(l => l.id === selection.level);
  const sublevel = sublevelOf(selection.sub);

  lesson?.destroy();
  lesson = null;
  lessonRoot.innerHTML = '<p class="loading">Yükleniyor…</p>';

  try {
    const set = await repo.getSet(selection.level, selection.sub);
    if (token !== loadToken) return;

    if (!set) {
      const first = levels.flatMap(l => SUBLEVEL_IDS.filter(s => l.sets?.[s]).map(s => ({ level: l.id, sub: s })))[0];
      renderEmpty(lessonRoot, {
        level, sublevel,
        firstAvailable: first && { label: `${labelOf(first)} ile başla` },
        onGo: () => select(first),
      });
      document.title = `${selection.level} ${sublevel.label} · Dinleme`;
      return;
    }

    const next = nextOf(selection);
    const instance = await mountLesson(lessonRoot, {
      set,
      level,
      sublevel,
      rate,
      resolve: path => repo.resolve(path),
      next: next && { label: labelOf(next) },
      onNext: () => { select(next); window.scrollTo({ top: 0 }); },
      onResult: result => store.set({ progress: saveResult(set.id, result) }),
      onRateChange: r => store.set({ rate: r }),
    });
    if (token !== loadToken) return instance.destroy();
    lesson = instance;
    document.title = `${set.title} · ${selection.level} ${sublevel.label} · Dinleme`;
  } catch (err) {
    if (token !== loadToken) return;
    console.error(err);
    lessonRoot.innerHTML = `
      <section class="empty is-error" role="alert">
        <h2>İçerik yüklenemedi</h2>
        <pre>${esc(err.message)}</pre>
        <button type="button" class="btn btn-primary" data-retry>Tekrar dene</button>
      </section>`;
    lessonRoot.querySelector('[data-retry]').addEventListener('click', renderLesson);
  }
}

store.subscribe((state, prev) => {
  renderNav();
  const changed = state.selection.level !== prev.selection.level || state.selection.sub !== prev.selection.sub;
  if (changed || state.levels !== prev.levels) renderLesson();
});

window.addEventListener('hashchange', () => {
  const sel = parseHash();
  if (sel) store.set({ selection: sel });
});

// ── başlat ──────────────────────────────────────────────────
(async function init() {
  try {
    const manifest = await repo.manifest();
    const fromHash = parseHash();
    const valid = fromHash && manifest.levels.some(l => l.id === fromHash.level);
    store.set({ levels: manifest.levels, selection: valid ? fromHash : { ...DEFAULT_SELECTION } });
  } catch (err) {
    console.error(err);
    lessonRoot.innerHTML = `
      <section class="empty is-error" role="alert">
        <h2>Seviye listesi yüklenemedi</h2>
        <p>Sayfayı bir web sunucusu üzerinden açtığından emin ol (README › Çalıştırma).</p>
        <pre>${esc(err.message)}</pre>
      </section>`;
  }
})();
