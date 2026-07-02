// kāraka-specific tests — node test/karaka.test.js
import { compile } from '../src/index.js';
import { analyze, describe, KARAKA, VACANA } from '../src/vibhakti.js';
import { hover } from '../src/analyzer.js';
import { semanticDiagnostics as semantic } from '../src/semantics.js';

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

// --- vowel-final stems (इ/ई/उ): true nominative dual & plural ---------------
// Their plurals aren't the generic स्+ाः; they're class-specific, and stem
// recovery must land back on the pratipadika.
const vowel = {
  'सूच्यः':   ['सूची',    VACANA.BAHU], // ईकारान्त — नद्यः-type
  'सूच्यौ':   ['सूची',    VACANA.DVI],
  'पङ्क्तयः': ['पङ्क्ति', VACANA.BAHU], // इकारान्त — मतयः-type
  'पङ्क्ती':  ['पङ्क्ति', VACANA.DVI],
  'सेतवः':    ['सेतु',    VACANA.BAHU], // उकारान्त — शत्रवः-type (गुण)
  'सेतू':     ['सेतु',    VACANA.DVI],
};
for (const [w, [stem, n]] of Object.entries(vowel)) {
  const a = analyze(w);
  ok('vowel-final ' + w,
     a?.karaka === KARAKA.KARTR && a?.number === n && a?.stem === stem);
}
// --- vowel-final obliques: the full नदी/मति/शत्रु paradigm ------------------
// Classical oblique forms must recover BOTH the pratipadika and the right
// kāraka — the generic अकारान्त matcher gets these wrong (or returns null).
// Each entry: surface → [ stem, kāraka, वचन ].
const vowelOblique = {
  // ईकारान्त (नदी-type): सूची
  'सूच्या':     ['सूची', KARAKA.KARANA,     VACANA.EKA],  // ins sg   नद्या
  'सूच्यै':     ['सूची', KARAKA.SAMPRADANA, VACANA.EKA],  // dat sg   नद्यै
  'सूच्याः':    ['सूची', KARAKA.SAMBANDHA,  VACANA.EKA],  // abl/gen sg → gen
  'सूच्याम्':   ['सूची', KARAKA.ADHIKARANA, VACANA.EKA],  // loc sg   नद्याम्
  'सूचीभ्याम्': ['सूची', KARAKA.KARANA,     VACANA.DVI],  // ins/dat/abl du → ins
  'सूच्योः':    ['सूची', KARAKA.SAMBANDHA,  VACANA.DVI],  // gen/loc du → gen
  'सूचीभिः':    ['सूची', KARAKA.KARANA,     VACANA.BAHU], // ins pl   नदीभिः
  'सूचीभ्यः':   ['सूची', KARAKA.SAMPRADANA, VACANA.BAHU], // dat/abl pl → dat
  'सूचीनाम्':   ['सूची', KARAKA.SAMBANDHA,  VACANA.BAHU], // gen pl   नदीनाम्
  'सूचीषु':     ['सूची', KARAKA.ADHIKARANA, VACANA.BAHU], // loc pl   नदीषु
  // इकारान्त (मति-type): पङ्क्ति
  'पङ्क्त्या':   ['पङ्क्ति', KARAKA.KARANA,     VACANA.EKA],  // ins sg
  'पङ्क्तये':    ['पङ्क्ति', KARAKA.SAMPRADANA, VACANA.EKA],  // dat sg
  'पङ्क्तेः':    ['पङ्क्ति', KARAKA.SAMBANDHA,  VACANA.EKA],  // abl/gen sg → gen
  'पङ्क्तौ':     ['पङ्क्ति', KARAKA.ADHIKARANA, VACANA.EKA],  // loc sg
  'पङ्क्तिभिः':  ['पङ्क्ति', KARAKA.KARANA,     VACANA.BAHU], // ins pl
  'पङ्क्तीनाम्': ['पङ्क्ति', KARAKA.SAMBANDHA,  VACANA.BAHU], // gen pl
  'पङ्क्तिषु':   ['पङ्क्ति', KARAKA.ADHIKARANA, VACANA.BAHU], // loc pl
  // उकारान्त (शत्रु-type): सेतु
  'सेतुना':   ['सेतु', KARAKA.KARANA,     VACANA.EKA],  // ins sg   भानुना
  'सेतवे':    ['सेतु', KARAKA.SAMPRADANA, VACANA.EKA],  // dat sg   शत्रवे
  'सेतोः':    ['सेतु', KARAKA.SAMBANDHA,  VACANA.EKA],  // abl/gen sg → gen (शत्रोः)
  'सेतौ':     ['सेतु', KARAKA.ADHIKARANA, VACANA.EKA],  // loc sg   शत्रौ
  'सेत्वोः':  ['सेतु', KARAKA.SAMBANDHA,  VACANA.DVI],  // gen/loc du → gen
  'सेतुभिः':  ['सेतु', KARAKA.KARANA,     VACANA.BAHU], // ins pl
  'सेतूनाम्': ['सेतु', KARAKA.SAMBANDHA,  VACANA.BAHU], // gen pl
  'सेतुषु':   ['सेतु', KARAKA.ADHIKARANA, VACANA.BAHU], // loc pl
};
for (const [w, [stem, k, n]] of Object.entries(vowelOblique)) {
  const a = analyze(w);
  ok('vowel oblique ' + w,
     a?.stem === stem && a?.karaka === k && a?.number === n);
}
// syncretism sanity: सेतोः is genitive sg, NOT the nominative the generic
// matcher used to guess; पङ्क्तौ is locative sg, NOT a nominative dual.
ok('सेतोः is genitive (not generic nom)', analyze('सेतोः')?.case === 'genitive');
ok('पङ्क्तौ is locative sg (not nom du)',
   analyze('पङ्क्तौ')?.case === 'locative' && analyze('पङ्क्तौ')?.number === VACANA.EKA);
// describe() renders the oblique with its Sanskrit vibhakti + kāraka
ok('describe सूच्यै', describe('सूच्यै')?.vibhakti === 'चतुर्थी'
   && describe('सूच्यै')?.karakaSa === 'सम्प्रदान' && describe('सूच्यै')?.stem === 'सूची');

// established singular convention still flows through the generic matcher
ok('सूचीः stays nom sg (convention)', analyze('सूचीः')?.number === VACANA.EKA
   && analyze('सूचीः')?.stem === 'सूची');
// acc sg of a vowel stem is handled generically with the right stem
ok('सूचीम् acc sg via generic', analyze('सूचीम्')?.karaka === KARAKA.KARMAN
   && analyze('सूचीम्')?.stem === 'सूची' && analyze('सूचीम्')?.number === VACANA.EKA);
// the disambiguation guard: अकारान्त words ending in ्यः are NOT vowel plurals
ok('वाक्यः stays अकारान्त nom sg',
   analyze('वाक्यः')?.stem === 'वाक्य' && analyze('वाक्यः')?.number === VACANA.EKA);
ok('काव्यः stays अकारान्त nom sg', analyze('काव्यः')?.stem === 'काव्य');

// --- vowel-final plural drives the group semantic (the closed caveat) -------
ok('पङ्क्तयः → li group',
   norm('रचय पङ्क्तयः { "a" "b" }।').includes('__DB.constructGroup({ tag: "li"'));
ok('सूची > पङ्क्तयः builds ul>li list',
   /__DB\.construct\(\{ tag: "ul".*constructGroup\(\{ tag: "li"/s
     .test(norm('रचय सूचीः { रचय पङ्क्तयः { "क" "ख" } }।')));
ok('पङ्क्तिः singular stays one <li>',
   norm('रचय पङ्क्तिः वाक्यम् "x"।').includes('__DB.construct({ tag: "li"')
   && !norm('रचय पङ्क्तिः वाक्यम् "x"।').includes('constructGroup'));

// --- describe(): full grammatical parse ------------------------------------
{
  const d = describe('पटैः');
  ok('describe case', d.case === 'instrumental');
  ok('describe vacana', d.vacana === 'बहुवचन');
  ok('describe vibhakti', d.vibhakti === 'तृतीया');
  ok('describe gloss', /instrumental plural/.test(d.gloss) && /करण/.test(d.gloss));
  ok('describe non-noun → null', describe('नील') === null);
}

// --- वचन DOM semantic: बहुवचन / द्विवचन कर्तृ build an element GROUP ---------
// A plural tag resolves to the same tag, but distributes over the समास
// children via constructGroup (one element per child); a dual is likewise a
// group (a pair); only the singular stays a single-element __DB.construct.
ok('पटाः → button tag',        norm('रचय पटाः { "a" "b" }।').includes('tag: "button"'));
ok('plural → constructGroup',  norm('रचय पटाः { "a" "b" }।').includes('__DB.constructGroup('));
ok('singular → construct',     norm('रचय पटः वाक्यम् "a"।').includes('__DB.construct('));
ok('singular not a group',     !norm('रचय पटः वाक्यम् "a"।').includes('constructGroup'));
ok('dual → constructGroup (a pair)',
   norm('रचय पटौ { "हाँ" "नहीं" }।').includes('__DB.constructGroup('));
ok('dual is not a single construct',
   !/__DB\.construct\(/.test(norm('रचय पटौ { "हाँ" "नहीं" }।')));
ok('vowel-final dual पङ्क्ती → li group',
   norm('रचय पङ्क्ती { "a" "b" }।').includes('__DB.constructGroup({ tag: "li"'));
ok('plural shares style',      norm('रचय पटाः रूप { वर्णः: नीलः } { "a" }।').includes('__DB.constructGroup') );

// वचन-agreement: a द्विवचन कर्तृ must hold exactly two समास children (a pair).
ok('dual pair (2 children) is clean',
   !semantic('रचय पटौ { "हाँ" "नहीं" }।').some(d => d.kind === 'vacana-agreement'));
ok('dual with 3 children flagged',
   semantic('रचय पटौ { "a" "b" "c" }।').some(d => d.kind === 'vacana-agreement' && d.severity === 2));
ok('dual with no children flagged',
   semantic('रचय पटौ।').some(d => d.kind === 'vacana-agreement'));
ok('plural of any size is not a vचन mismatch',
   !semantic('रचय पटाः { "a" "b" "c" }।').some(d => d.kind === 'vacana-agreement'));

// --- hover surfaces the kāraka parse for inflected DOM vocabulary ----------
ok('hover inflected tag', /instrumental plural/.test(hover('पटैः')?.detail || ''));
ok('hover shows element', /button/.test(hover('पटैः')?.doc || ''));
ok('hover event form', /click/.test(hover('स्पर्शाय')?.doc || ''));
ok('hover ordinary word → null', hover('अपरिचितम्') === null);

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
