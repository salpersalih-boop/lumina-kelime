#!/usr/bin/env node
/**
 * Tüm içerik dosyalarını doğrular: manifest'teki her yol var mı,
 * her set şemaya uyuyor mu, level/sublevel/id manifest'teki yeriyle tutarlı mı.
 * İki katalog vardır: content/ (TÖMER) ve content/diller/ (Dinleyerek Öğren).
 * Kullanım: npm run validate   (CI'da da çalıştırılabilir)
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateSet } from '../js/services/contentSchema.js';
import { normalizeManifest } from '../js/services/contentRepository.js';
import { setIdOf, setPathOf, wordCount, lengthClassOf } from '../js/core/sets.js';
import { SUBLEVEL_IDS } from '../js/config.js';

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
/** Kataloglar: ad → içerik kökü. */
export const CATALOGS = Object.freeze({ tomer: CONTENT, diller: join(CONTENT, 'diller') });

/**
 * @returns {Promise<{problems: string[], checked: number,
 *   summary: {level: string, sub: string, n: number, title: string, words: number, length: string}[]}>}
 */
export async function validateAll(root = CONTENT) {
  const problems = [];
  const summary = [];
  const raw = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  const manifest = normalizeManifest(raw);
  const ids = new Set();

  for (const [li, level] of manifest.levels.entries()) {
    for (const sub of SUBLEVEL_IDS) {
      if (!(sub in (raw.levels[li].sets ?? {}))) problems.push(`${level.id}: "${sub}" alanı manifest'te yok`);

      for (const [i, path] of level.sets[sub].entries()) {
        const n = i + 1;
        let set;
        try {
          set = JSON.parse(await readFile(join(root, path), 'utf8'));
        } catch (err) {
          problems.push(`${path}: okunamadı (${err.message})`);
          continue;
        }
        validateSet(set).forEach(e => problems.push(`${path}: ${e}`));
        if (set.level !== level.id) problems.push(`${path}: level "${set.level}", manifest "${level.id}" diyor`);
        if (set.sublevel !== sub) problems.push(`${path}: sublevel "${set.sublevel}", manifest "${sub}" diyor`);
        if (level.lang && set.audio?.lang !== level.lang) problems.push(`${path}: audio.lang "${set.audio?.lang}", manifest "${level.lang}" diyor`);

        const expectedId = setIdOf(level.id, sub, n);
        if (set.id !== expectedId) problems.push(`${path}: id "${set.id}" olmalı: "${expectedId}" (listedeki sırası ${n})`);
        if (path !== setPathOf(level.id, sub, n)) problems.push(`${path}: dosya adı sırayla uyuşmuyor, beklenen "${setPathOf(level.id, sub, n)}"`);
        if (ids.has(set.id)) problems.push(`${path}: id "${set.id}" başka bir sette de var`);
        ids.add(set.id);

        if (Array.isArray(set.script)) {
          const words = wordCount(set.script);
          summary.push({ level: level.id, sub, n, title: set.title, words, length: lengthClassOf(words).label });
        }
      }
    }
  }
  return { problems, checked: summary.length, summary };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let total = 0;
  for (const [name, root] of Object.entries(CATALOGS)) {
    const { problems, checked, summary } = await validateAll(root);
    if (problems.length) {
      console.error(`✗ ${name}: ${problems.length} sorun bulundu:\n  ${problems.join('\n  ')}`);
      process.exit(1);
    }
    if (process.argv.includes('--list')) {
      for (const s of summary) {
        console.log(`  ${s.level.padEnd(2)} ${s.sub.padEnd(5)} ${String(s.n).padStart(2)}  ${s.length.padEnd(4)} ${String(s.words).padStart(3)} kelime  ${s.title}`);
      }
    }
    console.log(`✓ ${name}: ${checked} set geçerli.`);
    total += checked;
  }
  console.log(`✓ Toplam ${total} set.`);
}
