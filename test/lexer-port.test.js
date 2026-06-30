// lexer-port.test.js — verifies the Devabhāṣā-written lexer
// (examples/lexer.deva) produces identical tokens to the reference JS
// lexer, including the self-hosting case (lexing its own source).
//
//   node test/lexer-port.test.js

import { compile } from '../src/index.js';
import { tokenize as jsLexer } from '../src/lexer.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// load and compile the Devabhāṣā lexer (logic only, no demo section)
const full = readFileSync(join(root, 'examples/lexer.deva'), 'utf8');
const logic = full.split('# ---------- demo')[0];
const lexerJS = compile(logic, { includeRuntime: false });
const devaLexer = new Function('console', lexerJS + '\nreturn vicchedaya;')({ log: () => {} });

const seqJS = toks => toks.map(t => `${t.type}:${t.value}`).join(' | ');
const seqDV = toks => toks.map(t => `${t.प्रकार}:${t.मूल्यम्}`).join(' | ');

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

const cases = [
  'चर क = ५।',
  'कार्य द्वि(क){ फलम् क*२। }',
  'यदि (अ > ३) { दर्शय("हि")। } अन्यथा { दर्शय("नो")। }',
  'चर स = [१, २, ३]। स.योजय(४)।',
  'चर व = कोष { नाम: "राम" }।',
  '# comment\nदर्शय(१०.५)।',
  'अ == ब && स != द || !e',
  'प्रत्येकम् (x : सूची) { दर्शय(x)। }',
  '"string with \\n escape and देवनागरी"',
];

for (const src of cases) {
  ok('matches JS: ' + JSON.stringify(src.slice(0, 32)),
     seqJS(jsLexer(src)) === seqDV(devaLexer(src)));
}

// self-hosting: lexer tokenizes its own source
const jt = jsLexer(logic), dt = devaLexer(logic);
ok('self-host: same token count (' + dt.length + ')', jt.length === dt.length);
ok('self-host: identical token stream', seqJS(jt) === seqDV(dt));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
