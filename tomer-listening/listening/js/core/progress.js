import { STORAGE_KEY } from '../config.js';

/**
 * Kullanıcının set bazında en iyi sonucunu tarayıcıda saklar.
 * localStorage yoksa ya da hata verirse uygulama yine çalışır.
 * @typedef {{ best: number, score: number, total: number, at: number }} SetProgress
 */

/** @returns {Record<string, SetProgress>} */
export function loadProgress(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/**
 * Sonucu kaydeder; yalnızca önceki en iyi sonuçtan yüksekse günceller.
 * @returns {Record<string, SetProgress>} güncel ilerleme
 */
export function saveResult(setId, result, storage = globalThis.localStorage) {
  const all = loadProgress(storage);
  const prev = all[setId];
  if (!prev || result.percent > prev.best) {
    all[setId] = { best: result.percent, score: result.score, total: result.total, at: Date.now() };
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* kota / gizli mod */ }
  }
  return all;
}
