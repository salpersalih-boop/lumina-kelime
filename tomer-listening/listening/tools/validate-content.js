#!/usr/bin/env node
/**
 * Tüm içerik dosyalarını doğrular: manifest'teki her yol var mı,
 * her set şemaya uyuyor mu, level/sublevel manifest ile tutarlı mı.
 * Kullanım: npm run validate   (CI'da da çalıştırılabilir)
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateSet } from '../js/services/contentSchema.js';
import { SUBLEVEL_IDS } from '../js/config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');

export async function validateAll() {
  const problems = [];
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  const ids = new Set();
  let checked = 0;

  for (const level of manifest.levels) {
    for (const sub of SUBLEVEL_IDS) {
      if (!(sub in (level.sets ?? {}))) problems.push(`${level.id}: "${sub}" alanı manifest'te yok`);
      const path = level.sets?.[sub];
      if (!path) continue;

      let set;
      try {
        set = JSON.parse(await readFile(join(root, path), 'utf8'));
      } catch (err) {
        problems.push(`${path}: okunamadı (${err.message})`);
        continue;
      }
      checked++;
      validateSet(set).forEach(e => problems.push(`${path}: ${e}`));
      if (set.level !== level.id) problems.push(`${path}: level "${set.level}", manifest "${level.id}" diyor`);
      if (set.sublevel !== sub) problems.push(`${path}: sublevel "${set.sublevel}", manifest "${sub}" diyor`);
      if (ids.has(set.id)) problems.push(`${path}: id "${set.id}" başka bir sette de var`);
      ids.add(set.id);
    }
  }
  return { problems, checked };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { problems, checked } = await validateAll();
  if (problems.length) {
    console.error(`✗ ${problems.length} sorun bulundu:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`✓ ${checked} set geçerli.`);
}
