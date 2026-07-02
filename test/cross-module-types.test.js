// cross-module-types.test.js — the type checker across आयात boundaries.
//
// A module's exported signatures are resolved and seeded into an importing
// module's checker, so calls to imported functions are argument-checked and a
// namespace import (आयात * रूपेण) is checked through member access. Programs are
// written to a temp dir and analysed with the real bundler graph (checkProgram).
import { checkProgram } from '../src/bundler.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// write { filename: source } into a temp dir, check `entry`, return diagnostics
function check(files, entry) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-xmod-'));
  for (const [name, src] of Object.entries(files)) writeFileSync(join(dir, name), src, 'utf8');
  try { return checkProgram(join(dir, entry)); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
const kinds = ds => ds.map(d => d.kind);

// a typed library module reused across cases
const LIB = {
  'गणित2.deva': `निर्यात कार्य द्विगुण (न: सङ्ख्या): सङ्ख्या { फलम् न + न। }
निर्यात नियत नामः: अक्षर = "मॉड्यूल"।`,
};

// ---------- named imports ----------
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण } आ "गणित2"।\nदर्शय(द्विगुण("तार"))।` }, 'मुख्य.deva');
  ok('imported function call is argument-checked', kinds(ds).includes('type-arg'));
}
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण } आ "गणित2"।\nदर्शय(द्विगुण(२१))।` }, 'मुख्य.deva');
  ok('a correct imported call is clean', ds.length === 0);
}
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { नामः } आ "गणित2"।\nकार्य ग्रहण(न: सङ्ख्या){ फलम् न।}\nदर्शय(ग्रहण(नामः))।` }, 'मुख्य.deva');
  ok('an imported constant carries its declared type', kinds(ds).includes('type-arg'));
}

// ---------- namespace imports (आयात * रूपेण) ----------
{
  const ds = check({ ...LIB,
    'नाम.deva': `आयात * रूपेण ग आ "गणित2"।\nदर्शय(ग.द्विगुण("बुरा"))।` }, 'नाम.deva');
  ok('namespace member call is checked', kinds(ds).includes('type-arg'));
}
{
  const ds = check({ ...LIB,
    'नाम.deva': `आयात * रूपेण ग आ "गणित2"।\nदर्शय(ग.द्विगुण(५))।` }, 'नाम.deva');
  ok('a correct namespace member call is clean', ds.length === 0);
}

// ---------- gradual: an unannotated export imposes nothing ----------
{
  const ds = check({
    'सा.deva': `निर्यात कार्य समष्टि (सूची) { फलम् सूची.दीर्घता। }`,   // param untyped → किमपि
    'मुख्य.deva': `आयात { समष्टि } आ "सा"।\nदर्शय(समष्टि("कोऽपि"))।` }, 'मुख्य.deva');
  ok('an unannotated imported parameter stays gradual (no false positive)', ds.length === 0);
}

// ---------- the diagnostic is attributed to the importing file + position ----
{
  const ds = check({ ...LIB,
    'मुख्य.deva': `आयात { द्विगुण } आ "गणित2"।\nदर्शय(द्विगुण("x"))।` }, 'मुख्य.deva');
  const d = ds.find(x => x.kind === 'type-arg');
  ok('diagnostic carries the importing file and a real position',
     d && /मुख्य\.deva$/.test(d.file) && d.line === 2 && d.col > 0);
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
