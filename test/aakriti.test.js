// aakriti.test.js — आकृति, runtime schema validation (the typed boundary).
//
// The प्रकार type layer is erased, so untrusted input (a request body, parsed
// JSON, an env var) crosses the boundary as किमपि. आकृति mirrors a type shape
// as a runtime value and validates against it → परिणाम: साधितम्(value) or
// विफलम्(path-qualified message). Written entirely in Devabhāṣā; resolved by the
// canonical std/ root, so consumers here live alone in a temp dir.
import { bundle } from '../src/bundler.js';
import { typeDiagnostics } from '../src/types.js';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function run(src) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-ak-'));
  const entry = join(dir, 'main.deva');
  writeFileSync(entry, src, 'utf8');
  try {
    const code = bundle(entry, { includeRuntime: false });
    const logs = [];
    new Function('console', code)({ log: (...a) => logs.push(a.map(x =>
      typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')) });
    return logs;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// a schema reused across cases: { नाम: अक्षर, वयः: सङ्ख्या, सक्रियः?: तथ्य, अङ्काः: गण<सङ्ख्या> }
const HEAD = `आयात { वस्तु, अक्षर, सङ्ख्या, तथ्य, गण, विकल्पीय, परीक्ष्य, किमपि } आ "std/आकृति"।
नियत व्यक्तिः = वस्तु(कोष{ नाम: अक्षर, वयः: सङ्ख्या, सक्रियः: विकल्पीय(तथ्य), अङ्काः: गण(सङ्ख्या) })।\n`;

// ---------- the module type-checks clean on its own ----------
ok('आकृति.deva type-checks clean',
   typeDiagnostics(readFileSync(join(here, '..', 'examples', 'stdlib', 'आकृति.deva'), 'utf8')).length === 0);

// ---------- a valid value passes and is returned ----------
{
  const out = run(HEAD + `नियत र = परीक्ष्य(व्यक्तिः, कोष{ नाम: "सीता", वयः: ३०, अङ्काः: [१,२,३] })।
    दर्शय(र.सफल)। दर्शय(र.मूल्यम्.नाम)।`);
  ok('a conforming value is साधितम्', out[0] === 'true');
  ok('साधितम् carries the (validated) value', out[1] === 'सीता');
}

// ---------- a wrong field type is flagged, path-qualified ----------
{
  const out = run(HEAD + `दर्शय(परीक्ष्य(व्यक्तिः, कोष{ नाम: "स", वयः: "तीस", अङ्काः: [] }).दोषः)।`);
  ok('a wrong field type fails with the field path',
     out[0] === 'वयः: अपेक्षितम् सङ्ख्या, प्राप्तम् वाक्');
}

// ---------- a missing required field is flagged ----------
{
  const out = run(HEAD + `दर्शय(परीक्ष्य(व्यक्तिः, कोष{ वयः: ३०, अङ्काः: [] }).दोषः)।`);
  ok('a missing required field reads as रिक्त', out[0] === 'नाम: अपेक्षितम् अक्षर, प्राप्तम् रिक्त');
}

// ---------- a bad array element is flagged with its index ----------
{
  const out = run(HEAD + `दर्शय(परीक्ष्य(व्यक्तिः, कोष{ नाम: "क", वयः: १, अङ्काः: [१,"दो",३] }).दोषः)।`);
  ok('a bad array element names its index', out[0] === 'अङ्काः[1]: अपेक्षितम् सङ्ख्या, प्राप्तम् वाक्');
}

// ---------- optional: absent passes, present is still checked ----------
{
  const out = run(HEAD + `दर्शय(परीक्ष्य(व्यक्तिः, कोष{ नाम: "क", वयः: १, अङ्काः: [] }).सफल)।
    दर्शय(परीक्ष्य(व्यक्तिः, कोष{ नाम: "क", वयः: १, सक्रियः: "हाँ", अङ्काः: [] }).दोषः)।`);
  ok('an absent विकल्पीय field passes', out[0] === 'true');
  ok('a present विकल्पीय field is type-checked', out[1] === 'सक्रियः: अपेक्षितम् तथ्य, प्राप्तम् वाक्');
}

// ---------- a non-object at the root is flagged ----------
{
  const out = run(HEAD + `दर्शय(परीक्ष्य(व्यक्तिः, ४२).दोषः)।`);
  ok('a non-object root fails as मूलम्', out[0] === 'मूलम्: अपेक्षितम् वस्तु, प्राप्तम् अङ्क');
}

// ---------- किमपि accepts anything (the gradual escape) ----------
{
  const out = run(HEAD + `नियत लघु = वस्तु(कोष{ अन्यत्: किमपि })।
    दर्शय(परीक्ष्य(लघु, कोष{ अन्यत्: [कोष{}] }).सफल)।`);
  ok('a किमपि field accepts any value', out[0] === 'true');
}

// ---------- pairs with उद्धृ at a boundary: unwrap-or-propagate ----------
{
  const out = run(`आयात { वस्तु, अक्षर, परीक्ष्य } आ "std/आकृति"।
    नियत श = वस्तु(कोष{ नाम: अक्षर })।
    कार्य ग्रहण (कच्चम्) {
      नियत देहः = उद्धृ परीक्ष्य(श, कच्चम्)।   # typed value, or return the विफलम्
      फलम् साधितम्("नमस्ते " + देहः.नाम)।
    }
    दर्शय(ग्रहण(कोष{ नाम: "राम" }).मूल्यम्)।
    दर्शय(ग्रहण(कोष{ वयः: ५ }).सफल)।`);
  ok('उद्धृ परीक्ष्य unwraps a valid body', out[0] === 'नमस्ते राम');
  ok('उद्धृ परीक्ष्य propagates the validation विफलम्', out[1] === 'false');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
