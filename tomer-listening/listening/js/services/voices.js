/**
 * Tarayıcının TTS seslerini yükler ve diyalogdaki her konuşmacıya
 * mümkünse farklı bir ses atar.
 */

const FEMALE = /female|woman|samantha|victoria|karen|zira|aria|jenny|susan|libby|sonia|emma|serena|moira|tessa|fiona|ava|allison/i;
const MALE = /\bmale\b|\bman\b|daniel|alex|david|guy|ryan|george|fred|mark|tom|arthur|oliver|aaron|rishi/i;
const QUALITY = /natural|neural|premium|enhanced|google/i;

/** Sesler bazı tarayıcılarda geç yüklenir; kısa bir süre bekler. */
export function loadVoices(timeoutMs = 1500) {
  const synth = globalThis.speechSynthesis;
  if (!synth) return Promise.resolve([]);
  const ready = synth.getVoices();
  if (ready.length) return Promise.resolve(ready);

  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener?.('voiceschanged', finish);
    setTimeout(finish, timeoutMs);
  });
}

/**
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} lang ör. "en-US"
 * @param {Record<string, {name: string, voice?: 'female'|'male'}>} speakers
 * @returns {Map<string, {voice: SpeechSynthesisVoice|null, pitch: number}>}
 */
export function assignVoices(voices, lang, speakers) {
  const norm = l => (l ?? '').replace('_', '-').toLowerCase();
  const target = norm(lang);
  const base = target.split('-')[0];

  const score = v => (norm(v.lang) === target ? 4 : 0) + (QUALITY.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  const pool = voices
    .filter(v => norm(v.lang).startsWith(base))
    .sort((a, b) => score(b) - score(a));

  const used = new Set();
  const map = new Map();
  const pitches = [1, 0.85, 1.15, 0.95];

  Object.entries(speakers).forEach(([id, sp], i) => {
    const wanted = sp.voice === 'female' ? FEMALE : sp.voice === 'male' ? MALE : null;
    const pick =
      (wanted && pool.find(v => !used.has(v) && wanted.test(v.name))) ||
      pool.find(v => !used.has(v)) ||
      pool[0] ||
      null;

    if (pick) used.add(pick);
    // Aynı ses tekrar kullanılıyorsa konuşmacıları perdeyle ayır.
    const reused = pick && [...map.values()].some(m => m.voice === pick);
    map.set(id, { voice: pick, pitch: reused || !pick ? pitches[i % pitches.length] : 1 });
  });

  return map;
}
