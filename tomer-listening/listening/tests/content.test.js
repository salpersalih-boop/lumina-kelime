import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateSet } from '../js/services/contentSchema.js';
import { validateAll } from '../tools/validate-content.js';
import { normalizeManifest } from '../js/services/contentRepository.js';
import { wordCount, lengthClassOf } from '../js/core/sets.js';

const load = async p => JSON.parse(await readFile(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const manifest = normalizeManifest(await load('manifest.json'));
const SUBS = ['kolay', 'orta', 'zor'];
const EXPECTED = { A1: { kolay: 65, orta: 70, zor: 65 }, A2: { kolay: 65, orta: 70, zor: 65 } };
const QUESTIONS = { kolay: 3, orta: 4, zor: 5 };
const levelOf = id => manifest.levels.find(l => l.id === id);
const setsOf = (lvl, sub) => Promise.all(levelOf(lvl).sets[sub].map(load));

test('tüm içerik dosyaları şemaya uyuyor', async () => {
  const { problems, checked } = await validateAll();
  assert.deepEqual(problems, []);
  assert.ok(checked >= 400);
});

for (const lvl of Object.keys(EXPECTED)) {
  test(`${lvl} metin sayıları: Kolay ${EXPECTED[lvl].kolay}, Orta ${EXPECTED[lvl].orta}, Zor ${EXPECTED[lvl].zor}`, () => {
    const s = levelOf(lvl).sets;
    assert.deepEqual({ kolay: s.kolay.length, orta: s.orta.length, zor: s.zor.length }, EXPECTED[lvl]);
  });

  test(`${lvl} soru sayıları her metinde: Kolay 3, Orta 4, Zor 5`, async () => {
    for (const sub of SUBS) {
      for (const set of await setsOf(lvl, sub)) {
        assert.equal(set.level, lvl, `${set.id}: level alanı ${set.level}`);
        assert.equal(set.questions.length, QUESTIONS[sub], `${set.id}: ${set.questions.length} soru`);
      }
    }
  });

  test(`${lvl}: her alt seviyede kısa, orta ve uzun metin var`, async () => {
    for (const sub of SUBS) {
      const classes = new Set((await setsOf(lvl, sub)).map(s => lengthClassOf(wordCount(s.script)).id));
      assert.deepEqual([...classes].sort(), ['kisa', 'orta', 'uzun'], `${lvl} ${sub}: ${[...classes]}`);
    }
  });

  test(`${lvl}: zorluk arttıkça metinler ortalamada uzuyor`, async () => {
    const avg = async sub => {
      const sets = await setsOf(lvl, sub);
      return sets.reduce((s, x) => s + wordCount(x.script), 0) / sets.length;
    };
    const [k, o, z] = await Promise.all(SUBS.map(avg));
    assert.ok(k < o && o < z, `ortalama kelime: ${k.toFixed(0)} / ${o.toFixed(0)} / ${z.toFixed(0)}`);
  });

  test(`${lvl}: Orta setlerin hepsi diyalog, Zor setlerde dinleme hakkı sınırlı`, async () => {
    for (const set of await setsOf(lvl, 'orta')) {
      assert.ok(Object.keys(set.speakers).length >= 2, `${set.id} diyalog değil`);
    }
    for (const set of await setsOf(lvl, 'zor')) assert.ok(set.audio.maxPlays > 0, `${set.id}: maxPlays yok`);
  });
}

test('her sette doğru cevaplar tek bir şıkta toplanmamış, başlıklar tüm seviyelerde benzersiz', async () => {
  const titles = new Set();
  for (const lvl of Object.keys(EXPECTED)) {
    for (const sub of SUBS) {
      for (const set of await setsOf(lvl, sub)) {
        assert.ok(new Set(set.questions.map(q => q.answer)).size > 1, `${set.id}: tüm cevaplar aynı şıkta`);
        assert.ok(!titles.has(set.title), `başlık tekrar ediyor: ${set.title}`);
        titles.add(set.title);
      }
    }
  }
});

test('şema: hatalı seti yakalar', () => {
  const bad = {
    id: 'x', level: 'A1', sublevel: 'süper', title: 'T', topic: 'K',
    audio: { lang: 'en-US', rate: 3 },
    speakers: { a: { name: 'A' } },
    script: [{ speaker: 'b', text: 'Hello there.' }],
    questions: [
      { id: 'q1', prompt: 'P?', options: ['x', 'x'], answer: 5, feedback: 'f', evidence: 'not in text' },
      { id: 'q1', prompt: 'P?', options: ['a', 'b'], answer: 0, feedback: 'f', evidence: 'Hello' },
    ],
  };
  const errors = validateSet(bad).join('\n');
  for (const needle of ['sublevel', 'audio.rate', 'speakers içinde', 'aynı şık', 'answer', 'birebir geçmiyor', 'tekrar ediyor']) {
    assert.match(errors, new RegExp(needle), `beklenen hata yok: ${needle}`);
  }
});
