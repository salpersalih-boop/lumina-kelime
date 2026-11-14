/** Küçük, bağımlılıksız olay yayıcı. Oynatıcılar bunun üzerine kurulur. */
export class Emitter {
  #handlers = new Map();

  /**
   * @param {string} type
   * @param {(payload: any) => void} fn
   * @returns {() => void} aboneliği iptal eden fonksiyon
   */
  on(type, fn) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(fn);
    return () => this.#handlers.get(type)?.delete(fn);
  }

  emit(type, payload) {
    this.#handlers.get(type)?.forEach(fn => {
      try { fn(payload); } catch (err) { console.error(`[${type}] dinleyici hatası`, err); }
    });
  }

  removeAll() {
    this.#handlers.clear();
  }
}
