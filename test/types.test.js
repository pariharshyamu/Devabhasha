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

// ---------- integration ----------
ok('diagnostics() surfaces type warnings',
   diagnostics('चर न: सङ्ख्या = "x"।').some(d => d.kind === 'type-init' && d.severity === 2));
ok('clean typed program → no diagnostics',
   diagnostics('कार्य योग(अ: सङ्ख्या, ब: सङ्ख्या): सङ्ख्या { फलम् अ+ब।} दर्शय(योग(१,२))।').length === 0);

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
