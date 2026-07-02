// reexport.test.js — barrel modules: निर्यात { … } आ "म".
//
// A re-export forwards names from another module without a local declaration,
// so one "barrel" module can present a curated surface gathered from several.
// Each entry may be aliased with रूपेण (the left name is the source's export,
// the right is what the barrel exports). Re-exports are honoured everywhere:
//   • runtime  — the name resolves to the original module's value,
//   • types    — the export's type flows THROUGH the barrel (and through a
//                chain of barrels) onto the consumer, and
//   • existence — a re-export of a name the source does not export is flagged
//                 in the barrel itself.
import { bundle, checkProgram } from '../src/bundler.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function mk(files) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-reexp-'));
  for (const [n, s] of Object.entries(files)) writeFileSync(join(dir, n), s, 'utf8');
  return dir;
}
function run(files, entry) {
  const dir = mk(files);
  try {
    const code = bundle(join(dir, entry), { includeRuntime: false });
    const logs = [];
    new Function('console', code)({ log: (...a) => logs.push(a.map(x =>
      Array.isArray(x) ? JSON.stringify(x) : String(x)).join(' ')) });
    return logs;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
function check(files, entry) {
  const dir = mk(files);
  try { return checkProgram(join(dir, entry)); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
const argErr = ds => ds.filter(d => d.kind === 'type-arg');
const missing = ds => ds.filter(d => d.kind === 'import-missing');

const LIB = {
  'गणित2.deva': `निर्यात कार्य द्विगुण (न: सङ्ख्या): सङ्ख्या { फलम् न + न। }
निर्यात नियत नामः: अक्षर = "मॉड्यूल"।`,
};

// ---------- runtime: a barrel forwards names (some aliased) ----------
{
  const out = run({ ...LIB,
    'सर्वम्.deva': `निर्यात { द्विगुण, नामः रूपेण नाम } आ "गणित2"।`,
    'मुख्य.deva': `आयात { द्विगुण, नाम } आ "सर्वम्"।\nदर्शय(द्विगुण(२१))।\nदर्शय(नाम)।` }, 'मुख्य.deva');
  ok('a barrel re-exports a value under its own name', out[0] === '42');
  ok('a re-export may be aliased with रूपेण', out[1] === 'मॉड्यूल');
}

// ---------- a barrel over the shipped std/ modules ----------
{
  const out = run({
    'उपकरणम्.deva': `निर्यात { योगः } आ "std/सूची"।\nनिर्यात { आवर्तय } आ "std/पाठ"।`,
    'मुख्य.deva': `आयात { योगः, आवर्तय } आ "उपकरणम्"।\nदर्शय(योगः([१,२,३]))।\nदर्शय(आवर्तय("x", ३))।` }, 'मुख्य.deva');
  ok('a barrel can gather names from several std/ modules', out[0] === '6' && out[1] === 'xxx');
}

// ---------- types flow THROUGH the barrel ----------
{
  const ds = check({ ...LIB,
    'सर्वम्.deva': `निर्यात { द्विगुण } आ "गणित2"।`,
    'मुख्य.deva': `आयात { द्विगुण } आ "सर्वम्"।\nदर्शय(द्विगुण("तार"))।` }, 'मुख्य.deva');
  ok('a wrong call to a re-exported function is flagged through the barrel',
     argErr(ds).length === 1);
}
{
  const ds = check({ ...LIB,
    'सर्वम्.deva': `निर्यात { द्विगुण } आ "गणित2"।`,
    'मुख्य.deva': `आयात { द्विगुण } आ "सर्वम्"।\nदर्शय(द्विगुण(४))।` }, 'मुख्य.deva');
  ok('a correct call through the barrel is clean', ds.length === 0);
}

// ---------- types flow through a CHAIN of barrels (अ → ब → गणित2) ----------
{
  const files = { ...LIB,
    'ब.deva': `निर्यात { द्विगुण } आ "गणित2"।`,
    'अ.deva': `निर्यात { द्विगुण रूपेण dbl } आ "ब"।`,
    'मुख्य.deva': `आयात { dbl } आ "अ"।\nदर्शय(dbl("x"))।` };
  const ds = check(files, 'मुख्य.deva');
  ok('the type survives a chain of re-exports (and the rename)',
     argErr(ds).length === 1 && /'dbl'/.test(argErr(ds)[0].message));
  const out = run({ ...files, 'मुख्य.deva': `आयात { dbl } आ "अ"।\nदर्शय(dbl(१०))।` }, 'मुख्य.deva');
  ok('the chain resolves at runtime too', out[0] === '20');
}

// ---------- existence: a re-export of a non-existent name is flagged ----------
{
  const ds = check({ ...LIB,
    'सर्वम्.deva': `निर्यात { नास्ति } आ "गणित2"।`,
    'मुख्य.deva': `आयात { नास्ति } आ "सर्वम्"।` }, 'मुख्य.deva');
  const d = missing(ds).find(x => /'नास्ति'/.test(x.message) && /सर्वम्\.deva$/.test(x.file));
  ok('re-exporting a name the source lacks is flagged in the barrel', !!d);
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
