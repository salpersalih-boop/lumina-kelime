/**
 * Set kimlikleri, sıralama ve metin uzunluğu (saf fonksiyonlar).
 *
 * Her alt seviyede birden fazla metin (set) bulunur. Setler 1'den başlayan
 * sıra numarasıyla anılır; kimlik ve dosya yolu bu numaradan türetilir:
 *   a1 / kolay / 3  →  id "a1-kolay-03",  dosya "a1/kolay/03.json"
 */

const pad = n => String(n).padStart(2, '0');

/** @returns {string} ör. "a1-kolay-03" — ilerleme bu anahtarla saklanır */
export function setIdOf(level, sub, n) {
  return `${level.toLowerCase()}-${sub}-${pad(n)}`;
}

/** @returns {string} içerik köküne göre dosya yolu, ör. "a1/kolay/03.json" */
export function setPathOf(level, sub, n) {
  return `${level.toLowerCase()}/${sub}/${pad(n)}.json`;
}

/** Bir metnin kelime sayısı (konuşmacı adları hariç). Aksanlı harfler de kelimeye dahildir (está, ação). */
export function wordCount(script) {
  return script.reduce((sum, line) => sum + (line.text.match(/[\p{L}\p{N}'’]+/gu)?.length ?? 0), 0);
}

/**
 * Metin uzunluk sınıfları (kelime sayısına göre). Her alt seviyede üç sınıf da
 * bulunur; böylece kullanıcı hem kısa, hem orta, hem uzun konuşmalara alışır.
 * Sınırlar A1 metinlerine göre seçildi (kısa ≈ 30–50, uzun ≈ 110+ kelime).
 */
export const LENGTH_CLASSES = Object.freeze([
  { id: 'kisa', label: 'Kısa', max: 50 },
  { id: 'orta', label: 'Orta', max: 110 },
  { id: 'uzun', label: 'Uzun', max: Infinity },
]);

/** @returns {{id: string, label: string, max: number}} */
export function lengthClassOf(words) {
  return LENGTH_CLASSES.find(c => words <= c.max);
}

/**
 * Sıradaki metin: aynı alt seviyede bir sonraki metin; son metinden sonra
 * bir sonraki alt seviyenin ilk metni; o da yoksa bir üst seviyenin ilki.
 *
 * @param {{level: string, sub: string, n: number}} at
 * @param {{id: string, sets: Record<string, number>}[]} levels  her alt seviyedeki metin sayısı
 * @param {string[]} subIds  ['kolay', 'orta', 'zor']
 * @returns {{level: string, sub: string, n: number} | null}
 */
export function nextSet(at, levels, subIds) {
  const order = levels.flatMap(l => subIds.map(sub => ({ level: l.id, sub, count: l.sets[sub] ?? 0 })));
  const i = order.findIndex(o => o.level === at.level && o.sub === at.sub);
  if (i === -1) return null;
  if (at.n < order[i].count) return { level: at.level, sub: at.sub, n: at.n + 1 };
  const following = order.slice(i + 1).find(o => o.count > 0);
  return following ? { level: following.level, sub: following.sub, n: 1 } : null;
}
