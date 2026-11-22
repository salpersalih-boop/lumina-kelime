import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateAll, CATALOGS } from '../tools/validate-content.js';
import { normalizeManifest } from '../js/services/contentRepository.js';
import { wordCount, lengthClassOf } from '../js/core/sets.js';

/** Dinleyerek Öğren kataloğu (content/diller): dil × Kolay/Orta/Zor. */
const load = async p => JSON.parse(await readFile(new URL(`../content/diller/${p}`, import.meta.url), 'utf8'));
const manifest = normalizeManifest(await load('manifest.json'));
const SUBS = ['kolay', 'orta', 'zor'];
const EXPECTED = { ES: { kolay: 10, orta: 10, zor: 10 }, PT: { kolay: 10, orta: 10, zor: 10 } };
const QUESTIONS = { kolay: 3, orta: 4, zor: 5 };
const levelOf = id => manifest.levels.find(l => l.id === id);
const setsOf = (lvl, sub) => Promise.all(levelOf(lvl).sets[sub].map(load));

test('diller: manifest "app" alanı ve dil bilgileri tam', () => {
  assert.equal(manifest.app.groupLabel, 'Diller');
  assert.ok(manifest.app.heading.length === 2);
  for (const l of manifest.levels) {
    assert.match(l.id, /^[A-Z]{2}$/, `${l.id}: dil kodu iki büyük harf olmalı`);
    assert.ok(l.label && l.flag && l.lang, `${l.id}: label, flag ve lang gerekli`);
  }
});

test('diller: tüm içerik dosyaları şemaya uyuyor ve audio.lang dile uyuyor', async () => {
  const { problems, checked } = await validateAll(CATALOGS.diller);
  assert.deepEqual(problems, []);
  assert.ok(checked >= 60);
});

for (const lvl of Object.keys(EXPECTED)) {
  test(`${lvl}: metin sayıları Kolay ${EXPECTED[lvl].kolay}, Orta ${EXPECTED[lvl].orta}, Zor ${EXPECTED[lvl].zor}`, () => {
    const s = levelOf(lvl).sets;
    assert.deepEqual({ kolay: s.kolay.length, orta: s.orta.length, zor: s.zor.length }, EXPECTED[lvl]);
  });

  test(`${lvl}: soru sayıları (3/4/5), sorular Türkçe, cevaplar tek şıkta değil`, async () => {
    for (const sub of SUBS) {
      for (const set of await setsOf(lvl, sub)) {
        assert.equal(set.questions.length, QUESTIONS[sub], `${set.id}: ${set.questions.length} soru`);
        assert.equal(set.questionLang, 'tr', `${set.id}: sorular Türkçe işaretlenmeli`);
        assert.ok(new Set(set.questions.map(q => q.answer)).size > 1, `${set.id}: tüm cevaplar aynı şıkta`);
      }
    }
  });

  test(`${lvl}: her zorlukta kısa, orta ve uzun metin var; zorluk arttıkça uzuyor`, async () => {
    const avgs = [];
    for (const sub of SUBS) {
      const sets = await setsOf(lvl, sub);
      const words = sets.map(s => wordCount(s.script));
      const classes = new Set(words.map(w => lengthClassOf(w).id));
      assert.deepEqual([...classes].sort(), ['kisa', 'orta', 'uzun'], `${lvl} ${sub}: ${[...classes]}`);
      avgs.push(words.reduce((a, b) => a + b, 0) / words.length);
    }
    assert.ok(avgs[0] < avgs[1] && avgs[1] < avgs[2], `ortalama kelime: ${avgs.map(a => a.toFixed(0)).join(' / ')}`);
  });

  test(`${lvl}: Orta setler diyalog, Zor setlerde dinleme hakkı sınırlı`, async () => {
    for (const set of await setsOf(lvl, 'orta')) assert.ok(Object.keys(set.speakers).length >= 2, `${set.id} diyalog değil`);
    for (const set of await setsOf(lvl, 'zor')) assert.ok(set.audio.maxPlays > 0, `${set.id}: maxPlays yok`);
  });
}

test('diller: başlıklar katalog genelinde benzersiz', async () => {
  const titles = new Set();
  for (const lvl of Object.keys(EXPECTED)) for (const sub of SUBS) for (const set of await setsOf(lvl, sub)) {
    assert.ok(!titles.has(set.title), `başlık tekrar ediyor: ${set.title}`);
    titles.add(set.title);
  }
});

test('wordCount: aksanlı harfler kelimeyi bölmez', () => {
  assert.equal(wordCount([{ text: 'El año está aquí, coração.' }]), 5);
});
