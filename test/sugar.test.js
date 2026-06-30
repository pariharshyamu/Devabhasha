// sugar.test.js — operator sugar: += ternary ?? ++ --
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const run = src => { const l = []; new Function('console', compile(src, { includeRuntime: false }))({ log: (...a) => l.push(a.join(' ')) }); return l; };
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// --- compound assignment ---
ok('+= ', run('चर x = ५। x += ३। दर्शय(x)।')[0] === '8');
ok('-= ', run('चर x = १०। x -= ४। दर्शय(x)।')[0] === '6');
ok('*= ', run('चर x = ३। x *= ४। दर्शय(x)।')[0] === '12');
ok('/= ', run('चर x = २०। x /= ५। दर्शय(x)।')[0] === '4');
ok('%= ', run('चर x = १०। x %= ३। दर्शय(x)।')[0] === '1');
ok('+= on member', run('चर o = कोष{n:१०}। o.n += ५। दर्शय(o.n)।')[0] === '15');
ok('+= on array element', run('चर a = [१,२,३]। a[१] += १०। दर्शय(a[१])।')[0] === '12');
ok('+= string concat', run('चर s = "अ"। s += "आ"। दर्शय(s)।')[0] === 'अआ');

// --- ternary ---
ok('ternary true branch', run('दर्शय(५ > ३ ? "हाँ" : "नहीं")।')[0] === 'हाँ');
ok('ternary false branch', run('दर्शय(१ > ३ ? "हाँ" : "नहीं")।')[0] === 'नहीं');
ok('nested ternary (else-if)',
   run('चर n = ५। दर्शय(n < ० ? "ऋण" : n == ० ? "शून्य" : "धन")।')[0] === 'धन');
ok('ternary in assignment',
   run('चर m = ५ > ३ ? १०० : ०। दर्शय(m)।')[0] === '100');
ok('ternary with expressions',
   run('चर a = ३। चर b = ७। दर्शय(a > b ? a : b)।')[0] === '7');

// --- null coalescing ---
ok('?? with null', run('चर a = शून्यम्। दर्शय(a ?? "default")।')[0] === 'default');
ok('?? with value', run('चर a = "x"। दर्शय(a ?? "default")।')[0] === 'x');
ok('?? with zero (zero is not null)', run('दर्शय(० ?? ९९)।')[0] === '0');

// --- increment / decrement ---
ok('postfix ++', run('चर i = ५। i++। दर्शय(i)।')[0] === '6');
ok('postfix --', run('चर i = ५। i--। दर्शय(i)।')[0] === '4');
ok('++ in a loop',
   run('चर s = ०। चर i = ०। यावत्(i < ५){ s += i। i++। } दर्शय(s)।')[0] === '10');

// --- combined: realistic usage ---
ok('sugar combined',
   run('चर कुल = ०। प्रत्येकम्(x : [१,२,३,४]){ कुल += x > २ ? x : ०। } दर्शय(कुल)।')[0] === '7');

// --- valid: sugar does not break normal assignment ---
ok('plain = still works', run('चर x = ५। x = १०। दर्शय(x)।')[0] === '10');
ok('== still works (not +=)', run('दर्शय(५ == ५)।')[0] === 'true');

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
