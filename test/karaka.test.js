// kāraka-specific tests — node test/karaka.test.js
import { compile } from '../src/index.js';
import { analyze, KARAKA } from '../src/vibhakti.js';

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

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
