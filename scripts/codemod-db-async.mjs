#!/usr/bin/env node
/**
 * Codemod: replace Drizzle .get() / .all() with async (await + [0] or remove .all()).
 * Run from project root: node scripts/codemod-db-async.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const srcDir = join(process.cwd(), 'src');
const scriptsDir = join(process.cwd(), 'scripts');

function walk(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
      walk(full, files);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.astro'))) {
      files.push(full);
    }
  }
  return files;
}

const files = [...walk(srcDir), ...walk(scriptsDir)].filter((f) => !f.includes('codemod'));

let total = 0;
for (const file of files) {
  let content = readFileSync(file, 'utf8');
  const original = content;

  // 1) .get() -> )[0]  (one closing paren for (await ...))
  content = content.replace(/\.get\(\)/g, () => {
    total++;
    return ')[0]';
  });

  // 2) Add (await before db.select( on lines that have )[0]
  content = content.replace(/(\s)(= |return |\()(db\.select\()/gm, (m, space, prefix, sel) => {
    if (m.includes(')[0]') && !m.includes('(await db.select(')) {
      return space + prefix + '(await ' + sel;
    }
    return m;
  });

  // 3) .all() -> remove and add await before db. at start of that statement
  content = content.replace(/\.all\(\)/g, () => {
    total++;
    return '';
  });
  content = content.replace(/(\bconst\s+\w+\s*=\s*)(db\.)/gm, (m, prefix, dbPart) => {
    // If line had .all() we already removed it; line might now be "const x = db.select()..." without .all(). Add await.
    if (!m.includes('await db.') && !m.includes('(await db.')) {
      return prefix + 'await ' + dbPart;
    }
    return m;
  });

  if (content !== original) {
    writeFileSync(file, content);
    console.log('Updated:', file);
  }
}
console.log('Done. Total replacements:', total);
