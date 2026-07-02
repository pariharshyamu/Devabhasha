// semantics.test.js — the semantic-analysis pass: undefined names, unreachable
// code, and arity mismatches. Warnings (severity 2), never blocking.
import { semanticDiagnostics } from '../src/semantics.js';
import { diagnostics } from '../src/analyzer.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const kinds = s => semanticDiagnostics(s).map(d => d.kind);
const has = (s, kind) => kinds(s).includes(kind);

// ---------- undefined variables ----------
ok('undefined name flagged', has('दर्शय(अज्ञातम्)।', 'undefined'));
ok('declared name clean', semanticDiagnostics('चर क = ५। दर्शय(क)।').length === 0);
ok('function param in scope', semanticDiagnostics('कार्य फ(अ){ फलम् अ।}').length === 0);
ok('loop var in scope', semanticDiagnostics('प्रत्येकम्(x : [१,२]){ दर्शय(x)।}').length === 0);
ok('nested block scope', semanticDiagnostics('कार्य फ(न){ यदि(न>०){ चर म = न। दर्शय(म)।}}').length === 0);
ok('out-of-scope use flagged',
   has('कार्य फ(){ चर भीतरः = १।} दर्शय(भीतरः)।', 'undefined'));

// forward references resolve via hoisting (no false positive)
ok('forward function ref (hoisting)',
   semanticDiagnostics('कार्य अ(){ फलम् ब()।} कार्य ब(){ फलम् १।}').length === 0);
ok('mutual recursion clean',
   semanticDiagnostics('कार्य सम(न){ यदि(न==०){फलम् सत्यम्।} फलम् विषम(न-१)।}' +
                       'कार्य विषम(न){ यदि(न==०){फलम् असत्यम्।} फलम् सम(न-१)।}').length === 0);

// known globals & style words are never flagged
ok('Sanskrit global not flagged', semanticDiagnostics('दर्शय(संकेताक्षर(६५))।').length === 0);
ok('style/color word not flagged',
   semanticDiagnostics('रूपनाम श = रूप { वर्णः: सत्यम् ? रक्तः : नीलः }।').length === 0);
ok('imported name not flagged',
   semanticDiagnostics('आयात { योगः } आ "गणित"। दर्शय(योगः([१,२]))।').length === 0);

// ---------- unreachable code ----------
ok('unreachable after फलम्', has('कार्य फ(){ फलम् १। दर्शय(२)।}', 'unreachable'));
ok('unreachable after भङ्ग',
   has('यावत्(सत्यम्){ भङ्ग। दर्शय("x")।}', 'unreachable'));
ok('code before फलम् is fine',
   !has('कार्य फ(){ दर्शय(१)। फलम् २।}', 'unreachable'));
ok('return in branch not unreachable',
   !has('कार्य फ(न){ यदि(न){ फलम् १।} दर्शय(२)।}', 'unreachable'));

// ---------- arity ----------
ok('too few args', has('कार्य द्वि(अ,ब){फलम् अ।} दर्शय(द्वि(१))।', 'arity'));
ok('too many args', has('कार्य एक(अ){फलम् अ।} दर्शय(एक(१,२))।', 'arity'));
ok('correct arity clean', !has('कार्य द्वि(अ,ब){फलम् अ।} दर्शय(द्वि(१,२))।', 'arity'));
ok('नियत function arity checked',
   has('नियत च = कार्य(अ){फलम् अ।}। दर्शय(च())।', 'arity'));
ok('चर function arity NOT checked (reassignable)',
   !has('चर च = कार्य(अ){फलम् अ।}। दर्शय(च())।', 'arity'));
ok('global call arity not guessed', !has('दर्शय(संकेताक्षर(६५))।', 'arity'));

// ---------- integration: diagnostics() folds warnings in ----------
ok('diagnostics(): clean program → []', diagnostics('चर क = ५। दर्शय(क)।').length === 0);
ok('diagnostics(): warning surfaced', diagnostics('दर्शय(अज्ञातम्)।').some(d => d.severity === 2));
ok('diagnostics(): parse error still error (severity 1)',
   diagnostics('चर = ५।').every(d => d.severity === 1));
ok('diagnostics(): parse error suppresses semantic pass',
   diagnostics('चर = ५।').length === 1);

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
