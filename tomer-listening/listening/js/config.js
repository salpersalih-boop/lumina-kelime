/**
 * Uygulama genelindeki sabitler.
 * Seviye listesi content/manifest.json'dan gelir; burada yalnızca
 * her seviyede ortak olan alt zorluk dereceleri ve oynatıcı ayarları durur.
 */

/** @typedef {'kolay'|'orta'|'zor'} SublevelId */

/** Her ana seviyenin (A1, A2, …) altındaki 3 alt zorluk derecesi. */
export const SUBLEVELS = Object.freeze([
  { id: 'kolay', label: 'Kolay', rank: 1, hint: 'Yavaş konuşma, temel kelimeler. Kişi, yer, renk, sayı gibi temel bilgiler.' },
  { id: 'orta',  label: 'Orta',  rank: 2, hint: 'Günlük hayattan diyaloglar. Fiyat, saat, yer gibi detayları yakala.' },
  { id: 'zor',   label: 'Zor',   rank: 3, hint: 'Normal hız ve çeldiriciler: düzeltilen bilgiler, olumsuz cümleler, karışan sayılar.' },
]);

export const SUBLEVEL_IDS = Object.freeze(SUBLEVELS.map(s => s.id));

/** Kullanıcının seçebileceği oynatma hızları. */
export const SPEED_OPTIONS = Object.freeze([0.75, 0.9, 1, 1.15]);

/** İçerik dosyalarının kök klasörü (index.html'e göre). */
export const CONTENT_ROOT = 'content/';

/** localStorage anahtarı; şema değişirse sürüm artırılır. */
export const STORAGE_KEY = 'listening.progress.v1';

/** Seslendirmede cümleler arasındaki bekleme (ms). */
export const SEGMENT_GAP_MS = Object.freeze({ monologue: 250, dialogue: 450 });

