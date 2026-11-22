import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeQuiz, verdict, optionLetter } from '../js/core/scoring.js';
import { estimateSeconds, formatTime, cumulative, locate } from '../js/core/timing.js';
import { createStore } from '../js/core/store.js';
import { loadProgress, saveResult } from '../js/core/progress.js';

const questions = [
  { id: 'q1', answer: 1 },
  { id: 'q2', answer: 0 },
  { id: 'q3', answer: 3 },
];

test('gradeQuiz: doğru, yanlış ve boş cevapları ayırır', () => {
  const r = gradeQuiz(questions, { q1: 1, q2: 2 });
  assert.equal(r.score, 1);
  assert.equal(r.total, 3);
  assert.equal(r.percent, 33);
  assert.equal(r.unanswered, 1);
  assert.deepEqual(r.items.map(i => i.isCorrect), [true, false, false]);
  assert.equal(r.items[2].chosen, null);
});

test('gradeQuiz: hepsi doğruysa %100', () => {
  const r = gradeQuiz(questions, { q1: 1, q2: 0, q3: 3 });
  assert.equal(r.percent, 100);
  assert.equal(verdict(r.percent).tone, 'perfect');
});

test('gradeQuiz: boş soru listesi sıfıra bölmez', () => {
  assert.equal(gradeQuiz([], {}).percent, 0);
});

test('verdict eşikleri', () => {
  assert.equal(verdict(70).tone, 'good');
  assert.equal(verdict(40).tone, 'fair');
  assert.equal(verdict(39).tone, 'low');
});

test('optionLetter', () => {
  assert.equal(optionLetter(0), 'A');
  assert.equal(optionLetter(3), 'D');
});

test('timing: süre tahmini ve biçim', () => {
  assert.equal(estimateSeconds(140, 1), 10);
  assert.equal(estimateSeconds(140, 2), 5);
  assert.equal(estimateSeconds(0, 1), 0);
  assert.equal(formatTime(75), '1:15');
  assert.equal(formatTime(-3), '0:00');
  assert.equal(formatTime(NaN), '0:00');
});

test('timing: cumulative ve locate', () => {
  const lengths = [10, 5, 20];
  assert.deepEqual(cumulative(lengths), { starts: [0, 10, 15], total: 35 });
  assert.deepEqual(locate(lengths, 0), { index: 0, offset: 0 });
  assert.deepEqual(locate(lengths, 12), { index: 1, offset: 2 });
  assert.deepEqual(locate(lengths, 15), { index: 2, offset: 0 });
  assert.equal(locate(lengths, 999).index, 2);
  assert.equal(locate(lengths, -5).index, 0);
});

test('store: güncelleme ve abonelik', () => {
  const store = createStore({ a: 1, b: 2 });
  const seen = [];
  const off = store.subscribe((s, prev) => seen.push([prev.a, s.a]));
  store.set({ a: 5 });
  store.set(s => ({ a: s.a + 1 }));
  off();
  store.set({ a: 100 });
  assert.deepEqual(seen, [[1, 5], [5, 6]]);
  assert.equal(store.get().b, 2);
});

test('progress: yalnızca daha iyi sonuç kaydedilir', () => {
  const mem = new Map();
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveResult('a1-kolay', { percent: 67, score: 2, total: 3 }, storage);
  saveResult('a1-kolay', { percent: 33, score: 1, total: 3 }, storage);
  assert.equal(loadProgress(storage)['a1-kolay'].best, 67);
  saveResult('a1-kolay', { percent: 100, score: 3, total: 3 }, storage);
  assert.equal(loadProgress(storage)['a1-kolay'].best, 100);
});

test('progress: bozuk ya da erişilemeyen depolama uygulamayı çökertmez', () => {
  assert.deepEqual(loadProgress({ getItem: () => '{bozuk' }), {});
  assert.deepEqual(loadProgress({ getItem: () => { throw new Error('yasak'); } }), {});
  const broken = { getItem: () => null, setItem: () => { throw new Error('kota'); } };
  assert.doesNotThrow(() => saveResult('x', { percent: 50, score: 1, total: 2 }, broken));
});

// ── Setler: kimlik, uzunluk, sıradaki metin ─────────────────
import { setIdOf, setPathOf, wordCount, lengthClassOf, nextSet } from '../js/core/sets.js';
import { normalizeManifest } from '../js/services/contentRepository.js';

test('setIdOf / setPathOf: sıra numarasından kimlik ve yol', () => {
  assert.equal(setIdOf('A1', 'kolay', 3), 'a1-kolay-03');
  assert.equal(setPathOf('B2', 'zor', 12), 'b2/zor/12.json');
});

test('wordCount ve lengthClassOf', () => {
  const script = [{ text: "Hi, I'm Tom." }, { text: 'This is my bag — it is blue.' }];
  assert.equal(wordCount(script), 10); // Hi · I'm · Tom + This · is · my · bag · it · is · blue
  assert.equal(lengthClassOf(30).id, 'kisa');
  assert.equal(lengthClassOf(80).id, 'orta');
  assert.equal(lengthClassOf(400).id, 'uzun');
});

test('nextSet: aynı alt seviye → sonraki alt seviye → boşları atlayıp sonraki seviye', () => {
  const subs = ['kolay', 'orta', 'zor'];
  const levels = [
    { id: 'A1', sets: { kolay: 3, orta: 0, zor: 2 } },
    { id: 'A2', sets: { kolay: 0, orta: 1, zor: 0 } },
  ];
  assert.deepEqual(nextSet({ level: 'A1', sub: 'kolay', n: 1 }, levels, subs), { level: 'A1', sub: 'kolay', n: 2 });
  assert.deepEqual(nextSet({ level: 'A1', sub: 'kolay', n: 3 }, levels, subs), { level: 'A1', sub: 'zor', n: 1 });
  assert.deepEqual(nextSet({ level: 'A1', sub: 'zor', n: 2 }, levels, subs), { level: 'A2', sub: 'orta', n: 1 });
  assert.equal(nextSet({ level: 'A2', sub: 'orta', n: 1 }, levels, subs), null);
});

test('normalizeManifest: eski tek-yol biçimini ve null değeri diziye çevirir', () => {
  const m = normalizeManifest({ levels: [{ id: 'A1', sets: { kolay: 'a.json', orta: null, zor: ['b.json', null] } }] });
  assert.deepEqual(m.levels[0].sets, { kolay: ['a.json'], orta: [], zor: ['b.json'] });
});

// ── Yönlendirme ─────────────────────────────────────────────
import { parseRoute, hashOf, parentOf } from '../js/core/route.js';

test('parseRoute: dört ekran ve eski biçim', () => {
  assert.deepEqual(parseRoute(''), { name: 'levels' });
  assert.deepEqual(parseRoute('#/'), { name: 'levels' });
  assert.deepEqual(parseRoute('#/a1'), { name: 'sublevels', level: 'A1' });
  assert.deepEqual(parseRoute('#/A1/Kolay'), { name: 'sets', level: 'A1', sub: 'kolay' });
  assert.deepEqual(parseRoute('#/b2/zor/12'), { name: 'lesson', level: 'B2', sub: 'zor', n: 12 });
  assert.deepEqual(parseRoute('#a1-orta-3'), { name: 'lesson', level: 'A1', sub: 'orta', n: 3 });
  assert.deepEqual(parseRoute('#a1-orta'), { name: 'sets', level: 'A1', sub: 'orta' });
});

test('parseRoute: dil kodları da grup olarak tanınır (#/es/kolay/2)', () => {
  assert.deepEqual(parseRoute('#/es'), { name: 'sublevels', level: 'ES' });
  assert.deepEqual(parseRoute('#/pt/orta'), { name: 'sets', level: 'PT', sub: 'orta' });
  assert.deepEqual(parseRoute('#/es/kolay/2'), { name: 'lesson', level: 'ES', sub: 'kolay', n: 2 });
  assert.equal(hashOf({ name: 'lesson', level: 'ES', sub: 'kolay', n: 2 }), '#/es/easy/2');
});

test('adresler İngilizce: easy / medium / hard; Türkçe adresler de açılır', () => {
  assert.equal(hashOf({ name: 'sets', level: 'A1', sub: 'orta' }), '#/a1/medium');
  assert.equal(hashOf({ name: 'lesson', level: 'PT', sub: 'zor', n: 7 }), '#/pt/hard/7');
  assert.deepEqual(parseRoute('#/a2/Hard/3'), { name: 'lesson', level: 'A2', sub: 'zor', n: 3 });
  assert.deepEqual(parseRoute('#/a1/easy'), { name: 'sets', level: 'A1', sub: 'kolay' });
  assert.deepEqual(parseRoute('#/a1/kolay'), { name: 'sets', level: 'A1', sub: 'kolay' });
});

test('parseRoute: geçersiz parçalar bir üst ekrana düşer', () => {
  // Grup biçimi serbesttir (a1, es, z9); var olup olmadığına manifest karar verir.
  assert.deepEqual(parseRoute('#/z9'), { name: 'sublevels', level: 'Z9' });
  assert.deepEqual(parseRoute('#/uzun-bir-sey'), { name: 'levels' });
  assert.deepEqual(parseRoute('#/a1/super'), { name: 'sublevels', level: 'A1' });
  assert.deepEqual(parseRoute('#/a1/kolay/0'), { name: 'sets', level: 'A1', sub: 'kolay' });
  assert.deepEqual(parseRoute('#/a1/kolay/abc'), { name: 'sets', level: 'A1', sub: 'kolay' });
});

test('hashOf ↔ parseRoute gidiş-dönüş, parentOf', () => {
  for (const r of [{ name: 'levels' }, { name: 'sublevels', level: 'C1' }, { name: 'sets', level: 'A2', sub: 'orta' }, { name: 'lesson', level: 'A1', sub: 'zor', n: 4 }]) {
    assert.deepEqual(parseRoute(hashOf(r)), r);
  }
  assert.deepEqual(parentOf({ name: 'lesson', level: 'A1', sub: 'zor', n: 4 }), { name: 'sets', level: 'A1', sub: 'zor' });
  assert.equal(parentOf({ name: 'levels' }), null);
});
