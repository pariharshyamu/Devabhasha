// math.test.js — the गणित math module: native bridge + Devabhāṣā statistics.
import { compile } from '../src/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const run = src => { const l = []; new Function('console', compile(src, { includeRuntime: false }))({ log: (...a) => l.push(a.join(' ')) }); return l; };
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const approx = (a, b) => Math.abs(Number(a) - b) < 1e-9;

// --- native bridge ---
ok('वर्गमूलम्(9) = 3', run('दर्शय(गणित.वर्गमूलम्(९))।')[0] === '3');
ok('घातः(2,10) = 1024', run('दर्शय(गणित.घातः(२,१०))।')[0] === '1024');
ok('निरपेक्षम्(-5) = 5', run('दर्शय(गणित.निरपेक्षम्(-५))।')[0] === '5');
ok('अधःपातः(3.7) = 3', run('दर्शय(गणित.अधःपातः(३.७))।')[0] === '3');
ok('ऊर्ध्वपातः(3.2) = 4', run('दर्शय(गणित.ऊर्ध्वपातः(३.२))।')[0] === '4');
ok('अधिकतमः(3,7,2) = 7', run('दर्शय(गणित.अधिकतमः(३,७,२))।')[0] === '7');
ok('न्यूनतमः(3,7,2) = 2', run('दर्शय(गणित.न्यूनतमः(३,७,२))।')[0] === '2');
ok('पाई ≈ π', approx(run('दर्शय(गणित.पाई)।')[0], Math.PI));
ok('ज्या(0) = 0 (sine)', run('दर्शय(गणित.ज्या(०))।')[0] === '0');
ok('कोटिज्या(0) = 1 (cosine)', run('दर्शय(गणित.कोटिज्या(०))।')[0] === '1');
ok('ज्या(π/6) ≈ 0.5', approx(run('दर्शय(गणित.ज्या(गणित.पाई / ६))।')[0], 0.5));
ok('लघुगणकः(यूलरांकः) = 1', approx(run('दर्शय(गणित.लघुगणकः(गणित.यूलरांकः))।')[0], 1));
ok('धनर्णचिह्नम्(-3) = -1', run('दर्शय(गणित.धनर्णचिह्नम्(-३))।')[0] === '-1');

// --- Devabhāṣā statistics module (load ganita.deva functions) ---
const mod = readFileSync(join(root, 'examples/ganita.deva'), 'utf8').split('# ---------- demonstration')[0];
const callMod = (expr) => run(mod + `\nदर्शय(${expr})।`).pop();

ok('योगफलम् sum', callMod('योगफलम्([४,८,१५,१६,२३,४२])') === '108');
ok('माध्यम् mean', callMod('माध्यम्([४,८,१५,१६,२३,४२])') === '18');
ok('मध्यमा median (even)', callMod('मध्यमा([४,८,१५,१६,२३,४२])') === '15.5');
ok('मध्यमा median (odd)', callMod('मध्यमा([३,१,२])') === '2');
ok('न्यूनतमम् min', callMod('न्यूनतमम्([४,८,१५,१६,२३,४२])') === '4');
ok('अधिकतमम् max', callMod('अधिकतमम्([४,८,१५,१६,२३,४२])') === '42');
ok('मानविचलनम् stddev', approx(callMod('मानविचलनम्([४,८,१५,१६,२३,४२])'), 12.315302134607444));
ok('गुणनफलम् product', callMod('गुणनफलम्([२,३,४])') === '24');
ok('परिसरः range', callMod('परिसरः([४,८,१५,१६,२३,४२])') === '38');

// --- number theory ---
ok('gcd(48,36) = 12', callMod('महत्तमसमापवर्तकः(४८,३६)') === '12');
ok('lcm(4,6) = 12', callMod('लघुत्तमसमापवर्त्यः(४,६)') === '12');
ok('5! = 120', callMod('क्रमगुणितम्(५)') === '120');
ok('0! = 1', callMod('क्रमगुणितम्(०)') === '1');
ok('17 is prime', callMod('अभाज्यः(१७)') === 'true');
ok('18 is not prime', callMod('अभाज्यः(१८)') === 'false');
ok('2 is prime', callMod('अभाज्यः(२)') === 'true');
ok('शक्तिः(3,4) = 81', callMod('शक्तिः(३,४)') === '81');

// --- new: hyperbolic & extra bridge ---
ok('हिज्या(0) = 0 (sinh)', run('दर्शय(गणित.हिज्या(०))।')[0] === '0');
ok('कोटिहिज्या(0) = 1 (cosh)', run('दर्शय(गणित.कोटिहिज्या(०))।')[0] === '1');
ok('घातमूलम्(3,4) = 5 (hypot)', run('दर्शय(गणित.घातमूलम्(३,४))।')[0] === '5');

// --- new: angles, clamp, lerp, rounding ---
ok('90° → π/2 rad', approx(callMod('अंशेभ्यःरेडियनम्(९०)'), Math.PI / 2));
ok('180° → π rad', approx(callMod('अंशेभ्यःरेडियनम्(१८०)'), Math.PI));
ok('rad→deg roundtrip', approx(callMod('रेडियनेभ्यःअंशाः(गणित.पाई)'), 180));
ok('सीमन clamps high', callMod('सीमन(१५, ०, १०)') === '10');
ok('सीमन clamps low', callMod('सीमन(-५, ०, १०)') === '0');
ok('सीमन passes through', callMod('सीमन(५, ०, १०)') === '5');
ok('रैखिकान्तर्वेशनम् lerp', callMod('रैखिकान्तर्वेशनम्(०, १००, ०.२५)') === '25');
ok('परिवृत्तिः round 2dp', callMod('परिवृत्तिः(३.१४१५९, २)') === '3.14');

// --- new: mode, percentile ---
ok('बहुलकः mode', callMod('बहुलकः([१,२,२,३,२])') === '2');
ok('शतमक 75th percentile', callMod('शतमक([४,८,१५,१६,२३,४२], ७५)') === '21.25');
ok('शतमक 0th = min', callMod('शतमक([४,८,१५,१६,२३,४२], ०)') === '4');
ok('शतमक 100th = max', callMod('शतमक([४,८,१५,१६,२३,४२], १००)') === '42');

// --- new: pure-Devabhāṣā transcendentals (Taylor series) ---
ok('घातीयश्रेणी(1) ≈ e', approx(callMod('घातीयश्रेणी(१)'), Math.E));
ok('घातीयश्रेणी(0) = 1', callMod('घातीयश्रेणी(०)') === '1');
ok('घातीयश्रेणी(2) ≈ e²', approx(callMod('घातीयश्रेणी(२)'), Math.E * Math.E));
ok('ज्याश्रेणी(π/6) ≈ 0.5', approx(callMod('ज्याश्रेणी(गणित.पाई / ६)'), 0.5));
ok('ज्याश्रेणी ≈ native ज्या',
   approx(callMod('ज्याश्रेणी(१)'), Math.sin(1)));

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
