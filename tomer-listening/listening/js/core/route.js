/**
 * Adres çubuğu ↔ ekran eşlemesi (saf fonksiyonlar, testlenebilir).
 *
 *   #/                  → seviyeler
 *   #/a1                → A1'in zorlukları (Kolay / Orta / Zor)
 *   #/a1/kolay          → A1 Kolay metin listesi
 *   #/a1/kolay/3        → A1 Kolay 3. metin (ders ekranı)
 *
 * Eski biçim (#a1-kolay-3, #a1-kolay) de tanınır ve ders/liste ekranına gider.
 */

/** @typedef {{name: 'levels'} | {name: 'sublevels', level: string}
 *           | {name: 'sets', level: string, sub: string}
 *           | {name: 'lesson', level: string, sub: string, n: number}} Route */

const SUBS = ['kolay', 'orta', 'zor'];
const LEVEL = /^[a-c][12]$/i;

/** @returns {Route} */
export function parseRoute(hash) {
  const raw = decodeURIComponent(String(hash ?? '')).replace(/^#/, '');

  const legacy = /^([a-c][12])-(kolay|orta|zor)(?:-(\d{1,3}))?$/i.exec(raw);
  if (legacy) {
    const [, level, sub, n] = legacy;
    return n
      ? { name: 'lesson', level: level.toUpperCase(), sub: sub.toLowerCase(), n: Number(n) }
      : { name: 'sets', level: level.toUpperCase(), sub: sub.toLowerCase() };
  }

  const [level, sub, n] = raw.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (!level || !LEVEL.test(level)) return { name: 'levels' };
  const L = level.toUpperCase();
  if (!sub || !SUBS.includes(sub.toLowerCase())) return { name: 'sublevels', level: L };
  const S = sub.toLowerCase();
  if (!n || !/^\d{1,3}$/.test(n) || Number(n) < 1) return { name: 'sets', level: L, sub: S };
  return { name: 'lesson', level: L, sub: S, n: Number(n) };
}

/** @param {Route} route */
export function hashOf(route) {
  switch (route.name) {
    case 'sublevels': return `#/${route.level.toLowerCase()}`;
    case 'sets': return `#/${route.level.toLowerCase()}/${route.sub}`;
    case 'lesson': return `#/${route.level.toLowerCase()}/${route.sub}/${route.n}`;
    default: return '#/';
  }
}

/** Bir üst ekran (geri düğmesi için). */
export function parentOf(route) {
  switch (route.name) {
    case 'lesson': return { name: 'sets', level: route.level, sub: route.sub };
    case 'sets': return { name: 'sublevels', level: route.level };
    case 'sublevels': return { name: 'levels' };
    default: return null;
  }
}
