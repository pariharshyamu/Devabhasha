// json.test.js — प्रदत्त (JSON parse/serialize), अङ्कय (number parse),
// and the JSON I/O convenience ops. All Result-returning (no exceptions).
import { compile, PRELUDE } from '../src/index.js';
import { __IO } from '../src/io-node.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();
const run = src => {
  const logs = [];
  new Function('console', PRELUDE + '\n' + compile(src, { includeRuntime: false }))
    ({ log: (...a) => logs.push(a.join(' ')) });
  return logs;
};

// ---------- compilation ----------
ok('प्रदत्त.विश्लेषय → __RT.json', js('प्रदत्त.विश्लेषय("x")।').includes('__RT.json'));
ok('अङ्कय → __RT.toNumber', js('अङ्कय("5")।').includes('__RT.toNumber("5")'));

// ---------- JSON parse → Result ----------
ok('parse valid JSON object', run('चर र = प्रदत्त.विश्लेषय("{\\"a\\":1}")। दर्शय(र.सफल, र.मूल्यम्.a)।')[0] === 'true 1');
ok('parse array', run('चर र = प्रदत्त.विश्लेषय("[1,2,3]")। दर्शय(र.मूल्यम्.दीर्घता)।')[0] === '3');
ok('malformed JSON → Err (no throw)', run('चर र = प्रदत्त.विश्लेषय("{bad")। दर्शय(र.सफल)।')[0] === 'false');

// ---------- JSON serialize → Result ----------
ok('stringify compact', run('चर र = प्रदत्त.सूत्रय(कोष{a:१}, असत्यम्)। दर्शय(र.मूल्यम्)।')[0] === '{"a":1}');
ok('stringify round-trips through parse',
   run('चर s = प्रदत्त.सूत्रय([१,२], असत्यम्)। चर p = प्रदत्त.विश्लेषय(s.मूल्यम्)। दर्शय(p.मूल्यम्.दीर्घता)।')[0] === '2');

// ---------- number parse → Result ----------
ok('अङ्कय valid', run('चर र = अङ्कय("42")। दर्शय(र.सफल, र.मूल्यम्)।')[0] === 'true 42');
ok('अङ्कय decimal', run('चर र = अङ्कय("3.5")। दर्शय(र.मूल्यम्)।')[0] === '3.5');
ok('अङ्कय invalid → Err', run('चर र = अङ्कय("नो")। दर्शय(र.सफल)।')[0] === 'false');
ok('अङ्कय composes with अथवा', run('दर्शय(अङ्कय("x") अथवा (०-१))।')[0] === '-1');

// ---------- the regression: object-literal fallback in अथवा ----------
ok('अथवा with object-literal fallback compiles to () => (...)',
   js('चर x = र अथवा कोष{ a: १ }।').includes('() => ({'));
ok('अथवा object-literal fallback runs',
   run('चर x = विफलम्("e") अथवा कोष{ क: ९ }। दर्शय(x.क)।')[0] === '9');
ok('अथवा array-literal fallback runs',
   run('चर x = विफलम्("e") अथवा [१,२]। दर्शय(x.दीर्घता)।')[0] === '2');

// ---------- JSON I/O ops against the real Node backend ----------
{
  const dir = mkdtempSync(join(tmpdir(), 'deva-json-'));
  const p = join(dir, 'data.json');
  (async () => {
    const w = await __IO.file.writeJson(p, { 'नाम': 'क', 'सूची': [1, 2] });
    ok('writeJson succeeds', w['सफल'] === true);
    const r = await __IO.file.readJson(p);
    ok('readJson returns parsed object', r['सफल'] === true && r['मूल्यम्']['नाम'] === 'क');
    ok('readJson preserves nested array', r['मूल्यम्']['सूची'].length === 2);
    const miss = await __IO.file.readJson(join(dir, 'none.json'));
    ok('readJson missing file → Err', miss['सफल'] === false);
    // write invalid JSON text, then readJson → Err (not throw)
    await __IO.file.write(join(dir, 'bad.json'), '{not json');
    const bad = await __IO.file.readJson(join(dir, 'bad.json'));
    ok('readJson malformed → Err', bad['सफल'] === false && /JSON/.test(bad['दोषः']));
    rmSync(dir, { recursive: true, force: true });

    console.log(`\n${pass} पास, ${fail} फेल`);
    process.exit(fail ? 1 : 0);
  })();
}
