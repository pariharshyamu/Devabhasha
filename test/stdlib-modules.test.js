// stdlib-modules.test.js — the standard library written IN Devabhāṣā.
//
// Each helper module (सूची / कोष / पाठ) is a .deva file using निर्यात. These
// tests bundle a small consumer program that imports the module and runs it,
// asserting the observable output — i.e. the stdlib is exercised end-to-end
// through the real module system, not mocked.
import { bundle } from '../src/bundler.js';
import { mkdtempSync, writeFileSync, rmSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const stdlibDir = join(here, '..', 'examples', 'stdlib');

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// write a consumer program next to copies of the stdlib modules, bundle+run it,
// and capture console output lines.
function runConsumer(program) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-std-'));
  for (const m of ['सूची', 'कोष', 'पाठ']) {
    copyFileSync(join(stdlibDir, m + '.deva'), join(dir, m + '.deva'));
  }
  const entry = join(dir, 'main.deva');
  writeFileSync(entry, program, 'utf8');
  const code = bundle(entry, { includeRuntime: false });
  const logs = [];
  const consoleObj = { log: (...a) => logs.push(a.map(x =>
    Array.isArray(x) ? JSON.stringify(x) : String(x)).join(' ')) };
  new Function('console', code)(consoleObj);
  rmSync(dir, { recursive: true, force: true });
  return logs;
}

// ---------- सूची (list) ----------
{
  const out = runConsumer(`
    आयात { योगः, गुणनफलम्, न्यूनतमम्, महत्तमम्, अद्वितीयम्, परिसरः, न्यूनीकरणम्, सन्ति, सर्वे } आ "सूची"।
    दर्शय(योगः([१,२,३,४]))।
    दर्शय(गुणनफलम्([१,२,३,४]))।
    दर्शय(न्यूनतमम्([५,२,८]))।
    दर्शय(महत्तमम्([५,२,८]))।
    दर्शय(अद्वितीयम्([१,२,२,३,१]).दीर्घता)।
    दर्शय(परिसरः(०,५).दीर्घता)।
    दर्शय(न्यूनीकरणम्([१,२,३], कार्य(अ,ब){ फलम् अ+ब। }, १००))।
    दर्शय(सन्ति([१,२,३], कार्य(x){ फलम् x > २। }))।
    दर्शय(सर्वे([१,२,३], कार्य(x){ फलम् x > ०। }))।
  `);
  ok('सूची: योगः (sum)', out[0] === '10');
  ok('सूची: गुणनफलम् (product)', out[1] === '24');
  ok('सूची: न्यूनतमम् (min)', out[2] === '2');
  ok('सूची: महत्तमम् (max)', out[3] === '8');
  ok('सूची: अद्वितीयम् (unique → 3)', out[4] === '3');
  ok('सूची: परिसरः (range 0..5 → 5)', out[5] === '5');
  ok('सूची: न्यूनीकरणम् (fold 100+1+2+3)', out[6] === '106');
  ok('सूची: सन्ति (any > 2)', out[7] === 'true');
  ok('सूची: सर्वे (all > 0)', out[8] === 'true');
}

// ---------- कोष (object) ----------
{
  const out = runConsumer(`
    आयात { कुञ्जयः, मूल्यानि, अस्ति, सङ्ख्या, विलयः, गालयकुञ्जीभिः } आ "कोष"।
    चर o = कोष{ अ: १, ब: २, स: ३ }।
    दर्शय(कुञ्जयः(o).दीर्घता)।
    दर्शय(मूल्यानि(o).दीर्घता)।
    दर्शय(अस्ति(o, "ब"))।
    दर्शय(अस्ति(o, "द"))।
    दर्शय(सङ्ख्या(o))।
    चर m = विलयः(कोष{ अ: १ }, कोष{ अ: ९, ब: २ })।
    दर्शय(m.अ)।
    दर्शय(m.ब)।
    चर p = गालयकुञ्जीभिः(o, ["अ","स"])।
    दर्शय(कुञ्जयः(p).दीर्घता)।
  `);
  ok('कोष: कुञ्जयः (3 keys)', out[0] === '3');
  ok('कोष: मूल्यानि (3 values)', out[1] === '3');
  ok('कोष: अस्ति present', out[2] === 'true');
  ok('कोष: अस्ति absent', out[3] === 'false');
  ok('कोष: सङ्ख्या (count)', out[4] === '3');
  ok('कोष: विलयः right wins', out[5] === '9');
  ok('कोष: विलयः keeps both', out[6] === '2');
  ok('कोष: गालयकुञ्जीभिः (pick 2)', out[7] === '2');
}

// ---------- पाठ (string) ----------
{
  const out = runConsumer(`
    आयात { आवर्तय, वामपूरणम्, प्रथमाक्षरोच्च, पदानि, व्युत्क्रमः, परिवर्तय_सर्वम्, रिक्तः } आ "पाठ"।
    दर्शय(आवर्तय("ab", ३))।
    दर्शय(वामपूरणम्("7", ३, "0"))।
    दर्शय(प्रथमाक्षरोच्च("hi"))।
    दर्शय(पदानि("  a  b ").दीर्घता)।
    दर्शय(व्युत्क्रमः("abc"))।
    दर्शय(परिवर्तय_सर्वम्("x.y.z", ".", "-"))।
    दर्शय(रिक्तः("   "))।
    दर्शय(रिक्तः("x"))।
  `);
  ok('पाठ: आवर्तय (repeat)', out[0] === 'ababab');
  ok('पाठ: वामपूरणम् (pad)', out[1] === '007');
  ok('पाठ: प्रथमाक्षरोच्च (capitalize)', out[2] === 'Hi');
  ok('पाठ: पदानि (words → 2)', out[3] === '2');
  ok('पाठ: व्युत्क्रमः (reverse)', out[4] === 'cba');
  ok('पाठ: परिवर्तय_सर्वम् (replace all)', out[5] === 'x-y-z');
  ok('पाठ: रिक्तः whitespace', out[6] === 'true');
  ok('पाठ: रिक्तः non-empty', out[7] === 'false');
}

// ---------- सूची: the extended surface (sort / count / zip / chunk) ----------
{
  const out = runConsumer(`
    आयात { क्रमय, क्रमयाङ्कैः, गणय, युग्मय, खण्डशः } आ "सूची"।
    दर्शय(क्रमयाङ्कैः([३,१,४,१,५,९,२]))।
    दर्शय(क्रमय(["bb","a","ccc"], कार्य(अ,ब){ फलम् अ.दीर्घता - ब.दीर्घता। }))।
    # क्रमय is stable: equal keys keep input order (a before b)
    दर्शय(क्रमय([[१,"a"],[१,"b"],[०,"c"]], कार्य(अ,ब){ फलम् अ[०] - ब[०]। }))।
    दर्शय(गणय([१,२,३,४,५], कार्य(x){ फलम् x > २। }))।
    दर्शय(युग्मय([१,२,३],["अ","ब"]))।
    दर्शय(खण्डशः([१,२,३,४,५],२))।
  `);
  ok('सूची: क्रमयाङ्कैः (numeric sort)', out[0] === '[1,1,2,3,4,5,9]');
  ok('सूची: क्रमय by comparator (by length)', out[1] === '["a","bb","ccc"]');
  ok('सूची: क्रमय is stable on equal keys', out[2] === '[[0,"c"],[1,"a"],[1,"b"]]');
  ok('सूची: गणय (count > 2)', out[3] === '3');
  ok('सूची: युग्मय (zip to shorter length)', out[4] === '[[1,"अ"],[2,"ब"]]');
  ok('सूची: खण्डशः (chunk by 2)', out[5] === '[[1,2],[3,4],[5]]');
}

// ---------- पाठ: the extended surface (padRight / lines / count) ----------
{
  const out = runConsumer(`
    आयात { दक्षिणपूरणम्, पङ्क्तयः, आवृत्तिः } आ "पाठ"।
    दर्शय(दक्षिणपूरणम्("7", ३, "0"))।
    दर्शय(पङ्क्तयः("अ\nआ\nइ").दीर्घता)।
    दर्शय(आवृत्तिः("a.b.c.d", "."))।
    दर्शय(आवृत्तिः("नास्ति", "x"))।
  `);
  ok('पाठ: दक्षिणपूरणम् (pad right)', out[0] === '700');
  ok('पाठ: पङ्क्तयः (3 lines)', out[1] === '3');
  ok('पाठ: आवृत्तिः (3 dots)', out[2] === '3');
  ok('पाठ: आवृत्तिः (0 when absent)', out[3] === '0');
}

// ---------- कोष: the extended surface (omit / invert) ----------
{
  const out = runConsumer(`
    आयात { त्यजकुञ्जीभिः, विपर्यासय, कुञ्जयः } आ "कोष"।
    चर o = कोष{ अ: १, ब: २, स: ३ }।
    चर d = त्यजकुञ्जीभिः(o, ["ब"])।
    दर्शय(कुञ्जयः(d).दीर्घता)।
    दर्शय(कुञ्जयः(d).अस्ति("ब") == असत्यम्)।
    चर v = विपर्यासय(कोष{ x: "a", y: "b" })।
    दर्शय(v.a)।
    दर्शय(v.b)।
  `);
  ok('कोष: त्यजकुञ्जीभिः drops a key (2 remain)', out[0] === '2');
  ok('कोष: त्यजकुञ्जीभिः actually removed ब', out[1] === 'true');
  ok('कोष: विपर्यासय swaps keys/values (a→x)', out[2] === 'x');
  ok('कोष: विपर्यासय swaps keys/values (b→y)', out[3] === 'y');
}

// ---------- modules compose: use सूची + पाठ together ----------
{
  const out = runConsumer(`
    आयात { परिसरः, योगः } आ "सूची"।
    आयात { आवर्तय } आ "पाठ"।
    दर्शय(योगः(परिसरः(१, ५)))।          # 1+2+3+4 = 10
    दर्शय(आवर्तय("=", योगः([१,२])))।     # "==="
  `);
  ok('compose: सूची range+sum', out[0] === '10');
  ok('compose: पाठ repeat by computed count', out[1] === '===');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
