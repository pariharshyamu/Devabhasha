// build-playground.js — inline the ESM modules into a single self-contained
// HTML file so the playground runs from file:// with no server/build step.
//
// Each module is wrapped in its own IIFE to preserve module scoping
// (several modules legitimately declare the same private const such as
// VIRAMA). A shared __NS object carries exported symbols between modules;
// at the top of each IIFE we re-bind previously-exported names as locals
// so a module can reference earlier modules' exports by bare name.

import { readFileSync, writeFileSync } from 'fs';

function exportsOf(src) {
  const names = [];
  const re = /export\s+(?:const|function|class)\s+([A-Za-z0-9_$]+)/g;
  let m;
  while ((m = re.exec(src))) names.push(m[1]);
  return names;
}
function stripModuleSyntax(src) {
  return src.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');
}

const FILES = [
  'src/keywords.js', 'src/errors.js', 'src/vibhakti.js', 'src/karaka-web.js',
  'src/stdlib.js', 'src/style.js',
  'src/lexer.js', 'src/parser.js', 'src/codegen.js',
];

let known = [];
let bundle = 'const __NS = {};\n';
for (const f of FILES) {
  const src = readFileSync(f, 'utf8');
  const exp = exportsOf(src);
  const body = stripModuleSyntax(src);
  const inject = known.length ? 'const { ' + known.join(', ') + ' } = __NS;\n' : '';
  const publish = exp.map(n => `__NS.${n} = ${n};`).join('\n');
  bundle += `\n;(() => {\n${inject}${body}\n${publish}\n})();\n`;
  known = known.concat(exp);
}
bundle += `
function compile(source, options = {}) {
  const tokens = __NS.tokenize(source);
  const ast = __NS.parse(tokens);
  return __NS.generate(ast, options);
}
window.__devabhasha = {
  compile, tokenize: __NS.tokenize, parse: __NS.parse, generate: __NS.generate,
  formatError: __NS.formatError, DevabhashaError: __NS.DevabhashaError
};
`;
const template = readFileSync('playground/template.html', 'utf8');
writeFileSync('playground/index.html', template.replace('/*__BUNDLE__*/', bundle));
console.log('✓ playground/index.html');
