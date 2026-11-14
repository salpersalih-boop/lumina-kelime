import { CONTENT_ROOT } from '../config.js';
import { validateSet, ContentError } from './contentSchema.js';

/**
 * İçerik erişim katmanı. Arayüz, içeriğin nereden geldiğini (statik JSON,
 * ileride bir API ya da Firestore) bilmez; yalnızca bu sınıfı kullanır.
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

  /** @returns {Promise<{levels: {id: string, name: string, sets: Record<string, string|null>}[]}>} */
  manifest() {
    this.#manifest ??= this.#json('manifest.json').catch(err => {
      this.#manifest = null; // bir sonraki denemede yeniden yükle
      throw err;
    });
    return this.#manifest;
  }

  /**
   * Bir seviye + alt seviye için seti getirir.
   * @returns {Promise<object|null>} içerik yoksa null
   */
  async getSet(levelId, sublevelId) {
    const manifest = await this.manifest();
    const path = manifest.levels.find(l => l.id === levelId)?.sets?.[sublevelId];
    if (!path) return null;

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

  /** Ses dosyası yollarını içerik köküne göre çözer. */
  resolve(path) {
    return /^(https?:|blob:|data:|\/)/.test(path) ? path : this.#root + path;
  }

  async #json(path) {
    const res = await this.#fetch(this.#root + path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${path} yüklenemedi (HTTP ${res.status})`);
    return res.json();
  }
}
