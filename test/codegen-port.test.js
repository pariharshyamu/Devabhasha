// codegen-port.test.js — verifies the Devabhāṣā-written codegen
// (examples/codegen.deva) and the complete self-hosted pipeline.
//
// What is proven here:
//   1. आईडी (transliteration) matches the JS id() exactly.
//   2. The deva codegen emits JS byte-identical to the JS codegen.
//   3. The full deva pipeline (lexer+parser+codegen) compiles programs to
//      output that EXECUTES identically to the JS-hosted compiler.
//   4. The deva pipeline compiles the lexer and parser SOURCES byte-identically
//      (the codegen source has a known escape-fixpoint quirk; see README).
//
//   node test/codegen-port.test.js

import { compile } from '../src/index.js';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { generate } from '../src/codegen.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const mk = (src, ret) =>
  new Function('console', compile(src, { includeRuntime: false }) + `\nreturn ${ret};`)({ log: () => {} });

const lexSrc = read('examples/lexer.deva').split('# ---------- demo')[0];
const parSrc = read('examples/parser.deva').split('# ---------- entry')[0]
  + '\nकार्य विश्लेषय (शब्दाः) { चर अ = कोष { शब्दाः: शब्दाः, स्थानम्: ० }। फलम् कार्यक्रमम्(अ)। }';
const genSrc = read('examples/codegen.deva').split('# ---------- demo')[0];

const devaLex = mk(lexSrc, 'vicchedaya');
const devaParse = mk(parSrc, 'vishlessaya');
const devaGen = mk(genSrc, 'janaya');
const devaId = mk(genSrc, 'aaiiddii');
const devaCompile = s => devaGen(devaParse(devaLex(s))).trim();

// JS-AST → Sanskrit field names (deva codegen consumes Sanskrit-keyed nodes)
const TO_SA = {
  type:'प्रकार', body:'देहः', kind:'उपप्रकारः', name:'नाम', init:'आदिः',
  params:'प्राचलाः', argument:'तर्कः', args:'तर्काः', test:'परीक्षा',
  consequent:'तदा', alternate:'अन्यथा', item:'वस्तु', iterable:'समूहः',
  expression:'अभिव्यक्तिः', target:'लक्ष्यम्', value:'मूल्यम्', op:'चिह्नम्',
  left:'वाम', right:'दक्षिण', callee:'आह्वेयः', property:'गुणः',
  computed:'गणित', elements:'तत्त्वानि', props:'गुणाः', key:'कुञ्जी', object:'आधारः',
};
const toSa = n => Array.isArray(n) ? n.map(toSa)
  : (n && typeof n === 'object'
      ? Object.fromEntries(Object.entries(n).map(([k, v]) => [TO_SA[k] || k, toSa(v)]))
      : n);

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// 1. transliteration
const jsId = name => { const m = compile(`चर ${name} = ०।`, { includeRuntime: false }).match(/let (\S+) =/); return m && m[1]; };
for (const n of ['अभिवादनम्','गणना','दो','शीर्ष','योगः','क्ष','त्र','ज्ञ','श्री','म्लेच्छ'])
  ok('आईडी matches JS id(): ' + n, jsId(n) === devaId(n));

// 2. codegen emits identical JS (feed both the same AST)
const cgCases = [
  'चर क = ५ + ३ * २।','कार्य द्वि(न){ फलम् न * २। }',
  'यदि (अ > ३) { दर्शय("हि")। } अन्यथा { दर्शय("नो")। }',
  'चर o = कोष { नाम: "राम" }।','अ.ब[i] = स.खण्ड(०, २)।',
  'प्रत्येकम् (e : सूची) { दर्शय(e)। }',
];
for (const src of cgCases) {
  const ast = parse(tokenize(src));
  ok('codegen == JS codegen: ' + JSON.stringify(src.slice(0, 28)),
     generate(ast, { includeRuntime: false }).trim() === devaGen(toSa(ast)).trim());
}

// 3. full pipeline output executes identically
const run = js => { const l = []; new Function('console', js)({ log: (...a) => l.push(a.join(' ')) }); return l.join('|'); };
const progs = [
  'चर क = ५ + ३ * २। दर्शय(क)।',
  'कार्य द्वि(न){ फलम् न * २। } दर्शय(द्वि(२१))।',
  'चर स = ०। प्रत्येकम्(x : [१,२,३,४,५]){ स = स + x। } दर्शय(स)।',
  'कार्य त(n){ यदि(n<=१){फलम् १।} फलम् n*त(n-१)।} दर्शय(त(५))।',
  'चर o = कोष{नाम:"राम"}। दर्शय(o.नाम)।',
];
for (const p of progs)
  ok('pipeline runs == JS: ' + JSON.stringify(p.slice(0, 26)),
     run(compile(p, { includeRuntime: false })) === run(devaCompile(p)));

// 4. self-compiles the lexer and parser sources byte-identically
ok('self-compiles LEXER source', compile(lexSrc, { includeRuntime: false }).trim() === devaCompile(lexSrc));
ok('self-compiles PARSER source', compile(parSrc, { includeRuntime: false }).trim() === devaCompile(parSrc));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
