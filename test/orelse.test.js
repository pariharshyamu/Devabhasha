// orelse.test.js — अथवा: Result value-or-fallback unwrap sugar.
//
// `result अथवा fallback` → the Result's मूल्यम् if सफल, else the (lazy)
// fallback. A non-Result/null also falls back. Pure expression sugar — no
// control flow, fallback evaluated only when needed.
import { compile, PRELUDE } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();
function run(src) {
  const logs = [];
  new Function('console', PRELUDE + '\n' + compile(src, { includeRuntime: false }))
    ({ log: (...a) => logs.push(a.join(' ')) });
  return logs;
}

// ---------- compilation ----------
ok('अथवा → __RT.orElse with lazy thunk',
   js('चर x = र अथवा ०।') === 'let x = __RT.orElse(ra, () => (0));');

// ---------- Ok unwraps to मूल्यम् ----------
ok('Ok → value', run('दर्शय(साधितम्(५) अथवा ०)।')[0] === '5');
ok('Ok ignores fallback', run('दर्शय(साधितम्("क") अथवा "ख")।')[0] === 'क');

// ---------- Err → fallback ----------
ok('Err → fallback', run('दर्शय(विफलम्("e") अथवा ९९)।')[0] === '99');

// ---------- non-Result / null handling ----------
ok('plain value passes through', run('दर्शय(५ अथवा ०)।')[0] === '5');
ok('null falls back', run('दर्शय(शून्यम् अथवा "द")।')[0] === 'द');

// ---------- laziness: fallback not evaluated when Ok ----------
{
  const out = run(`कार्य दुष्ट(){ दर्शय("RAN")। फलम् ०। }
                   दर्शय("v:", साधितम्(७) अथवा दुष्ट())।`);
  ok('fallback is lazy (side effect skipped on Ok)',
     out.length === 1 && out[0] === 'v: 7');
}
{
  const out = run(`कार्य दुष्ट(){ दर्शय("RAN")। फलम् ०। }
                   दर्शय("v:", विफलम्("x") अथवा दुष्ट())।`);
  ok('fallback runs on Err', out[0] === 'RAN' && out[1] === 'v: 0');
}

// ---------- chaining (right-assoc): first Ok wins ----------
ok('chain: first Ok wins',
   run('दर्शय(विफलम्("a") अथवा साधितम्(२) अथवा ९)।')[0] === '2');
ok('chain: all Err → final default',
   run('दर्शय(विफलम्("a") अथवा विफलम्("b") अथवा ९)।')[0] === '9');

// ---------- precedence: binds looser than arithmetic ----------
ok('precedence: arithmetic in fallback',
   run('दर्शय(विफलम्("e") अथवा १ + २)।')[0] === '3');
ok('precedence: value expr before अथवा',
   run('चर र = साधितम्(१०)। दर्शय(र अथवा ०)।')[0] === '10');

// ---------- the real use case: a fallible-function default ----------
{
  const out = run(`
    कार्य भाग(अ,ब){ यदि (ब==०){ फलम् विफलम्("०")। } फलम् साधितम्(अ/ब)। }
    दर्शय(भाग(१०,२) अथवा (०-१))।
    दर्शय(भाग(५,०) अथवा (०-१))।
  `);
  ok('use case: success unwraps', out[0] === '5');
  ok('use case: failure defaults', out[1] === '-1');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
