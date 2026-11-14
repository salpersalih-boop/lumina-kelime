import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateSet } from '../js/services/contentSchema.js';
import { validateAll } from '../tools/validate-content.js';

const load = async p => JSON.parse(await readFile(new URL(`../content/${p}`, import.meta.url), 'utf8'));

test('tüm içerik dosyaları şemaya uyuyor', async () => {
  const { problems, checked } = await validateAll();
  assert.deepEqual(problems, []);
  assert.ok(checked >= 3);
});

test('A1 alt seviyeleri istenen soru sayısında: 3 / 4 / 5', async () => {
  const counts = await Promise.all(['kolay', 'orta', 'zor'].map(async s => (await load(`a1/${s}.json`)).questions.length));
  assert.deepEqual(counts, [3, 4, 5]);
});

test('A1 orta seviye bir diyalog (birden fazla konuşmacı)', async () => {
  const set = await load('a1/orta.json');
  assert.ok(Object.keys(set.speakers).length >= 2);
});

test('doğru cevaplar tek bir şıkta toplanmamış', async () => {
  for (const s of ['kolay', 'orta', 'zor']) {
    const set = await load(`a1/${s}.json`);
    const answers = new Set(set.questions.map(q => q.answer));
    assert.ok(answers.size > 1 || set.questions.length === 1, `${s}: tüm cevaplar aynı şıkta`);
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
