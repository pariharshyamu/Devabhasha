// fixpoint.test.js — the self-hosting bootstrap fixpoint.
//
// Proves the compiler reproduces itself: build the Devabhāṣā compiler by
// bootstrapping with the JS host (stage 1), use it to compile its own three
// sources (stage 2), build a compiler from THAT output and compile again
// (stage 3). A closed bootstrap requires stage2 === stage3 byte-for-byte.
//
//   node test/fixpoint.test.js

import { compile as jsCompile } from '../src/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

const lexSrc = read('examples/lexer.deva').split('# ---------- demo')[0];
const parSrc = read('examples/parser.deva').split('# ---------- entry')[0]
  + '\nकार्य विश्लेषय (शब्दाः) { चर अ = कोष { शब्दाः: शब्दाः, स्थानम्: ० }। फलम् कार्यक्रमम्(अ)। }';
const genSrc = read('examples/codegen.deva').split('# ---------- demo')[0];

const build = (lexJS, parJS, genJS) => {
  const lex = new Function('console', lexJS + '\nreturn vicchedaya;')({ log: () => {} });
  const par = new Function('console', parJS + '\nreturn vishlessaya;')({ log: () => {} });
  const gen = new Function('console', genJS + '\nreturn janaya;')({ log: () => {} });
  return src => gen(par(lex(src))).trim();
};

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// stage 1 → A
const A = build(
  jsCompile(lexSrc, { includeRuntime: false }),
  jsCompile(parSrc, { includeRuntime: false }),
  jsCompile(genSrc, { includeRuntime: false })
);
// stage 2 outputs
const lex2 = A(lexSrc), par2 = A(parSrc), gen2 = A(genSrc);
// stage 3 (compiler built from stage-2 output)
const B = build(lex2, par2, gen2);
const lex3 = B(lexSrc), par3 = B(parSrc), gen3 = B(genSrc);

ok('lexer:  stage2 === stage3', lex2 === lex3);
ok('parser: stage2 === stage3', par2 === par3);
ok('codegen: stage2 === stage3', gen2 === gen3);

// the self-built compiler actually works
const run = js => { const l = []; new Function('console', js)({ log: (...a) => l.push(a.join(' ')) }); return l.join('|'); };
ok('stage-3 compiler runs recursion',
   run(B('कार्य फ(n){ यदि(n<२){फलम् n।} फलम् फ(n-१)+फ(n-२)।} दर्शय(फ(१०))।')) === '55');
ok('stage-3 compiler runs objects+arrays',
   run(B('चर o=कोष{स:[१,२,३]}। दर्शय(o.स.दीर्घता, o.स[२])।')) === '3 3');

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
