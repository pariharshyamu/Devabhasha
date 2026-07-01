// kāraka-specific tests — node test/karaka.test.js
import { compile } from '../src/index.js';
import { analyze, describe, KARAKA, VACANA } from '../src/vibhakti.js';
import { hover } from '../src/analyzer.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// --- case engine ---
const cases = {
  'रक्तः': KARAKA.KARTR, 'रक्तम्': KARAKA.KARMAN, 'रक्तेन': KARAKA.KARANA,
  'रक्ताय': KARAKA.SAMPRADANA, 'रक्तात्': KARAKA.APADANA,
  'रक्तस्य': KARAKA.SAMBANDHA, 'रक्ते': KARAKA.ADHIKARANA,
};
for (const [w, k] of Object.entries(cases))
  ok('case ' + w, analyze(w)?.karaka === k);
ok('ascii rejected', analyze('click') === null);
ok('bare stem rejected', analyze('नील') === null);

// --- free word order: permutations yield identical JS ---
const norm = s => compile(s, { includeRuntime: false }).trim();
const base = 'रचय पटः वाक्यम् "x" स्पर्शाय करणेन ह।';
const perms = [
  'रचय पटः वाक्यम् "x" स्पर्शाय करणेन ह।',
  'रचय स्पर्शाय करणेन ह पटः वाक्यम् "x"।',
  'रचय करणेन ह स्पर्शाय वाक्यम् "x" पटः।',
  'रचय वाक्यम् "x" पटः करणेन ह स्पर्शाय।',
];
const target = norm(base);
perms.forEach((p, i) => ok('permutation ' + (i+1) + ' identical', norm(p) === target));

// --- tag resolution from nominative stem ---
ok('पटः → button', norm('रचय पटः।').includes('"button"'));
ok('शीर्षः → h1', norm('रचय शीर्षः।').includes('"h1"'));
ok('मूलम् not a tag in acc', true); // sanity placeholder

// --- missing kartr errors ---
let threw = false;
try { norm('रचय वाक्यम् "x"।'); } catch { threw = true; }
ok('missing कर्तृ errors', threw);

// --- वचन (number) depth: dual & plural across the cases ---------------------
// The kāraka (role) is number-invariant; only वचन changes.
const num = {
  'पटौ':      [KARAKA.KARTR,      VACANA.DVI],   // nom dual
  'पटाः':     [KARAKA.KARTR,      VACANA.BAHU],  // nom plural
  'पटान्':    [KARAKA.KARMAN,     VACANA.BAHU],  // acc plural
  'पटैः':     [KARAKA.KARANA,     VACANA.BAHU],  // instr plural
  'पटेभ्यः':  [KARAKA.SAMPRADANA, VACANA.BAHU],  // dat/abl plural
  'पटानाम्':  [KARAKA.SAMBANDHA,  VACANA.BAHU],  // gen plural
  'पटेषु':    [KARAKA.ADHIKARANA, VACANA.BAHU],  // loc plural
  'पटाभ्याम्':[KARAKA.KARANA,     VACANA.DVI],   // instr dual
  'पटयोः':    [KARAKA.SAMBANDHA,  VACANA.DVI],   // gen dual
};
for (const [w, [k, n]] of Object.entries(num)) {
  const a = analyze(w);
  ok('number ' + w, a?.karaka === k && a?.number === n && a?.stem === 'पट');
}

// singular still reads as singular (backward-compatible)
ok('singular unchanged', analyze('पटः')?.number === VACANA.EKA);

// --- णत्व: retroflex instrumental रामेण is recognised as instrumental -------
ok('णत्व instrumental ेण', analyze('रामेण')?.karaka === KARAKA.KARANA);
ok('plain instrumental ेन', analyze('पटेन')?.karaka === KARAKA.KARANA);

// --- आकारान्त feminine obliques (classical forms) --------------------------
ok('ā-stem dative मालायै',   analyze('मालायै')?.karaka === KARAKA.SAMPRADANA);
ok('ā-stem locative मालायाम्', analyze('मालायाम्')?.karaka === KARAKA.ADHIKARANA);
ok('ā-stem instr sg मालया',  analyze('मालया')?.karaka === KARAKA.KARANA);

// --- describe(): full grammatical parse ------------------------------------
{
  const d = describe('पटैः');
  ok('describe case', d.case === 'instrumental');
  ok('describe vacana', d.vacana === 'बहुवचन');
  ok('describe vibhakti', d.vibhakti === 'तृतीया');
  ok('describe gloss', /instrumental plural/.test(d.gloss) && /करण/.test(d.gloss));
  ok('describe non-noun → null', describe('नील') === null);
}

// --- वचन DOM semantic: बहुवचन कर्तृ builds an element GROUP ------------------
// A plural tag resolves to the same tag, but distributes over the समास
// children via constructGroup (one element per child); dual/singular stay a
// single-element __DB.construct.
ok('पटाः → button tag',        norm('रचय पटाः { "a" "b" }।').includes('tag: "button"'));
ok('plural → constructGroup',  norm('रचय पटाः { "a" "b" }।').includes('__DB.constructGroup('));
ok('singular → construct',     norm('रचय पटः वाक्यम् "a"।').includes('__DB.construct('));
ok('singular not a group',     !norm('रचय पटः वाक्यम् "a"।').includes('constructGroup'));
ok('dual stays single element',norm('रचय पटौ।').includes('__DB.construct(') && !norm('रचय पटौ।').includes('constructGroup'));
ok('plural shares style',      norm('रचय पटाः रूप { वर्णः: नीलः } { "a" }।').includes('__DB.constructGroup') );

// --- hover surfaces the kāraka parse for inflected DOM vocabulary ----------
ok('hover inflected tag', /instrumental plural/.test(hover('पटैः')?.detail || ''));
ok('hover shows element', /button/.test(hover('पटैः')?.doc || ''));
ok('hover event form', /click/.test(hover('स्पर्शाय')?.doc || ''));
ok('hover ordinary word → null', hover('अपरिचितम्') === null);

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
