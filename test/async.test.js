// async.test.js — असमकालिक (async) functions + प्रतीक्षा (await).
import { compile } from '../src/index.js';
import { id } from '../src/codegen.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();
const errOf = src => { try { compile(src, { includeRuntime: false }); return null; } catch (e) { return e; } };

// ---------- compilation ----------
ok('async decl → async function',
   js('असमकालिक कार्य f(){ फलम् १। }').startsWith('async function'));
ok('plain decl is not async',
   !js('कार्य f(){ फलम् १। }').includes('async'));
ok('await → await expr',
   js('असमकालिक कार्य f(){ फलम् प्रतीक्षा g()। }').includes('await g()'));
ok('async function expression',
   js('चर f = असमकालिक कार्य(){ फलम् १। }।').includes('async function ('));
ok('then/catch translate',
   js('p.ततः(f)।').includes('.then(f)') && js('p.दोषे(f)।').includes('.catch(f)'));

// ---------- coloring rules ----------
ok('await rejected at top level',
   errOf('चर x = प्रतीक्षा g()।') && /प्रतीक्षादोषः/.test(errOf('चर x = प्रतीक्षा g()।').message));
ok('await rejected in nested sync function',
   errOf('असमकालिक कार्य f(){ चर g = कार्य(){ फलम् प्रतीक्षा h()। }। }') != null);
ok('await OK in nested async function',
   errOf('असमकालिक कार्य f(){ चर g = असमकालिक कार्य(){ फलम् प्रतीक्षा h()। }। }') === null);
ok('असमकालिक without कार्य errors',
   errOf('असमकालिक चर x = ५।') != null);

// ---------- real promise execution ----------
function runAsync(src, externals = {}) {
  return new Promise(resolve => {
    const logs = [];
    const names = Object.keys(externals);
    const jsNames = names.map(id);          // transliterate to match compiled refs
    const consoleObj = { log: (...a) => logs.push(a.join(' ')) };
    const fn = new Function('console', ...jsNames, compile(src, { includeRuntime: false }));
    fn(consoleObj, ...names.map(n => externals[n]));
    setTimeout(() => resolve(logs), 80);
  });
}

(async () => {
  // await resolves a value
  {
    const logs = await runAsync(
      `असमकालिक कार्य मुख्य(){ चर v = प्रतीक्षा आनय(४२)। दर्शय("got", v)। }
       मुख्य()।`,
      { आनय: v => new Promise(r => setTimeout(() => r(v), 10)) }
    );
    ok('await resolves a promised value', logs[0] === 'got 42');
  }

  // async function returns a promise that .ततः (then) observes
  {
    const logs = await runAsync(
      `असमकालिक कार्य द्विगुण(न){ फलम् न * २। }
       द्विगुण(२१).ततः(कार्य(र){ दर्शय("then", र)। })।`
    );
    ok('async return is awaitable via ततः', logs[0] === 'then 42');
  }

  // sequential awaits run in order
  {
    const logs = await runAsync(
      `असमकालिक कार्य क्रम(){
         चर a = प्रतीक्षा आनय("अ")।
         दर्शय(a)।
         चर b = प्रतीक्षा आनय("ब")।
         दर्शय(b)।
       }
       क्रम()।`,
      { आनय: v => new Promise(r => setTimeout(() => r(v), 10)) }
    );
    ok('sequential awaits preserve order', logs.join(',') === 'अ,ब');
  }

  // await composes with the Result model: a promise of a परिणाम
  {
    const logs = await runAsync(
      `असमकालिक कार्य पठ(सफलं){
         चर र = प्रतीक्षा आनय(सफलं)।
         यदि (र.सफल) { दर्शय("ok", र.मूल्यम्)। } अन्यथा { दर्शय("err", र.दोषः)। }
       }
       पठ(सत्यम्)।`,
      { आनय: okFlag => new Promise(r => setTimeout(() =>
          r(okFlag ? { 'सफल': true, 'मूल्यम्': 7, 'दोषः': null }
                   : { 'सफल': false, 'मूल्यम्': null, 'दोषः': 'x' }), 10)) }
    );
    ok('await composes with परिणाम (Result)', logs[0] === 'ok 7');
  }

  // async DOM event handler compiles correctly
  ok('async event handler in रचय',
     js('रचय पटः स्पर्शाय करणेन असमकालिक कार्य(){ चर d = प्रतीक्षा आनय()। दर्शय(d)। }।')
       .includes('handler: async function'));

  console.log(`\n${pass} पास, ${fail} फेल`);
  process.exit(fail ? 1 : 0);
})();
