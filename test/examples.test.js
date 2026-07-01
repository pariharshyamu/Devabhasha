// examples.test.js — integrity guard for the examples/ tree.
//
// Two regressions this catches:
//   1. Mojibake filenames. The Devanagari-named .deva files were once
//      committed with CP437-corrupted names (सूची.deva → "αñ╕αÑéαñÜαÑÇ.deva"),
//      which made stdlib imports and the module tests fail with ENOENT on a
//      clean checkout. We assert no tracked path carries the CP437 signature.
//   2. An example that no longer compiles.
import { compile } from '../src/index.js';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    out = statSync(p).isDirectory() ? out.concat(walk(p)) : [...out, p];
  }
  return out;
}

const all = walk('examples');

// --- filenames are clean, real Unicode (no CP437 mojibake) ---
// The corruption manifests as Greek/box-drawing glyphs (U+0370–U+03FF,
// U+2500–U+259F) and Latin-1 supplement letters standing in for Devanagari.
// Real names should be ASCII or Devanagari (U+0900–U+097F) only.
const MOJIBAKE = /[Ͱ-Ͽ─-▟]/;
const badNames = all.filter(f => MOJIBAKE.test(f));
ok('no example filename is CP437 mojibake',
   badNames.length === 0 || (console.log('    offenders:', badNames), false));

// --- every path the walker lists actually exists (no dangling names) ---
ok('all example paths resolve on disk',
   all.every(f => { try { statSync(f); return true; } catch { return false; } }));

// --- the stdlib modules the other test files import all exist ---
const requiredStdlib = ['सूची', 'कोष', 'पाठ', 'परीक्षा', 'मार्गकः'];
for (const m of requiredStdlib) {
  ok(`stdlib module exists: ${m}.deva`,
     all.includes(join('examples', 'stdlib', `${m}.deva`)));
}

// --- every example .deva still compiles ---
{
  const deva = all.filter(f => f.endsWith('.deva'));
  let compiled = 0, broke = [];
  for (const f of deva) {
    try { compile(readFileSync(f, 'utf8'), { includeRuntime: false }); compiled++; }
    catch (e) { broke.push(`${f}: ${e.message.split('\n')[0]}`); }
  }
  ok(`all ${deva.length} example .deva files compile`,
     broke.length === 0 || (console.log('    broken:', broke), false));
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
