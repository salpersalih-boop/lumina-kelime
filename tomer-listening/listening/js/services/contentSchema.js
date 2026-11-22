import { SUBLEVEL_IDS } from '../config.js';

/**
 * Bir dinleme setinin yapısını doğrular. Hem tarayıcıda (yüklerken)
 * hem de Node'da (tools/validate-content.js, testler) kullanılır.
 *
 * Set biçimi için README.md › "İçerik şeması" bölümüne bakın.
 * @returns {string[]} hata mesajları (boşsa set geçerli)
 */
export function validateSet(set) {
  const errors = [];
  const err = msg => errors.push(msg);
  const isStr = v => typeof v === 'string' && v.trim().length > 0;

  if (!set || typeof set !== 'object') return ['Set bir nesne olmalı'];

  for (const key of ['id', 'level', 'title', 'topic']) {
    if (!isStr(set[key])) err(`"${key}" boş olamaz`);
  }
  if (!SUBLEVEL_IDS.includes(set.sublevel)) {
    err(`"sublevel" şunlardan biri olmalı: ${SUBLEVEL_IDS.join(', ')}`);
  }

  // Ses ayarları
  const audio = set.audio ?? {};
  if (!isStr(audio.lang)) err('"audio.lang" gerekli (ör. "en-US")');
  if (audio.rate !== undefined && !(typeof audio.rate === 'number' && audio.rate >= 0.5 && audio.rate <= 1.5)) {
    err('"audio.rate" 0.5 ile 1.5 arasında olmalı');
  }
  if (set.questionLang != null && !isStr(set.questionLang)) err('"questionLang" boş olamaz (ör. "tr")');
  if (audio.src != null && !isStr(audio.src)) err('"audio.src" null ya da dosya yolu olmalı');
  if (audio.maxPlays != null && !(Number.isInteger(audio.maxPlays) && audio.maxPlays > 0)) {
    err('"audio.maxPlays" null ya da pozitif tam sayı olmalı');
  }

  // Konuşmacılar ve metin
  const speakers = set.speakers ?? {};
  if (!Array.isArray(set.script) || set.script.length === 0) {
    err('"script" en az bir satır içermeli');
  } else {
    set.script.forEach((line, i) => {
      if (!isStr(line?.text)) err(`script[${i}].text boş`);
      if (!speakers[line?.speaker]) err(`script[${i}].speaker "${line?.speaker}" speakers içinde tanımlı değil`);
      if (line?.start != null && typeof line.start !== 'number') err(`script[${i}].start sayı olmalı (saniye)`);
    });
  }
  for (const [id, sp] of Object.entries(speakers)) {
    if (!isStr(sp?.name)) err(`speakers.${id}.name boş`);
  }

  // Sorular
  const fullText = (set.script ?? []).map(l => l?.text ?? '').join(' ').toLowerCase();
  if (!Array.isArray(set.questions) || set.questions.length === 0) {
    err('"questions" en az bir soru içermeli');
  } else {
    const ids = new Set();
    set.questions.forEach((q, i) => {
      const at = `questions[${i}]`;
      if (!isStr(q?.id)) err(`${at}.id boş`);
      else if (ids.has(q.id)) err(`${at}.id "${q.id}" tekrar ediyor`);
      else ids.add(q.id);

      if (!isStr(q?.prompt)) err(`${at}.prompt boş`);
      if (!Array.isArray(q?.options) || q.options.length < 2 || q.options.length > 6 || !q.options.every(isStr)) {
        err(`${at}.options 2–6 dolu şık içermeli`);
      } else {
        if (new Set(q.options.map(o => o.trim().toLowerCase())).size !== q.options.length) err(`${at}.options içinde aynı şık var`);
        if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)) err(`${at}.answer geçerli bir şık indeksi değil`);
      }
      if (!isStr(q?.feedback)) err(`${at}.feedback boş`);
      if (!isStr(q?.evidence)) err(`${at}.evidence boş`);
      else if (!fullText.includes(q.evidence.toLowerCase())) err(`${at}.evidence metinde birebir geçmiyor: "${q.evidence}"`);
    });
  }

  return errors;
}

export class ContentError extends Error {
  constructor(path, errors) {
    super(`${path} geçersiz:\n- ${errors.join('\n- ')}`);
    this.name = 'ContentError';
    this.path = path;
    this.errors = errors;
  }
}
