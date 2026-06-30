// errors.test.js — structured compiler errors with source-context formatting.
import { compile, DevabhashaError, formatError } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// helper: compile and capture the thrown error
function errorOf(src) {
  try { compile(src, { includeRuntime: false }); return null; }
  catch (e) { return e; }
}

// --- structured error objects ---
let e = errorOf('दर्शय("hi"।');
ok('throws DevabhashaError', e instanceof DevabhashaError);
ok('error has line', e && e.line === 1);
ok('error has col', e && typeof e.col === 'number');
ok('error has kind=parse', e && e.kind === 'parse');

// --- lex error ---
e = errorOf('दर्शय(@)।');
ok('lex error kind', e && e.kind === 'lex');
ok('lex error line/col', e && e.line === 1 && e.col === 7);

// --- multi-line position is accurate ---
e = errorOf('चर a = १।\nचर b = २।\nदर्शय(a @ b)।');
ok('multi-line error on line 3', e && e.line === 3);
ok('multi-line caret column', e && e.col === 9);

// --- formatError renders source context with a caret ---
const src = 'चर a = १।\nदर्शय(a @ b)।';
const formatted = formatError(errorOf(src), src);
ok('format includes the kind label', formatted.includes('अक्षरदोषः'));
ok('format includes "line"/"column"', formatted.includes('line') && formatted.includes('column'));
ok('format shows the source line', formatted.includes('दर्शय(a @ b)'));
ok('format includes a caret', formatted.includes('^'));
ok('format uses Devanagari line number', formatted.includes('२')); // line 2

// --- caret points at the right column ---
const lines = formatted.split('\n');
const caretLine = lines.find(l => l.includes('^'));
const srcLineIdx = lines.findIndex(l => l.includes('दर्शय(a @ b)'));
ok('caret line follows source line', caretLine && lines.indexOf(caretLine) === srcLineIdx + 1);

// --- expect()-style error: missing closing paren ---
e = errorOf('कार्य च(x { फलम् x। }');
ok('missing paren is a parse error', e instanceof DevabhashaError && e.kind === 'parse');
ok('missing paren has a position', e && e.line != null && e.col != null);

// --- error message is human-readable (mentions what was expected) ---
e = errorOf('यदि (अ { दर्शय("x")। }');
ok('expect error names the expectation', e && /expected/.test(e.message));

// --- valid programs do NOT throw ---
ok('valid program: no error', errorOf('चर क = ५। दर्शय(क)।') === null);
ok('valid nested program: no error',
   errorOf('कार्य च(n){ यदि(n<२){फलम् न।} फलम् च(n-१)।} दर्शय(च(५))।') === null);

// --- formatError without a position degrades gracefully ---
const bare = new DevabhashaError('some message', {});
ok('format handles missing position', formatError(bare, 'चर x = १।').includes('some message'));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
