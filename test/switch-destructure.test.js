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

// ---------- विकल्प pattern matching (object / array shapes) ----------
// A value-only विकल्प stays a JS switch; introducing any pattern switches the
// whole विकल्प to a shape-testing if/else-if chain that binds names.
ok('value-only विकल्प stays a JS switch',
   js('विकल्प(x){ स्थिति १: दर्शय(१)। अन्यथा: दर्शय(०)।}').includes('switch ('));
ok('pattern विकल्प compiles to if-chain (no JS switch)',
   !js('विकल्प(x){ स्थिति कोष{प्रकार:"a"}: दर्शय(१)।}').includes('switch ('));
ok('object pattern emits a shape test',
   js('विकल्प(x){ स्थिति कोष{प्रकार:"a"}: दर्शय(१)।}').includes('typeof') );
ok('object pattern reads by raw Sanskrit key',
   js('विकल्प(x){ स्थिति कोष{प्रकार:"a"}: दर्शय(१)।}').includes('["प्रकार"] === "a"'));

const dispatch = arg => `कार्य वर्गी(न){ विकल्प(न){
    स्थिति कोष{ प्रकार:"यदि", देहः }: फलम् देहः।
    स्थिति कोष{ प्रकार:"पाश" }: फलम् "P"।
    स्थिति [अ,ब]: फलम् अ+ब।
    अन्यथा: फलम् "?"।
}} दर्शय(वर्गी(${arg}))।`;
ok('object pattern constraint + binding',
   run(dispatch('कोष{ प्रकार:"यदि", देहः:"D" }'))[0] === 'D');
ok('object pattern constraint only',
   run(dispatch('कोष{ प्रकार:"पाश" }'))[0] === 'P');
ok('array pattern binds positionally',
   run(dispatch('[४,५]'))[0] === '9');
ok('object with wrong tag → default',
   run(dispatch('कोष{ प्रकार:"अन्य" }'))[0] === '?');
ok('non-object discriminant → default (guarded typeof)',
   run(dispatch('"तार"'))[0] === '?');
ok('array of wrong length → not matched',
   run('कार्य f(न){ विकल्प(न){ स्थिति [अ,ब]: फलम् "pair"। अन्यथा: फलम् "no"।}} दर्शय(f([१,२,३]))।')[0] === 'no');
ok('array element literal constraint',
   run('कार्य f(न){ विकल्प(न){ स्थिति [०, ख]: फलम् ख। अन्यथा: फलम् "no"।}} दर्शय(f([०, ९]))।')[0] === '9');
ok('discriminant evaluated once (side-effect-free temp)',
   js('विकल्प(गण()){ स्थिति कोष{क:१}: दर्शय(१)।}').match(/__match\d+ = ga/) != null);
ok('nested pattern विकल्प uses distinct temps',
   (() => { const j = js('विकल्प(a){ स्थिति कोष{क:१}: विकल्प(b){ स्थिति कोष{ख:२}: दर्शय(१)।}।}');
            return j.includes('__match0') && j.includes('__match1'); })());
ok('pattern binding is usable in the branch body (no undefined warning)',
   run('कार्य f(न){ विकल्प(न){ स्थिति कोष{ मूल्यम् }: फलम् मूल्यम् * २। अन्यथा: फलम् ०।}} दर्शय(f(कोष{ मूल्यम्:२१ }))।')[0] === '42');

// aliased binding: key: <identifier> binds the field under a new local name
ok('object aliased binding',
   run('कार्य f(न){ विकल्प(न){ स्थिति कोष{ मूलम्: शीर्षकम् }: फलम् शीर्षकम्। अन्यथा: फलम् "?"।}} दर्शय(f(कोष{ मूलम्:"नमः" }))।')[0] === 'नमः');
ok('aliased binding is not a constraint (an identifier binds, not compares)',
   !js('विकल्प(x){ स्थिति कोष{ क: य }: दर्शय(१)।}').includes('=== y'));

// nested patterns: a field value may itself be a pattern
const nested = arg => `कार्य f(न){ विकल्प(न){
    स्थिति कोष{ प्रकार:"बिन्दु", स्थानम्: कोष{ x: ० } }: फलम् "मूल"।
    अन्यथा: फलम् "?"।
}} दर्शय(f(${arg}))।`;
ok('nested object pattern matches when inner matches',
   run(nested('कोष{ प्रकार:"बिन्दु", स्थानम्: कोष{ x: ० } }'))[0] === 'मूल');
ok('nested object pattern fails when inner constraint fails',
   run(nested('कोष{ प्रकार:"बिन्दु", स्थानम्: कोष{ x: ९ } }'))[0] === '?');
ok('nested pattern emits a nested typeof test',
   (js('विकल्प(x){ स्थिति कोष{ अ: कोष{ ब: १ } }: दर्शय(१)।}').match(/typeof/g) || []).length === 2);

// array rest: ...name binds the tail; length test relaxes to >=
ok('array rest binds the tail',
   run('कार्य f(न){ विकल्प(न){ स्थिति [प्रथम, ...शेष]: फलम् पाठ"{प्रथम}/{शेष.दीर्घता}"। अन्यथा: फलम् "?"।}} दर्शय(f([१,२,३,४]))।')[0] === '1/3');
ok('array rest relaxes the length test to >=',
   js('विकल्प(x){ स्थिति [अ, ...र]: दर्शय(१)।}').includes('.length >= 1'));
ok('array rest emits a slice for the tail',
   js('विकल्प(x){ स्थिति [अ, ...र]: दर्शय(१)।}').includes('.slice(1)'));
ok('exact array pattern still uses === length',
   js('विकल्प(x){ स्थिति [अ, ब]: दर्शय(१)।}').includes('.length === 2'));
ok('rest with no fixed elements matches any array',
   run('कार्य f(न){ विकल्प(न){ स्थिति [...सर्व]: फलम् सर्व.दीर्घता। अन्यथा: फलम् -१।}} दर्शय(f([१,२]))।')[0] === '2');

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
