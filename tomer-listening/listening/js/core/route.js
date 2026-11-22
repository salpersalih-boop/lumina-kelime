/**
 * Adres çubuğu ↔ ekran eşlemesi (saf fonksiyonlar, testlenebilir).
 *
 *   #/                  → seviyeler
 *   #/a1                → A1'in zorlukları (Kolay / Orta / Zor)
 *   #/a1/easy           → A1 Kolay metin listesi
 *   #/a1/easy/3         → A1 Kolay 3. metin (ders ekranı)
 *
 * Adreslerde zorluklar İngilizcedir (easy / medium / hard); içerikte ve
 * ilerleme anahtarlarında Türkçe kimlikler (kolay / orta / zor) kalır.
 * Türkçe adresler (#/a1/kolay/3) de açılır.
 *
 * İlk parça bir TÖMER seviyesi (a1 … c2) ya da bir dil kodu (es, pt) olabilir;
 * geçerli olup olmadığına manifest karar verir.
 *
 * Eski biçim (#a1-kolay-3, #a1-kolay) de tanınır ve ders/liste ekranına gider.
 */

/** @typedef {{name: 'levels'} | {name: 'sublevels', level: string}
 *           | {name: 'sets', level: string, sub: string}
 *           | {name: 'lesson', level: string, sub: string, n: number}} Route */

const SUBS = ['kolay', 'orta', 'zor'];
/** Alt seviye kimliği → adres parçası */
export const SUB_SLUGS = Object.freeze({ kolay: 'easy', orta: 'medium', zor: 'hard' });
const SUB_OF_SLUG = Object.fromEntries(Object.entries(SUB_SLUGS).map(([id, slug]) => [slug, id]));
/** Adres parçasından alt seviye kimliği (easy → kolay; kolay → kolay) */
const subOf = part => {
  const p = String(part ?? '').toLowerCase();
  return SUBS.includes(p) ? p : SUB_OF_SLUG[p] ?? null;
};
const slugOf = sub => SUB_SLUGS[sub] ?? sub;
const LEVEL = /^[a-z][a-z0-9]{1,2}$/i;

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
  const S = subOf(sub);
  if (!S) return { name: 'sublevels', level: L };
  if (!n || !/^\d{1,3}$/.test(n) || Number(n) < 1) return { name: 'sets', level: L, sub: S };
  return { name: 'lesson', level: L, sub: S, n: Number(n) };
}

/** @param {Route} route */
export function hashOf(route) {
  switch (route.name) {
    case 'sublevels': return `#/${route.level.toLowerCase()}`;
    case 'sets': return `#/${route.level.toLowerCase()}/${slugOf(route.sub)}`;
    case 'lesson': return `#/${route.level.toLowerCase()}/${slugOf(route.sub)}/${route.n}`;
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
