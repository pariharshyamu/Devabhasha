// interp.test.js — string interpolation: पाठ"…{expr}…".
//
// Opt-in via the पाठ marker (so plain "..." strings, including those with
// literal braces in the self-hosted compiler, are untouched).
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

function run(src, externals = {}) {
  const logs = [];
  const names = Object.keys(externals);
  const fn = new Function('console', ...names, compile(src, { includeRuntime: false }));
  fn({ log: (...a) => logs.push(a.join(' ')) }, ...names.map(n => externals[n]));
  return logs;
}

// ---------- compilation ----------
ok('पाठ marker → template literal',
   js('दर्शय(पाठ"क {x} ग")।').includes('`क ${'));
ok('plain string stays a string literal',
   js('दर्शय("क {x} ग")।').includes('"क {x} ग"') &&
   !js('दर्शय("क {x} ग")।').includes('`'));
ok('no-expression पाठ string still a template',
   js('दर्शय(पाठ"नमस्ते")।').includes('`नमस्ते`'));

// ---------- runtime values ----------
ok('interpolates a variable',
   run('चर न = "रामः"। दर्शय(पाठ"{न} अत्र")।')[0] === 'रामः अत्र');
ok('interpolates arithmetic',
   run('दर्शय(पाठ"{२ + ३ * ४}")।')[0] === '14');
ok('interpolates member access',
   run('चर व = कोष{ म: ५ }। दर्शय(पाठ"मूल्यम् {व.म}")।')[0] === 'मूल्यम् 5');
ok('interpolates a function call',
   run('कार्य द्वि(न){ फलम् न*२। } दर्शय(पाठ"{द्वि(२१)}")।')[0] === '42');
ok('multiple interpolations',
   run('चर अ=१। चर ब=२। दर्शय(पाठ"{अ}+{ब}={अ+ब}")।')[0] === '1+2=3');
ok('text around and between holes',
   run('चर x=७। दर्शय(पाठ"पूर्वम् {x} पश्चात्")।')[0] === 'पूर्वम् 7 पश्चात्');

// ---------- escaping ----------
ok('escaped braces are literal',
   run('दर्शय(पाठ"\\{क\\}")।')[0] === '{क}');

// ---------- non-interference ----------
ok('plain string keeps literal braces',
   run('दर्शय("कोष{ x: १ }")।')[0] === 'कोष{ x: १ }');
ok('पाठ as an ordinary identifier still works',
   run('चर पाठ = "शब्दः"। दर्शय(पाठ)।')[0] === 'शब्दः');
ok('module path strings unaffected',
   js('आयात { f } आ "गणित"।') === '');   // import emits no inline code

// ---------- composition ----------
ok('interpolation inside a DOM content slot',
   js('चर n=५। रचय शीर्षः वाक्यम् पाठ"गणना {n}"।').includes('content: `गणना ${'));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
