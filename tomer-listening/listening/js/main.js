import { SUBLEVELS, SUBLEVEL_IDS } from './config.js';
import { loadProgress, saveResult } from './core/progress.js';
import { setIdOf, wordCount, lengthClassOf, nextSet } from './core/sets.js';
import { estimateSeconds, formatTime } from './core/timing.js';
import { parseRoute, hashOf } from './core/route.js';
import { ContentRepository } from './services/contentRepository.js';
import { renderLevels } from './ui/screens/levelsScreen.js';
import { renderSublevels } from './ui/screens/sublevelsScreen.js';
import { renderSets } from './ui/screens/setsScreen.js';
import { renderLesson } from './ui/screens/lessonScreen.js';
import { emptyState } from './ui/screens/parts.js';
import { $, esc, listen, ICONS } from './ui/dom.js';

/**
 * Uygulama girişi: adres (#/a1/kolay/3) → ekran.
 * Ekranlar saf görünümdür; veriyi burada hazırlayıp onlara verir, sonuçları
 * (ilerleme, hız tercihi, süzgeç) burada tutarız.
 *
 * Aynı motor iki kataloğu sunar; hangisinin açılacağını sayfa söyler:
 *   index.html  → content/         (TÖMER: A1 … C2)
 *   languages.html → content/diller/  (Dinleyerek Öğren: İspanyolca, Portekizce …)
 * Katalog başlıkları manifest'in "app" alanından gelir.
 */
const app = $('#app');
const crumbs = $('#crumbs');
const repo = new ContentRepository({ root: app.dataset.content || undefined });

/** Manifest'te "app" yoksa TÖMER varsayılanları. */
const APP_DEFAULTS = Object.freeze({
  title: 'Dinleme ve Anlama',
  short: 'Dinleme',
  kicker: 'TÖMER · İngilizce',
  heading: ['Dinleme ve', 'Anlama'],
  intro: 'Seviyeni seç, kısa ve uzun metinleri dinle, soruları cevapla. Her sorunun açıklaması metindeki cümleyi gösterir.',
  groupLabel: 'Seviyeler',
});

const state = {
  app: APP_DEFAULTS,
  levels: [],
  progress: loadProgress(),
  rate: null,                 // kullanıcı hız seçtiyse oturum boyunca korunur
  filters: {},                // "A1/kolay" → 'all' | 'kisa' | 'orta' | 'uzun'
};

let screen = null;
let token = 0;
let firstRender = true;

const sublevelOf = id => SUBLEVELS.find(s => s.id === id);
const levelOf = id => state.levels.find(l => l.id === id);
/** Ekranlara giden seviye nesnesi: etiket (A1 ya da dil adı) ve katalog metinleri eklenir. */
const viewOf = level => ({ ...level, label: level.label ?? level.id, app: state.app });
const countOf = (level, sub) => levelOf(level)?.sets[sub]?.length ?? 0;
const doneIn = (level, sub) =>
  Array.from({ length: countOf(level, sub) }, (_, i) => setIdOf(level, sub, i + 1)).filter(id => state.progress[id]).length;
const bestOf = (level, sub, n) => state.progress[setIdOf(level, sub, n)]?.best ?? null;

/** Bir setin liste ve başlıkta gösterilen özeti. */
function describe(set, n) {
  const words = wordCount(set.script);
  const chars = set.script.reduce((sum, l) => sum + l.text.length, 0);
  return {
    n,
    title: set.title,
    topic: set.topic,
    words,
    length: lengthClassOf(words),
    seconds: `~${formatTime(estimateSeconds(chars, set.audio.rate ?? 1))}`,
    kind: Object.keys(set.speakers).length > 1 ? 'Diyalog' : 'Monolog',
    questions: set.questions.length,
    maxPlays: set.audio.maxPlays ?? null,
    lang: set.audio.lang,
  };
}

// ── üst çubuk: Lumina'ya dönüş, yol ve tema ──────────────────
// Modül Lumina'nın içinde (…/tomer-listening/listening/) açıldıysa üst çubukta
// Lumina'ya dönüş bağlantısı çıkar: TÖMER kataloğu → /tomer/<seviye>, diller → ana sayfa (/)
const INSIDE_LUMINA = location.pathname.includes('/tomer-listening/');
const appBack = INSIDE_LUMINA ? document.createElement('a') : null;
if (appBack) {
  appBack.className = 'ls-app-back';
  appBack.innerHTML = '<span aria-hidden="true">←</span> Lumina';
  $('#themeToggle').before(appBack);
}
function luminaHref(route) {
  if (app.dataset.content) return '../../';
  return route.level ? `../../tomer/${route.level.toLowerCase()}` : '../../tomer';
}

function drawCrumbs(route) {
  if (appBack) appBack.href = luminaHref(route);
  const parts = [{ label: state.app.short, href: hashOf({ name: 'levels' }) }];
  if (route.level) parts.push({ label: levelOf(route.level)?.label ?? route.level, href: hashOf({ name: 'sublevels', level: route.level }) });
  if (route.sub) parts.push({ label: sublevelOf(route.sub).label, href: hashOf({ name: 'sets', level: route.level, sub: route.sub }) });
  if (route.n) parts.push({ label: `Metin ${route.n}` });
  const last = parts.length - 1;
  crumbs.innerHTML = parts.map((p, i) => i === last
    ? `<span aria-current="page">${esc(p.label)}</span>`
    : `<a href="${p.href}">${esc(p.label)}</a><i aria-hidden="true">›</i>`).join('');
}

const THEME_KEY = 'listening.theme';
const themeBtn = $('#themeToggle');
function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  themeBtn.innerHTML = theme === 'light' ? ICONS.moon : ICONS.sun;
  themeBtn.setAttribute('aria-label', theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç');
}
let theme = 'dark';
try { theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { /* gizli mod */ }
applyTheme(theme);
listen(themeBtn, 'click', () => {
  theme = theme === 'light' ? 'dark' : 'light';
  applyTheme(theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* gizli mod */ }
});

// ── ekranlar ────────────────────────────────────────────────
async function show(route) {
  const my = ++token;
  screen?.destroy();
  screen = null;
  drawCrumbs(route);
  app.innerHTML = '<div class="ls-loading" aria-busy="true"><span class="ls-spinner"></span></div>';

  try {
    const instance = await build(route, () => my !== token);
    if (my !== token) return instance?.destroy();
    screen = instance;
    if (!firstRender) {
      window.scrollTo({ top: 0 });
      app.querySelector('h1')?.focus({ preventScroll: true });
    }
    firstRender = false;
  } catch (err) {
    if (my !== token) return;
    console.error(err);
    app.innerHTML = `
      <div class="ls-screen">
        <section class="ls-empty" role="alert">
          <h2>İçerik yüklenemedi</h2>
          <p>Sayfayı bir web sunucusu üzerinden açtığından emin ol (README › Çalıştırma).</p>
          <pre>${esc(err.message)}</pre>
          <button type="button" class="ls-btn ls-btn-primary" data-retry>Tekrar dene</button>
        </section>
      </div>`;
    app.querySelector('[data-retry]').addEventListener('click', () => show(route));
  }
}

/** Adrese göre ekranı kurar. Geçersiz adresleri en yakın geçerli ekrana yönlendirir. */
async function build(route, stale) {
  const level = route.level && levelOf(route.level) && viewOf(levelOf(route.level));
  if (route.name !== 'levels' && !level) return redirect({ name: 'levels' });

  if (route.name === 'levels') {
    const levels = state.levels.map(l => {
      const total = SUBLEVEL_IDS.reduce((s, sub) => s + countOf(l.id, sub), 0);
      const done = SUBLEVEL_IDS.reduce((s, sub) => s + doneIn(l.id, sub), 0);
      return { id: l.id, name: l.name, flag: l.flag, badge: l.flag ?? l.id, total, done };
    });
    // Yalnızca bu kataloğun metinleri (ilerleme deposu iki katalog arasında ortak).
    const bests = state.levels
      .flatMap(l => SUBLEVEL_IDS.flatMap(sub => Array.from({ length: countOf(l.id, sub) }, (_, i) => state.progress[setIdOf(l.id, sub, i + 1)]?.best)))
      .filter(b => b != null);
    const stats = {
      total: levels.reduce((s, l) => s + l.total, 0),
      done: levels.reduce((s, l) => s + l.done, 0),
      average: bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null,
    };
    document.title = state.app.title;
    return renderLevels(app, { app: state.app, levels, stats });
  }

  if (route.name === 'sublevels') {
    const all = await Promise.all(SUBLEVEL_IDS.map(sub => repo.listSets(level.id, sub)));
    if (stale()) return null;
    const subs = SUBLEVELS.map((s, i) => {
      const items = all[i].map((set, j) => describe(set, j + 1));
      const qs = [...new Set(items.map(it => it.questions))];
      const kinds = new Set(items.map(it => it.kind));
      const plays = items.find(it => it.maxPlays)?.maxPlays;
      return {
        ...s,
        total: items.length,
        done: doneIn(level.id, s.id),
        questions: qs.length === 1 ? qs[0] : `${Math.min(...qs)}–${Math.max(...qs)}`,
        details: items.length ? [
          kinds.size > 1 ? 'Monolog + diyalog' : [...kinds][0],
          ...(plays ? [`${plays} dinleme hakkı`] : []),
        ] : [],
      };
    });
    document.title = `${level.label} · ${state.app.short}`;
    return renderSublevels(app, { level, subs });
  }

  const sublevel = sublevelOf(route.sub);
  const count = countOf(level.id, sublevel.id);

  if (route.name === 'sets') {
    if (!count) {
      app.innerHTML = `<div class="ls-screen">${emptyState({
        title: `${level.label} ${sublevel.label} için henüz metin yok`,
        text: 'İçerik hazırlanıyor. Şimdilik başka bir zorluk seçebilirsin.',
        action: { label: `${level.label} zorluklarına dön`, href: hashOf({ name: 'sublevels', level: level.id }) },
      })}</div>`;
      return { destroy() {} };
    }
    const sets = await repo.listSets(level.id, sublevel.id);
    if (stale()) return null;
    const key = `${level.id}/${sublevel.id}`;
    document.title = `${level.label} ${sublevel.label} · ${state.app.short}`;
    return renderSets(app, {
      level, sublevel,
      items: sets.map((set, i) => ({ ...describe(set, i + 1), best: bestOf(level.id, sublevel.id, i + 1) })),
      filter: state.filters[key] ?? 'all',
      onFilter: f => { state.filters[key] = f; },
    });
  }

  // ders
  if (!count) return redirect({ name: 'sets', level: level.id, sub: sublevel.id });
  if (route.n > count) return redirect({ ...route, n: count });

  const set = await repo.getSet(level.id, sublevel.id, route.n);
  if (stale()) return null;
  const counts = state.levels.map(l => ({ id: l.id, sets: Object.fromEntries(SUBLEVEL_IDS.map(s => [s, countOf(l.id, s)])) }));
  const nxt = nextSet({ level: level.id, sub: sublevel.id, n: route.n }, counts, SUBLEVEL_IDS);
  const lessonHref = n => hashOf({ name: 'lesson', level: level.id, sub: sublevel.id, n });

  document.title = `${set.title} · ${level.label} ${sublevel.label} · ${state.app.short}`;
  return renderLesson(app, {
    set, level, sublevel,
    summary: describe(set, route.n),
    position: { n: route.n, count },
    dots: Array.from({ length: count }, (_, i) => ({ n: i + 1, href: lessonHref(i + 1), done: bestOf(level.id, sublevel.id, i + 1) != null })),
    prev: route.n > 1 ? lessonHref(route.n - 1) : null,
    next: nxt && {
      href: hashOf({ name: 'lesson', ...nxt }),
      sameSublevel: nxt.level === level.id && nxt.sub === sublevel.id,
      label: nxt.level === level.id && nxt.sub === sublevel.id
        ? 'Sıradaki metin'
        : `${viewOf(levelOf(nxt.level)).label} ${sublevelOf(nxt.sub).label} metinlerine geç`,
    },
    rate: state.rate,
    resolve: p => repo.resolve(p),
    onResult: result => { state.progress = saveResult(set.id, result); },
    onRateChange: r => { state.rate = r; },
  });
}

/** Adresi okur, eski biçimi (#a1-kolay-3) ya da hatalı adresi düzeltip ekranı açar. */
function navigate() {
  const route = parseRoute(location.hash);
  if (location.hash !== hashOf(route)) history.replaceState(null, '', hashOf(route));
  show(route);
}

function redirect(route) {
  history.replaceState(null, '', hashOf(route));
  show(route);
  return null;
}

// ── başlat ──────────────────────────────────────────────────
(async function init() {
  try {
    const manifest = await repo.manifest();
    state.levels = manifest.levels;
    state.app = { ...APP_DEFAULTS, ...(manifest.app ?? {}) };
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="ls-screen">${emptyState({ title: 'Seviye listesi yüklenemedi', text: `Sayfayı bir web sunucusu üzerinden aç (npm start). ${err.message}` })}</div>`;
    return;
  }
  listen(window, 'hashchange', navigate);
  navigate();
})();
