/**
 * Seslendirme süresi tahmini ve konum hesapları (saf fonksiyonlar).
 * Web Speech API gerçek süre vermediği için süre, karakter sayısından tahmin edilir.
 */

/** 1x hızda ortalama İngilizce seslendirme hızı (karakter/saniye). */
export const CHARS_PER_SECOND = 14;

export function estimateSeconds(chars, rate = 1) {
  if (chars <= 0 || rate <= 0) return 0;
  return chars / (CHARS_PER_SECOND * rate);
}

/** 75 → "1:15" */
export function formatTime(seconds) {
  const s = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Parça uzunluklarından başlangıç konumlarını ve toplamı üretir.
 * @param {number[]} lengths
 */
export function cumulative(lengths) {
  const starts = [];
  let total = 0;
  for (const len of lengths) {
    starts.push(total);
    total += len;
  }
  return { starts, total };
}

/**
 * Toplam metin içindeki bir karakter konumunun hangi parçaya düştüğünü bulur.
 * @returns {{ index: number, offset: number }}
 */
export function locate(lengths, position) {
  const { starts, total } = cumulative(lengths);
  if (!lengths.length) return { index: 0, offset: 0 };
  const pos = Math.min(Math.max(position, 0), Math.max(total - 1, 0));
  let index = 0;
  while (index < lengths.length - 1 && pos >= starts[index] + lengths[index]) index++;
  return { index, offset: pos - starts[index] };
}

export const clamp01 = x => Math.min(1, Math.max(0, x));
