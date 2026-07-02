// import-existence.test.js — a named import must name a real निर्यात.
//
// `आयात { x } आ "म"` where module म does not export x binds `undefined` at
// runtime — a silent bug. checkProgram (the graph-wide `devabhasha check`) has
// every module's export list, so it flags such an import, pointed precisely at
// the offending name. Namespace and side-effect imports name nothing, so they
// are never flagged. Programs are written to a temp dir and checked through the
// real bundler graph.
import { checkProgram } from '../src/bundler.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function check(files, entry) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-imp-'));
  for (const [name, src] of Object.entries(files)) writeFileSync(join(dir, name), src, 'utf8');
  try { return checkProgram(join(dir, entry)); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
const missing = ds => ds.filter(d => d.kind === 'import-missing');

// a small library exporting exactly two names
const LIB = {
  'गणित.deva': `निर्यात कार्य द्विगुण (न: सङ्ख्या): सङ्ख्या { फलम् न + न। }
निर्यात नियत नामः: अक्षर = "मॉड्यूल"।`,
};

// ---------- a missing named import is flagged ----------
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण, नास्ति } आ "गणित"।\nदर्शय(द्विगुण(२))।` }, 'मुख्य.deva');
  ok('a non-exported name is flagged', missing(ds).length === 1);
  ok('the message names the symbol and the source',
     missing(ds)[0] && /'नास्ति'/.test(missing(ds)[0].message) && /"गणित"/.test(missing(ds)[0].message));
}

// ---------- an all-existing import is clean ----------
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण, नामः } आ "गणित"।\nदर्शय(द्विगुण(२))।` }, 'मुख्य.deva');
  ok('every name existing → no import diagnostic', missing(ds).length === 0);
}

// ---------- only the offending name is flagged, at its own position ----------
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण, नास्ति } आ "गणित"।` }, 'मुख्य.deva');
  const d = missing(ds)[0];
  ok('the diagnostic points at the missing name (line 1, real col)',
     d && d.line === 1 && d.col > 0);
  ok('the existing name द्विगुण is NOT flagged', missing(ds).length === 1);
}

// ---------- namespace + side-effect imports name nothing ----------
{
  const ds = check({ ...LIB,
    'नाम.deva': `आयात * रूपेण ग आ "गणित"।\nदर्शय(ग.द्विगुण(२))।` }, 'नाम.deva');
  ok('a namespace import is never an existence error', missing(ds).length === 0);
}
{
  const ds = check({
    'प्र.deva': `दर्शय("भारः")।`,
    'मुख्य.deva': `आयात "प्र"।\nदर्शय("मुख्य")।` }, 'मुख्य.deva');
  ok('a side-effect import is never an existence error', missing(ds).length === 0);
}

// ---------- a name a module imports but does not RE-export is not visible ----
{
  // ब imports नामः from गणित for internal use but re-exports only its own काम.
  const ds = check({ ...LIB,
    'ब.deva': `आयात { नामः } आ "गणित"।\nनिर्यात कार्य काम (): अक्षर { फलम् नामः। }`,
    'मुख्य.deva': `आयात { काम, नामः } आ "ब"।\nदर्शय(काम())।` }, 'मुख्य.deva');
  ok('an imported-but-not-re-exported name is not importable downstream',
     missing(ds).length === 1 && /'नामः'/.test(missing(ds)[0].message));
}

// ---------- it flows through the canonical std/ root too ----------
{
  const ds = check({ 'मुख्य.deva': `आयात { योगः, नास्तिफलम् } आ "std/सूची"। दर्शय(योगः([१]))।` }, 'मुख्य.deva');
  ok('a missing name from a std/ module is flagged',
     missing(ds).length === 1 && /'नास्तिफलम्'/.test(missing(ds)[0].message));
  const ds2 = check({ 'मुख्य.deva': `आयात { योगः, महत्तमम् } आ "std/सूची"। दर्शय(योगः([१]))।` }, 'मुख्य.deva');
  ok('real std/ names import clean', missing(ds2).length === 0);
}

// ---------- the diagnostic is attributed to the importing file ----------
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { नास्ति } आ "गणित"।` }, 'मुख्य.deva');
  ok('carries the importing file path', missing(ds)[0] && /मुख्य\.deva$/.test(missing(ds)[0].file));
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
