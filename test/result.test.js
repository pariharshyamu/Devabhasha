// result.test.js — परिणाम (Result): explicit success/failure error model.
//
// साधितम्(v) → Ok(value), विफलम्(e) → Err(error). A परिणाम has fields
// सफल (ok?), मूल्यम् (value), दोषः (error). No exceptions, no new control flow.
import { compile, PRELUDE } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// run a program (with prelude) and capture console output
function run(src) {
  const logs = [];
  const code = PRELUDE + '\n' + compile(src, { includeRuntime: false });
  const console = { log: (...a) => logs.push(a.join(' ')) };
  new Function('console', code)(console);
  return logs;
}
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- compilation ----------
ok('साधितम् → __RT.ok', js('चर र = साधितम्(५)।').includes('__RT.ok(5)'));
ok('विफलम् → __RT.err', js('चर र = विफलम्("e")।').includes('__RT.err("e")'));

// ---------- Ok values ----------
{
  const out = run('चर र = साधितम्(४२)। दर्शय(र.सफल, र.मूल्यम्)।');
  ok('Ok: सफल is true', out[0].startsWith('true'));
  ok('Ok: मूल्यम् holds the value', out[0] === 'true 42');
}

// ---------- Err values ----------
{
  const out = run('चर र = विफलम्("भग्नम्")। दर्शय(र.सफल, र.दोषः)।');
  ok('Err: सफल is false', out[0].startsWith('false'));
  ok('Err: दोषः holds the error', out[0] === 'false भग्नम्');
}

// ---------- a fallible function pattern ----------
{
  const src = `
    कार्य भाग (अ, ब) {
      यदि (ब == ०) { फलम् विफलम्("शून्येन भागः")। }
      फलम् साधितम्(अ / ब)।
    }
    चर र = भाग(१०, २)।
    यदि (र.सफल) { दर्शय("ok", र.मूल्यम्)। } अन्यथा { दर्शय("err", र.दोषः)। }
    चर र२ = भाग(१, ०)।
    यदि (र२.सफल) { दर्शय("ok", र२.मूल्यम्)। } अन्यथा { दर्शय("err", र२.दोषः)। }
  `;
  const out = run(src);
  ok('fallible fn: success path', out[0] === 'ok 5');
  ok('fallible fn: failure path', out[1] === 'err शून्येन भागः');
}

// ---------- Ok can carry any value (object, array) ----------
{
  const out = run('चर र = साधितम्(कोष{ नाम: "राम" })। दर्शय(र.मूल्यम्.नाम)।');
  ok('Ok carries an object', out[0] === 'राम');
}
{
  const out = run('चर र = साधितम्([१,२,३])। दर्शय(र.मूल्यम्.दीर्घता)।');
  ok('Ok carries an array', out[0] === '3');
}

// ---------- chaining: a function consuming a Result ----------
{
  const src = `
    कार्य द्विगुण (र) {
      यदि (र.सफल == असत्यम्) { फलम् र। }       # propagate the error unchanged
      फलम् साधितम्(र.मूल्यम् * २)।
    }
    चर a = द्विगुण(साधितम्(२१))।
    चर b = द्विगुण(विफलम्("बाधा"))।
    दर्शय(a.मूल्यम्, b.सफल, b.दोषः)।
  `;
  const out = run(src);
  ok('Result chaining: maps Ok, passes Err', out[0] === '42 false बाधा');
}

// ---------- prelude is host-independent (no document needed) ----------
ok('prelude defines __RT without document', /__RT\s*=/.test(PRELUDE) && !/document/.test(PRELUDE));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
