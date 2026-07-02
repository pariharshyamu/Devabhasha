// std-import.test.js — the canonical `std/` import root.
//
// `आयात … आ "std/सूची"` resolves to the shipped standard library REGARDLESS of
// where the importing program lives — so a consumer in a throwaway temp dir,
// with no stdlib files beside it, still links and runs. This is what makes the
// Devabhāṣā-written stdlib usable by name instead of by copy.
import { bundle, checkProgram } from '../src/bundler.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// write a program ALONE in a temp dir (no stdlib copied), then bundle+run it
function runProgram(src) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-std-'));
  const entry = join(dir, 'main.deva');
  writeFileSync(entry, src, 'utf8');
  try {
    const code = bundle(entry, { includeRuntime: false });
    const logs = [];
    new Function('console', code)({ log: (...a) => logs.push(a.map(String).join(' ')) });
    return logs;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
function checkSrc(src) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-std-'));
  const entry = join(dir, 'main.deva');
  writeFileSync(entry, src, 'utf8');
  try { return checkProgram(entry); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

// ---------- resolution + execution ----------
{
  const out = runProgram(`
    आयात { योगः, अद्वितीयम् } आ "std/सूची"।
    दर्शय(योगः([१,२,३,४]))।
    दर्शय(अद्वितीयम्([१,२,२,३]).दीर्घता)।
  `);
  ok('std/सूची resolves and योगः runs', out[0] === '10');
  ok('std/सूची अद्वितीयम् runs', out[1] === '3');
}
{
  const out = runProgram(`
    आयात { आवर्तय } आ "std/पाठ"।
    दर्शय(आवर्तय("ab", ३))।
  `);
  ok('std/पाठ resolves from a bare temp dir', out[0] === 'ababab');
}
{
  // multiple std modules + the .deva suffix both work
  const out = runProgram(`
    आयात { विलयः } आ "std/कोष.deva"।
    नियत म = विलयः(कोष{अ:१}, कोष{ब:२})।
    दर्शय(सङ्ग्रह.कुञ्जयः(म).दीर्घता)।
  `);
  ok('std/कोष.deva (explicit suffix) resolves', out[0] === '2');
}

// ---------- namespace import from std ----------
{
  const out = runProgram(`
    आयात * रूपेण सू आ "std/सूची"।
    दर्शय(सू.योगः([१०,२०]))।
  `);
  ok('namespace import from std works', out[0] === '30');
}

// ---------- cross-module type checking flows through std/ ----------
{
  const ds = checkSrc(`आयात { योगः } आ "std/सूची"। दर्शय(योगः([१,२]))।`);
  ok('checkProgram resolves std/ and stays clean (untyped lib → gradual)', ds.length === 0);
}

// ---------- a missing std module is a clear error ----------
{
  let msg = '';
  try { runProgram(`आयात { x } आ "std/नास्ति"। दर्शय(१)।`); }
  catch (e) { msg = String(e.message || e); }
  ok('a nonexistent std module errors (module not found)', /not found/.test(msg));
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
