// import-alias.test.js — named-import aliasing: आयात { x रूपेण y } आ "म".
//
// रूपेण ("as") renames an import: the LEFT name is what the module exports, the
// RIGHT is the local binding this file sees. Runtime binds the local name to
// the module's exported value; the type checker flows the export's type onto
// the local name; and import-existence is still checked on the EXPORTED name
// (a typo there is a real missing import, regardless of the alias). Programs
// are written to a temp dir and exercised through the real bundler.
import { bundle, checkProgram } from '../src/bundler.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function mk(files) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-alias-'));
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
const kinds = ds => ds.map(d => d.kind);

const LIB = {
  'गणित2.deva': `निर्यात कार्य द्विगुण (न: सङ्ख्या): सङ्ख्या { फलम् न + न। }
निर्यात नियत नामः: अक्षर = "मॉड्यूल"।`,
};

// ---------- runtime: the local alias binds the exported value ----------
{
  const out = run({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण रूपेण दुगुना } आ "गणित2"।\nदर्शय(दुगुना(२१))।` }, 'मुख्य.deva');
  ok('an aliased import binds the module value under the new name', out[0] === '42');
}
{
  // several names, some aliased and some plain, in one import list
  const out = run({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण, नामः रूपेण नाम } आ "गणित2"।\nदर्शय(द्विगुण(५))।\nदर्शय(नाम)।` }, 'मुख्य.deva');
  ok('mixed aliased + plain imports both bind', out[0] === '10' && out[1] === 'मॉड्यूल');
}
{
  // aliasing works through the canonical std/ root, incl. the SAME export
  // imported under two different aliases from two modules
  const out = run({
    'मुख्य.deva': `आयात { आवर्तय रूपेण rep } आ "std/पाठ"।\nदर्शय(rep("ab", ३))।` }, 'मुख्य.deva');
  ok('aliasing works through a std/ import', out[0] === 'ababab');
}

// ---------- types flow onto the LOCAL name ----------
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण रूपेण दुगुना } आ "गणित2"।\nदर्शय(दुगुना("तार"))।` }, 'मुख्य.deva');
  const d = ds.find(x => x.kind === 'type-arg');
  ok('a wrong call through the alias is flagged', !!d);
  ok('the diagnostic names the LOCAL alias', d && /'दुगुना'/.test(d.message));
}
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण रूपेण दुगुना } आ "गणित2"।\nदर्शय(दुगुना(४))।` }, 'मुख्य.deva');
  ok('a correct call through the alias is clean', ds.length === 0);
}

// ---------- existence is checked on the EXPORTED name ----------
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { नास्ति रूपेण x } आ "गणित2"।` }, 'मुख्य.deva');
  const d = ds.find(x => x.kind === 'import-missing');
  ok('a missing EXPORT is flagged even when aliased', d && /'नास्ति'/.test(d.message));
}
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण रूपेण दुगुना } आ "गणित2"।\nदर्शय(दुगुना(१))।` }, 'मुख्य.deva');
  ok('an existing export aliased is not a missing import', !kinds(ds).includes('import-missing'));
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
