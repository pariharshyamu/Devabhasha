// testkit.test.js — validates परीक्षा.deva (the in-language test framework)
// and the reflection primitives (स्वरूपम्/typeOf, सूचीवत्/isArray) it relies on.
import { compile, PRELUDE } from '../src/index.js';
import { bundle } from '../src/bundler.js';
import { mkdtempSync, writeFileSync, rmSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const stdlibDir = join(here, '..', 'examples', 'stdlib');

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const runP = src => {
  const logs = [];
  new Function('console', PRELUDE + '\n' + compile(src, { includeRuntime: false }))
    ({ log: (...a) => logs.push(a.join(' ')) });
  return logs;
};

// ---------- reflection primitives ----------
ok('स्वरूपम् of number → अङ्क', runP('दर्शय(स्वरूपम्(५))।')[0] === 'अङ्क');
ok('स्वरूपम् of string → वाक्', runP('दर्शय(स्वरूपम्("x"))।')[0] === 'वाक्');
ok('स्वरूपम् of array → सूची', runP('दर्शय(स्वरूपम्([१]))।')[0] === 'सूची');
ok('स्वरूपम् of object → कोष', runP('दर्शय(स्वरूपम्(कोष{x:१}))।')[0] === 'कोष');
ok('स्वरूपम् of bool → सत्यासत्य', runP('दर्शय(स्वरूपम्(सत्यम्))।')[0] === 'सत्यासत्य');
ok('स्वरूपम् of null → रिक्त', runP('दर्शय(स्वरूपम्(शून्यम्))।')[0] === 'रिक्त');
ok('सूचीवत् true for array', runP('दर्शय(सूचीवत्([१]))।')[0] === 'true');
ok('सूचीवत् false for non-array', runP('दर्शय(सूचीवत्("x"))।')[0] === 'false');

// ---------- the framework, bundled with a consumer ----------
function runFramework(program) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-test-'));
  for (const m of ['परीक्षा', 'सूची', 'कोष', 'पाठ']) {
    copyFileSync(join(stdlibDir, m + '.deva'), join(dir, m + '.deva'));
  }
  const entry = join(dir, 'main.deva');
  writeFileSync(entry, program, 'utf8');
  const code = bundle(entry, { includeRuntime: false });
  const logs = [];
  new Function('console', code)({ log: (...a) => logs.push(a.join(' ')) });
  rmSync(dir, { recursive: true, force: true });
  return logs;
}

// all-passing suite
{
  const out = runFramework(`
    आयात { परीक्षा, अपेक्ष, सारः } आ "परीक्षा"।
    परीक्षा("a", कार्य(){ अपेक्ष(१+१).समम्(२)। })।
    परीक्षा("b", कार्य(){ अपेक्ष("x").समम्("x")। })।
    सारः()।
  `);
  const tally = out[out.length - 1].trim();
  ok('all-pass suite reports 2 पास 0 फेल', tally === '2 पास, 0 फेल');
  ok('passing tests show ✓', out.filter(l => l.includes('✓')).length === 2);
}

// failing test is detected
{
  const out = runFramework(`
    आयात { परीक्षा, अपेक्ष, सारः } आ "परीक्षा"।
    परीक्षा("good", कार्य(){ अपेक्ष(५).समम्(५)। })।
    परीक्षा("bad", कार्य(){ अपेक्ष(५).समम्(६)। })।
    सारः()।
  `);
  const tally = out[out.length - 1].trim();
  ok('mixed suite reports 1 पास 1 फेल', tally === '1 पास, 1 फेल');
  ok('failing test shows ✗', out.some(l => l.includes('✗ bad')));
  ok('failure message shows expected vs actual', out.some(l => l.includes('6') && l.includes('5')));
}

// deep equality: nested structures
{
  const out = runFramework(`
    आयात { परीक्षा, अपेक्ष, सारः, समम् } आ "परीक्षा"।
    परीक्षा("nested list", कार्य(){ अपेक्ष([[१,२],[३]]).समम्([[१,२],[३]])। })।
    परीक्षा("nested obj", कार्य(){ अपेक्ष(कोष{a:कोष{b:१}}).समम्(कोष{a:कोष{b:१}})। })।
    परीक्षा("list mismatch", कार्य(){ अपेक्ष([१,२]).असमम्([१,३])। })।
    सारः()।
  `);
  ok('deep equality across nested structures', out[out.length - 1].trim() === '3 पास, 0 फेल');
}

// समम् exported as a plain predicate
{
  const out = runFramework(`
    आयात { समम् } आ "परीक्षा"।
    दर्शय(समम्([१,कोष{x:२}], [१,कोष{x:२}]))।
    दर्शय(समम्([१], [२]))।
  `);
  ok('समम् deep-equal true on equal', out[0] === 'true');
  ok('समम् deep-equal false on different', out[1] === 'false');
}

// truthiness assertions
{
  const out = runFramework(`
    आयात { परीक्षा, अपेक्ष, सारः } आ "परीक्षा"।
    परीक्षा("truthy", कार्य(){ अपेक्ष(३ > १).सत्यम्ता()। })।
    परीक्षा("falsy", कार्य(){ अपेक्ष(१ > ३).असत्यम्ता()। })।
    सारः()।
  `);
  ok('truthiness assertions work', out[out.length - 1].trim() === '2 पास, 0 फेल');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
