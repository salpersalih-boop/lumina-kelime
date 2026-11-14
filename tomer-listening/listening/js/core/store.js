/**
 * Minimal durum deposu: tek kaynak, değişmez güncelleme, abonelik.
 * @template T
 * @param {T} initial
 */
export function createStore(initial) {
  let state = initial;
  const subscribers = new Set();

  return {
    /** @returns {T} */
    get: () => state,

    /** @param {Partial<T> | ((s: T) => Partial<T>)} patch */
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      const prev = state;
      state = { ...state, ...next };
      subscribers.forEach(fn => fn(state, prev));
    },

    /** @param {(s: T, prev: T) => void} fn */
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
