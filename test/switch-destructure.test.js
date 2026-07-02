// switch-destructure.test.js — विकल्प (switch/match) and destructuring binds.
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false });
const run = src => {
  const logs = [];
  new Function('console', js(src))({ log: (...a) => logs.push(a.join(' ')) });
  return logs;
};

// ---------- विकल्प (switch) ----------
const sw = v => `चर न=${v}। विकल्प(न){ स्थिति १: दर्शय("one")। स्थिति २,३: दर्शय("few")। अन्यथा: दर्शय("many")।}`;
ok('switch → JS switch', js('विकल्प(x){ स्थिति १: दर्शय(१)।}').includes('switch ('));
ok('case matches (1)', run(sw(1))[0] === 'one');
ok('shared case (3 in 2,3)', run(sw(3))[0] === 'few');
ok('default branch', run(sw(9))[0] === 'many');
ok('no C fall-through',
   run('चर न=१। विकल्प(न){ स्थिति १: दर्शय("A")। स्थिति २: दर्शय("B")।}').join(',') === 'A');
ok('comma tests → stacked case labels',
   (js('विकल्प(x){ स्थिति १,२: दर्शय(०)।}').match(/case /g) || []).length === 2);
ok('each branch is block-scoped',
   js('विकल्प(x){ स्थिति १: चर क=१। दर्शय(क)। स्थिति २: चर क=२। दर्शय(क)।}')
     .includes('case 1: {'));
ok('string discriminant',
   run('चर स="ख"। विकल्प(स){ स्थिति "क": दर्शय(१)। स्थिति "ख": दर्शय(२)।}')[0] === '2');
ok('switch with return in a function',
   run('कार्य वर्ग(न){ विकल्प(न){ स्थिति १: फलम् "एकम्"। अन्यथा: फलम् "अन्यत्"।}} दर्शय(वर्ग(१))।')[0] === 'एकम्');
ok('missing case/default errors', (() => {
  try { js('विकल्प(x){ दर्शय(१)।}'); return false; } catch { return true; }
})());

// ---------- destructuring ----------
ok('array pattern → const [a,b]', js('नियत [अ,ब]=स।').includes('const [a, ba] ='));
ok('array destructure binds positionally',
   run('नियत [अ,ब,ग]=[१०,२०,३०]। दर्शय(अ,ब,ग)।')[0] === '10 20 30');
ok('object shorthand',
   run('नियत क=कोष{अ:१,ब:२}। नियत {अ,ब}=क। दर्शय(अ,ब)।')[0] === '1 2');
ok('object key:alias rename',
   run('नियत क=कोष{नाम:"राम",वयः:३०}। नियत {वयः:आयुः}=क। दर्शय(आयुः)।')[0] === '30');
ok('object pattern uses raw Sanskrit key',
   js('नियत {नाम}=व।').includes('"नाम": naama'));
ok('destructure inside a function',
   run('कार्य दूरम्(प){ नियत {x,y}=प। फलम् x+y।} दर्शय(दूरम्(कोष{x:३,y:४}))।')[0] === '7');
ok('चर (let) array destructure is mutable',
   js('चर [अ]=स।').startsWith('let ['));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
