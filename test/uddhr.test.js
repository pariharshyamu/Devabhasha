// uddhr.test.js — उद्धृ, Result-propagation (Rust's `?`, no exceptions).
//
// `उद्धृ E` evaluates a परिणाम E: on सफल it yields E's मूल्यम्; on विफलम् it
// returns that विफलम् from the ENCLOSING कार्य. It desugars (erasably) to a
// guard emitted before the containing statement — no new runtime, no
// exceptions. This lets fallible code read top-to-bottom instead of nesting
// साधितम्/विफलम् checks by hand.
import { compile, PRELUDE } from '../src/index.js';
import { typeDiagnostics } from '../src/types.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function run(src) {
  const logs = [];
  const code = PRELUDE + '\n' + compile(src, { includeRuntime: false });
  new Function('console', code)({ log: (...a) => logs.push(a.join(' ')) });
  return logs;
}

// ---------- success unwraps; failure propagates ----------
{
  const src = `
    कार्य दृढ (र) { नियत मूल = उद्धृ र। फलम् साधितम्(मूल + १)। }
    दर्शय(दृढ(साधितम्(४१)).मूल्यम्)।
    दर्शय(दृढ(विफलम्("भग्नम्")).सफल)।
    दर्शय(दृढ(विफलम्("भग्नम्")).दोषः)।`;
  const out = run(src);
  ok('उद्धृ yields the value on सफल (41 → 42)', out[0] === '42');
  ok('उद्धृ propagates विफलम् (सफल is false)', out[1] === 'false');
  ok('the propagated विफलम् keeps its दोषः', out[2] === 'भग्नम्');
}

// ---------- फलम् उद्धृ … (unwrap-or-propagate at the return) ----------
{
  const out = run(`
    कार्य अनु (र) { फलम् साधितम्((उद्धृ र) * १०)। }
    दर्शय(अनु(साधितम्(५)).मूल्यम्)।
    दर्शय(अनु(विफलम्("ई")).दोषः)।`);
  ok('उद्धृ inside a फलम् expression unwraps (5 → 50)', out[0] === '50');
  ok('उद्धृ inside a फलम् expression propagates', out[1] === 'ई');
}

// ---------- several उद्धृ in one expression, short-circuit in order ----------
{
  const out = run(`
    कार्य योग (अ, ब) { फलम् अ + ब। }
    कार्य द्वि (र, स) { फलम् साधितम्(योग(उद्धृ र, उद्धृ स))। }
    दर्शय(द्वि(साधितम्(१०), साधितम्(२०)).मूल्यम्)।
    दर्शय(द्वि(विफलम्("प्रथम"), विफलम्("द्वितीय")).दोषः)।
    दर्शय(द्वि(साधितम्(१), विफलम्("द्वितीय")).दोषः)।`);
  ok('multiple उद्धृ in one expression all unwrap (10+20)', out[0] === '30');
  ok('the FIRST failing उद्धृ short-circuits', out[1] === 'प्रथम');
  ok('a later उद्धृ propagates when earlier ones succeed', out[2] === 'द्वितीय');
}

// ---------- उद्धृ returns from the NEAREST function, not an outer one ----------
{
  const out = run(`
    कार्य बाह्य (र) {
      नियत आन्तरिक = कार्य () { नियत व = उद्धृ र। फलम् साधितम्(व * २)। }।
      नियत परिणामः = आन्तरिक()।
      यदि (परिणामः.सफल) { फलम् साधितम्("आन्तरिकं सफलम्")। }
      फलम् साधितम्("बाह्यं समाप्तम्")।
    }
    दर्शय(बाह्य(साधितम्(५)).मूल्यम्)।
    दर्शय(बाह्य(विफलम्("क")).मूल्यम्)।`);
  ok('उद्धृ in a nested function unwraps there (5 → आन्तरिकं सफलम्)', out[0] === 'आन्तरिकं सफलम्');
  ok('उद्धृ propagates out of the INNER function only (outer keeps running)',
     out[1] === 'बाह्यं समाप्तम्');
}

// ---------- उद्धृ nested inside a दर्शय / call argument ----------
{
  const out = run(`
    कार्य f (र) { नियत v = उद्धृ र। फलम् साधितम्(v)। }
    कार्य दर्शक (र) { दर्शय("मूल्यम्:", उद्धृ र)। फलम् साधितम्(०)। }
    दर्शक(साधितम्(७))।
    दर्शय(f(साधितम्(९)).मूल्यम्)।`);
  ok('उद्धृ works inside a दर्शय argument (prints the unwrapped value)', out[0] === 'मूल्यम्: 7');
  ok('a उद्धृ-using function still returns normally when it succeeds', out[1] === '9');
}

// ---------- उद्धृ outside any function is a compile error ----------
{
  let threw = false, msg = '';
  try { compile(`नियत x = उद्धृ साधितम्(५)।`, { includeRuntime: false }); }
  catch (e) { threw = true; msg = String(e.message || e); }
  ok('उद्धृ at module top level is rejected', threw && /उद्धृदोषः/.test(msg));
}

// ---------- the type layer: erased, but calls inside उद्धृ are still checked ----
{
  ok('a clean उद्धृ usage has no type diagnostics',
     typeDiagnostics(`कार्य f(र){ नियत x = उद्धृ र। फलम् साधितम्(x)। }`).length === 0);
  const ds = typeDiagnostics(
    `कार्य g(न: सङ्ख्या): सङ्ख्या { फलम् न। } कार्य f(){ नियत x = उद्धृ g("तार")। फलम् x। }`);
  ok('a wrong call INSIDE उद्धृ is still flagged', ds.some(d => d.kind === 'type-arg'));
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
