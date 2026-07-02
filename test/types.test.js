// types.test.js — प्रकार, the gradual erasable type layer.
import { compile } from '../src/index.js';
import { typeDiagnostics } from '../src/types.js';
import { diagnostics } from '../src/analyzer.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const kinds = s => typeDiagnostics(s).map(d => d.kind);
const has = (s, kind) => kinds(s).includes(kind);
const clean = s => typeDiagnostics(s).length === 0;

// ---------- erasability (the core guarantee) ----------
const js = s => compile(s, { includeRuntime: false }).trim();
ok('annotations are erased (function)',
   js('कार्य f(अ: सङ्ख्या, ब: अक्षर): तथ्य { फलम् सत्यम्।}') ===
   js('कार्य f(अ, ब) { फलम् सत्यम्।}'));
ok('annotations are erased (variable)',
   js('चर न: सङ्ख्या = ५।') === js('चर न = ५।'));
ok('annotations are erased (anon fn)',
   js('नियत f = कार्य(अ: गण): रिक्त { दर्शय(अ)।}।') === js('नियत f = कार्य(अ){ दर्शय(अ)।}।'));

// ---------- gradual: unannotated never warns ----------
ok('fully unannotated is clean', clean('कार्य f(अ){ फलम् अ।} दर्शय(f("x"))।'));
ok('किमपि param accepts anything', clean('कार्य f(अ: किमपि): सङ्ख्या { फलम् ५।} दर्शय(f("x"))।'));
ok('unannotated arg into typed param is gradual',
   clean('कार्य f(अ: सङ्ख्या){फलम् अ।} कार्य g(x){ फलम् f(x)।}'));   // x is किमपि

// ---------- argument checks ----------
ok('arg type mismatch', has('कार्य f(अ: सङ्ख्या){फलम् अ।} दर्शय(f("x"))।', 'type-arg'));
ok('arg type ok', !has('कार्य f(अ: सङ्ख्या){फलम् अ।} दर्शय(f(५))।', 'type-arg'));
ok('inferred variable flows into arg check',
   has('चर न: सङ्ख्या = ५। कार्य g(x: अक्षर){फलम् x।} दर्शय(g(न))।', 'type-arg'));
ok('return-type of a call is inferred',
   has('कार्य अंक(): सङ्ख्या { फलम् ५।} कार्य ल(s: अक्षर){फलम् s।} दर्शय(ल(अंक()))।', 'type-arg'));

// ---------- return checks ----------
ok('return type mismatch', has('कार्य f(): अक्षर { फलम् ५।}', 'type-return'));
ok('return type ok', !has('कार्य f(): अक्षर { फलम् "hi"।}', 'type-return'));
ok('रिक्त must not return a value', has('कार्य f(): रिक्त { फलम् ५।}', 'type-return'));
ok('रिक्त with bare return is fine', !has('कार्य f(): रिक्त { फलम्।}', 'type-return'));
ok('non-void must return a value', has('कार्य f(): सङ्ख्या { फलम्।}', 'type-return'));
ok('string concat infers अक्षर',
   !has('कार्य f(): अक्षर { फलम् "a" + "b"।}', 'type-return'));
ok('arithmetic infers सङ्ख्या',
   !has('कार्य f(): सङ्ख्या { फलम् २ * ३।}', 'type-return'));
ok('comparison infers तथ्य',
   !has('कार्य f(): तथ्य { फलम् २ > १।}', 'type-return'));

// ---------- variable checks ----------
ok('var init mismatch', has('चर न: सङ्ख्या = "x"।', 'type-init'));
ok('var init ok', !has('चर न: अक्षर = "x"।', 'type-init'));
ok('object literal is वस्तु', !has('चर o: वस्तु = कोष{क:१}।', 'type-init'));
ok('array literal is गण', !has('चर a: गण = [१,२]।', 'type-init'));

// ---------- unknown type ----------
ok('unknown type name flagged', has('चर न: संख्या = ५।', 'unknown-type'));
ok('known types not flagged', !has('चर न: सङ्ख्या = ५।', 'unknown-type'));

// ---------- composite (element-typed) arrays ----------
ok('composite type is erased',
   js('नियत xs: गण<सङ्ख्या> = [१,२,३]।') === js('नियत xs = [१,२,३]।'));
ok('composite param is erased',
   js('कार्य f(अ: गण<अक्षर>): रिक्त { दर्शय(अ)।}') === js('कार्य f(अ){ दर्शय(अ)।}'));
ok('num-array literal into गण<सङ्ख्या> is clean',
   clean('नियत xs: गण<सङ्ख्या> = [१,२,३]।'));
ok('string-array assigned to गण<सङ्ख्या> mismatches',
   has('नियत ys: गण<अक्षर> = ["a","b"]। नियत xs: गण<सङ्ख्या> = ys।', 'type-init'));
ok('bare गण is compatible with गण<सङ्ख्या> (gradual element)',
   clean('चर g: गण = [१,२]। नियत xs: गण<सङ्ख्या> = g।'));
ok('mixed array literal stays गण<किमपि> (no false positive)',
   clean('नियत xs: गण<सङ्ख्या> = [१,"x"]।'));
ok('unknown composite element flagged',
   has('नियत xs: गण<बकवास> = []।', 'unknown-type'));
ok('non-parametric type with a parameter flagged',
   has('चर न: सङ्ख्या<अक्षर> = ५।', 'type-arity'));
ok('गण takes a parameter without arity warning',
   !has('नियत xs: गण<सङ्ख्या> = [१]।', 'type-arity'));

// ---------- element type flows into प्रत्येकम् loops ----------
ok('loop item of गण<सङ्ख्या> is सङ्ख्या (clean into सङ्ख्या param)',
   clean('कार्य g(n: सङ्ख्या){फलम् n।} नियत xs: गण<सङ्ख्या> = [१,२]। प्रत्येकम् (x : xs) { दर्शय(g(x))।}'));
ok('loop item of गण<सङ्ख्या> mismatches an अक्षर param',
   has('कार्य g(s: अक्षर){फलम् s।} नियत xs: गण<सङ्ख्या> = [१,२]। प्रत्येकम् (x : xs) { दर्शय(g(x))।}', 'type-arg'));
ok('loop over bare गण is gradual (no warning)',
   clean('कार्य g(s: अक्षर){फलम् s।} चर xs: गण = [१,२]। प्रत्येकम् (x : xs) { दर्शय(g(x))।}'));

// ---------- element type flows into array destructuring ----------
ok('destructured name from गण<सङ्ख्या> is सङ्ख्या (clean)',
   clean('कार्य g(n: सङ्ख्या){फलम् n।} नियत xs: गण<सङ्ख्या> = [१,२]। नियत [a,b] = xs। दर्शय(g(a))।'));
ok('destructured name from गण<सङ्ख्या> mismatches an अक्षर param',
   has('कार्य g(s: अक्षर){फलम् s।} नियत xs: गण<सङ्ख्या> = [१,२]। नियत [a,b] = xs। दर्शय(g(a))।', 'type-arg'));

// ---------- object shapes (structural record types) ----------
ok('shape annotation is erased',
   js('नियत व: { नाम: अक्षर, वयः: सङ्ख्या } = कोष{नाम:"र",वयः:३}।') ===
   js('नियत व = कोष{नाम:"र",वयः:३}।'));
ok('object literal infers a shape (matching init is clean)',
   clean('नियत व: { नाम: अक्षर } = कोष { नाम: "र" }।'));
ok('width subtyping: an extra field is allowed',
   clean('नियत व: { नाम: अक्षर } = कोष { नाम: "र", वयः: ३० }।'));
ok('a missing required field is flagged',
   has('नियत व: { नाम: अक्षर, वयः: सङ्ख्या } = कोष { नाम: "र" }।', 'type-init'));
ok('a wrong field type is flagged',
   has('नियत व: { नाम: अक्षर } = कोष { नाम: ५ }।', 'type-init'));
ok('field access flows the field type into an arg check',
   has('कार्य g(s: अक्षर){फलम् s।} नियत व: { नाम: सङ्ख्या } = कोष{नाम:१}। दर्शय(g(व.नाम))।', 'type-arg'));
ok('field access of the right type is clean',
   clean('कार्य g(n: सङ्ख्या){फलम् n।} नियत व: { वयः: सङ्ख्या } = कोष{वयः:१}। दर्शय(g(व.वयः))।'));
ok('nested shape mismatch is flagged',
   has('नियत व: { प: { x: सङ्ख्या } } = कोष { प: कोष { x: "a" } }।', 'type-init'));
ok('nested shape match is clean',
   clean('नियत व: { प: { x: सङ्ख्या } } = कोष { प: कोष { x: १ } }।'));
ok('array of shapes गण<{…}> is clean',
   clean('नियत xs: गण<{ id: सङ्ख्या }> = [कोष{id:१}, कोष{id:२}]।'));
ok('unknown type inside a shape field is flagged',
   has('नियत व: { नाम: बकवास } = कोष{नाम:"x"}।', 'unknown-type'));
ok('bare वस्तु is unconstrained (any object fits)',
   clean('नियत व: वस्तु = कोष{नाम:"र"}। नियत w: { नाम: अक्षर } = व।'));

// ---------- function types (कार्य(params): ret) ----------
ok('function-type annotation is erased',
   js('कार्य each(f: कार्य(सङ्ख्या): रिक्त){ f(५)। }') === js('कार्य each(f){ f(५)। }'));
ok('calling a कार्य-typed param checks its args',
   has('कार्य each(f: कार्य(सङ्ख्या): रिक्त){ f("x")। }', 'type-arg'));
ok('calling a कार्य-typed param with the right arg is clean',
   clean('कार्य each(f: कार्य(सङ्ख्या): रिक्त){ f(५)। }'));
ok('passing an incompatible function is flagged',
   has('कार्य लागू(f: कार्य(सङ्ख्या): सङ्ख्या){ फलम् f(१)।} नियत g = कार्य(s: अक्षर): सङ्ख्या { फलम् ५।}। दर्शय(लागू(g))।', 'type-arg'));
ok('passing a matching function is clean',
   clean('कार्य लागू(f: कार्य(सङ्ख्या): सङ्ख्या){ फलम् f(१)।} नियत g = कार्य(n: सङ्ख्या): सङ्ख्या { फलम् n।}। दर्शय(लागू(g))।'));
ok('the return type of a कार्य-typed call flows into a check',
   has('कार्य ह(f: कार्य(): अक्षर){ कार्य n(x: सङ्ख्या){फलम् x।} दर्शय(n(f()))। }', 'type-arg'));
ok('unknown type inside a function type is flagged',
   has('नियत f: कार्य(बकवास): रिक्त = कार्य(x){}।', 'unknown-type'));
ok('function type composes inside a shape',
   clean('नियत h: { पठ: कार्य(सङ्ख्या): रिक्त } = कोष { पठ: कार्य(n){ दर्शय(n)।} }।'));

// ---------- type narrowing from विकल्प patterns ----------
const narrow = (body, argFn = 's: अक्षर') =>
  `कार्य g(${argFn}){फलम् ०।} कार्य f(नोड: { मान: सङ्ख्या }){ विकल्प(नोड){ ${body} अन्यथा: फलम् ०।}}`;
ok('pattern binding inherits the discriminant field type (misuse flagged)',
   has(narrow('स्थिति कोष{ मान }: फलम् g(मान)।'), 'type-arg'));
ok('pattern binding inherits the field type (correct use clean)',
   clean(narrow('स्थिति कोष{ मान }: फलम् g(मान)।', 'n: सङ्ख्या')));
ok('narrowed discriminant: member access is checked in the branch',
   has(narrow('स्थिति कोष{ प्रकार: "क" }: फलम् g(नोड.मान)।'), 'type-arg'));
ok('array pattern element inherits गण<सङ्ख्या> element type',
   has('कार्य g(s: अक्षर){फलम् ०।} कार्य f(xs: गण<सङ्ख्या>){ विकल्प(xs){ स्थिति [अ, ब]: फलम् g(अ)। अन्यथा: फलम् ०।}}', 'type-arg'));
ok('array rest inherits the array type (clean)',
   clean('कार्य g(n: सङ्ख्या){फलम् n।} कार्य f(xs: गण<सङ्ख्या>){ विकल्प(xs){ स्थिति [अ, ...श]: फलम् g(श.दीर्घता)। अन्यथा: फलम् ०।}}'));
ok('nested pattern binding inherits the nested field type',
   has('कार्य g(s: अक्षर){फलम् ०।} कार्य f(नोड: { प: { x: सङ्ख्या } }){ विकल्प(नोड){ स्थिति कोष{ प: कोष{ x } }: फलम् g(x)। अन्यथा: फलम् ०।}}', 'type-arg'));
ok('untyped discriminant keeps bindings gradual (no false positive)',
   clean('कार्य g(s: अक्षर){फलम् ०।} कार्य f(नोड){ विकल्प(नोद){ स्थिति कोष{ मान }: फलम् g(मान)। अन्यथा: फलम् ०।}}'.replace('नोद','नोड')));
ok('comma-alternative branch does not narrow the discriminant',
   clean('कार्य f(नोड: { मान: सङ्ख्या }){ विकल्प(नोड){ स्थिति कोष{मान}, कोष{प्रकार:"x"}: दर्शय(नोड)। अन्यथा: दर्शय(०)।}}'));

// ---------- integration ----------
ok('diagnostics() surfaces type warnings',
   diagnostics('चर न: सङ्ख्या = "x"।').some(d => d.kind === 'type-init' && d.severity === 2));
ok('clean typed program → no diagnostics',
   diagnostics('कार्य योग(अ: सङ्ख्या, ब: सङ्ख्या): सङ्ख्या { फलम् अ+ब।} दर्शय(योग(१,२))।').length === 0);

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
