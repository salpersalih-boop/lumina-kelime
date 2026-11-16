import { CONTENT_ROOT, SUBLEVEL_IDS } from '../config.js';
import { validateSet, ContentError } from './contentSchema.js';

/**
 * İçerik erişim katmanı. Arayüz, içeriğin nereden geldiğini (statik JSON,
 * ileride bir API ya da Firestore) bilmez; yalnızca bu sınıfı kullanır.
 *
 * manifest.json biçimi:
 *   { "levels": [ { "id": "A1", "name": "…", "sets": { "kolay": ["a1/kolay/01.json", …], … } } ] }
 */
export class ContentRepository {
  #root;
  #fetch;
  #manifest = null;
  #cache = new Map();

  constructor({ root = CONTENT_ROOT, fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    this.#root = root;
    this.#fetch = fetchImpl;
  }

  /**
   * Manifest'i yükler ve her alt seviyeyi yol dizisine çevirir
   * (eski biçimdeki tek yol ya da null da kabul edilir).
   * @returns {Promise<{levels: {id: string, name: string, sets: Record<string, string[]>}[]}>}
   */
  manifest() {
    this.#manifest ??= this.#json('manifest.json')
      .then(normalizeManifest)
      .catch(err => {
        this.#manifest = null; // bir sonraki denemede yeniden yükle
        throw err;
      });
    return this.#manifest;
  }

  /** @returns {Promise<string[]>} bir alt seviyedeki setlerin yolları */
  async paths(levelId, sublevelId) {
    const manifest = await this.manifest();
    return manifest.levels.find(l => l.id === levelId)?.sets[sublevelId] ?? [];
  }

  /**
   * Bir alt seviyedeki n. seti getirir (n 1'den başlar).
   * @returns {Promise<object|null>} içerik yoksa null
   */
  async getSet(levelId, sublevelId, n = 1) {
    const path = (await this.paths(levelId, sublevelId))[n - 1];
    return path ? this.#load(path) : null;
  }

  /** Bir alt seviyedeki tüm setler (metin seçici için başlık ve uzunluk gerekir). */
  async listSets(levelId, sublevelId) {
    const paths = await this.paths(levelId, sublevelId);
    return Promise.all(paths.map(p => this.#load(p)));
  }

  /** Ses dosyası yollarını içerik köküne göre çözer. */
  resolve(path) {
    return /^(https?:|blob:|data:|\/)/.test(path) ? path : this.#root + path;
  }

  #load(path) {
    if (!this.#cache.has(path)) {
      const pending = this.#json(path).then(set => {
        const errors = validateSet(set);
        if (errors.length) throw new ContentError(path, errors);
        return Object.freeze(set);
      });
      pending.catch(() => this.#cache.delete(path));
      this.#cache.set(path, pending);
    }
    return this.#cache.get(path);
  }

  async #json(path) {
    const res = await this.#fetch(this.#root + path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${path} yüklenemedi (HTTP ${res.status})`);
    return res.json();
  }
}

/** Her alt seviyeyi diziye çevirir: "a.json" → ["a.json"], null → []. */
export function normalizeManifest(manifest) {
  return {
    ...manifest,
    levels: (manifest.levels ?? []).map(level => ({
      ...level,
      sets: Object.fromEntries(SUBLEVEL_IDS.map(sub => {
        const v = level.sets?.[sub];
        return [sub, Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []];
      })),
    })),
  };
}
