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
