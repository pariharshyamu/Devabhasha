// parser-port.test.js — verifies the Devabhāṣā-written parser
// (examples/parser.deva) produces ASTs identical to the reference JS
// parser, including the self-hosting cases (parsing the lexer's source
// and its own source).
//
//   node test/parser-port.test.js

import { compile } from '../src/index.js';
import { tokenize as jsLex } from '../src/lexer.js';
import { parse as jsParse } from '../src/parser.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const parserSrc = readFileSync(join(root, 'examples/parser.deva'), 'utf8');
const parserLogic = parserSrc.split('# ---------- entry')[0]
  + '\nकार्य विश्लेषय (शब्दाः) { चर अ = कोष { शब्दाः: शब्दाः, स्थानम्: ० }। फलम् कार्यक्रमम्(अ)। }';
const devaParse = new Function(
  'console',
  compile(parserLogic, { includeRuntime: false }) + '\nreturn vishlessaya;'
)({ log: () => {} });

// Devabhāṣā field names → JS field names (same structure, Sanskrit labels)
const FIELD = {
  प्रकार:'type', देहः:'body', उपप्रकारः:'kind', नाम:'name', आदिः:'init',
  प्राचलाः:'params', तर्कः:'argument', तर्काः:'args', परीक्षा:'test',
  तदा:'consequent', अन्यथा:'alternate', वस्तु:'item', समूहः:'iterable',
  अभिव्यक्तिः:'expression', लक्ष्यम्:'target', मूल्यम्:'value', चिह्नम्:'op',
  वाम:'left', दक्षिण:'right', आह्वेयः:'callee', गुणः:'property',
  गणित:'computed', तत्त्वानि:'elements', गुणाः:'props', कुञ्जी:'key',
  आधारः:'object',
};
const norm = n => Array.isArray(n) ? n.map(norm)
  : (n && typeof n === 'object'
      ? Object.fromEntries(Object.entries(n).map(([k, v]) => [FIELD[k] || k, norm(v)]))
      : n);
const clean = n => JSON.parse(JSON.stringify(n));
// strip source-position metadata (line/col), a falsy `async` flag, and the
// erasable प्रकार type annotations (varType/returnType/paramTypes): the JS
// parser adds these for source maps / async / the gradual type layer, but they
// aren't structural AST the self-hosted parser needs to reproduce.
const META = new Set(['line', 'col', 'namePos', 'paramPos', 'varType', 'returnType', 'paramTypes']);
const stripPos = n => Array.isArray(n) ? n.map(stripPos)
  : (n && typeof n === 'object'
      ? Object.fromEntries(Object.entries(n)
          .filter(([k, v]) => !META.has(k) && !(k === 'async' && !v))
          .map(([k, v]) => [k, stripPos(v)]))
      : n);

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function astMatch(src) {
  const toks = jsLex(src);
  const a = stripPos(clean(jsParse(toks)));
  const b = stripPos(clean(norm(devaParse(toks.map(t =>
    ({ प्रकार: t.type, मूल्यम्: t.value, line: t.line, col: t.col }))))));
  return JSON.stringify(a) === JSON.stringify(b);
}

const cases = [
  'चर क = ५ + ३ * २।',
  'चर x = (अ + ब) * स।',
  'दर्शय(अ == ब && स != द)।',
  'चर f = कार्य(न){ फलम् न * २। }।',
  'अ.ब.स(१, २)।',
  'सूची[i + १] = मूल्यम्।',
  'चर o = कोष { नाम: "राम", आयुः: ३० }।',
  'यदि (!अ || ब) { x = १। } अन्यथा { x = २। }',
  'प्रत्येकम् (e : सूची) { दर्शय(e)। }',
  'यावत् (i < १०) { i = i + १। }',
  '-अ + -ब।',
  'चर a = [१, [२, ३], कोष{क:४}]।',
  'f(g(h(x)))।',
];
for (const src of cases) ok('AST matches: ' + JSON.stringify(src.slice(0, 30)), astMatch(src));

// self-hosting: parse the lexer's source and the parser's own source
const lexerLogic = readFileSync(join(root, 'examples/lexer.deva'), 'utf8').split('# ---------- demo')[0];
ok('self-host: parses the LEXER source', astMatch(lexerLogic));
ok('self-host: parses ITS OWN source', astMatch(parserLogic));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
