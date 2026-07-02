// koshthagara.test.js — कोष्ठागार, the Devabhāṣā document store.
//
// A collection is a JSON file of records; every method is असमकालिक and returns
// a परिणाम. This exercises the store END-TO-END through the real `devabhasha
// run` path (which injects the Node __IO backend and awaits the async chain),
// against a throwaway temp file — CRUD, id assignment, query, an optional
// आकृति-backed validator on insert, and the not-found / invalid failure values.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '..', 'src', 'cli.js');

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// write `program` to a temp dir and run it through `devabhasha run`; return its
// stdout lines. `${DATA}` in the program is replaced with a temp JSON path.
function runProgram(program) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-store-'));
  const data = join(dir, 'data.json');
  const entry = join(dir, 'prog.deva');
  writeFileSync(entry, program.replaceAll('${DATA}', data), 'utf8');
  try {
    const res = spawnSync(process.execPath, [cli, 'run', entry], { encoding: 'utf8' });
    if (res.status !== 0) { console.log('    ' + (res.stderr || res.stdout).trim()); return { lines: [], data }; }
    return { lines: res.stdout.trim().split('\n'), data };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ---------- full CRUD lifecycle ----------
{
  const { lines } = runProgram(`
    आयात { कोष्ठागार } आ "std/कोष्ठागार"।
    असमकालिक कार्य मुख्यम् () {
        नियत खं = कोष्ठागार("\${DATA}")।
        नियत अ = उद्धृ प्रतीक्षा खं.योजय(कोष{ नाम: "गीता", वर्षम्: ४०० })।
        नियत ब = उद्धृ प्रतीक्षा खं.योजय(कोष{ नाम: "मेघः", वर्षम्: ५०० })।
        दर्शय("ids:", अ.अङ्कः, ब.अङ्कः)।
        दर्शय("count:", (उद्धृ प्रतीक्षा खं.गणना()))।
        दर्शय("get1:", (उद्धृ प्रतीक्षा खं.एकम्(१)).नाम)।
        उद्धृ प्रतीक्षा खं.परिवर्तय(१, कोष{ वर्षम्: ४०१ })।
        दर्शय("patched:", (उद्धृ प्रतीक्षा खं.एकम्(१)).वर्षम्)।
        दर्शय("query:", (उद्धृ प्रतीक्षा खं.अन्वेषय(कार्य(ल){ फलम् ल.वर्षम् > ४५०। })).दीर्घता)।
        उद्धृ प्रतीक्षा खं.निष्कासय(२)।
        दर्शय("after-delete:", (उद्धृ प्रतीक्षा खं.गणना()))।
        फलम् साधितम्(०)।
    }
    मुख्यम्()।`);
  ok('insert assigns sequential ids (1, 2)', lines[0] === 'ids: 1 2');
  ok('गणना counts the records', lines[1] === 'count: 2');
  ok('एकम् fetches by id', lines[2] === 'get1: गीता');
  ok('परिवर्तय merges a patch', lines[3] === 'patched: 401');
  ok('अन्वेषय filters by predicate', lines[4] === 'query: 1');
  ok('निष्कासय removes a record', lines[5] === 'after-delete: 1');
  // persistence across ops is already proven above: id 2 follows id 1, and the
  // patched value is read back — each requires a real file round-trip.
}

// ---------- the store lazily creates a missing file (empty collection) ----------
{
  const { lines } = runProgram(`
    आयात { कोष्ठागार } आ "std/कोष्ठागार"।
    असमकालिक कार्य मुख्यम् () {
        नियत खं = कोष्ठागार("\${DATA}")।           # file does not exist yet
        दर्शय("empty:", (उद्धृ प्रतीक्षा खं.गणना()))।
        फलम् साधितम्(०)।
    }
    मुख्यम्()।`);
  ok('a missing file reads as an empty collection', lines[0] === 'empty: 0');
}

// ---------- not-found is a विफलम्, not a throw ----------
{
  const { lines } = runProgram(`
    आयात { कोष्ठागार } आ "std/कोष्ठागार"।
    असमकालिक कार्य मुख्यम् () {
        नियत खं = कोष्ठागार("\${DATA}")।
        नियत र = प्रतीक्षा खं.एकम्(९९)।
        दर्शय("nf:", र.सफल, र.दोषः)।
        नियत द = प्रतीक्षा खं.निष्कासय(९९)।
        दर्शय("nd:", द.सफल)।
        फलम् साधितम्(०)।
    }
    मुख्यम्()।`);
  ok('एकम् on a missing id is a विफलम्', lines[0] === 'nf: false न प्राप्तः: अङ्कः 99');
  ok('निष्कासय on a missing id is a विफलम्', lines[1] === 'nd: false');
}

// ---------- an आकृति validator rejects a bad insert (composes with std/आकृति) ----
{
  const { lines } = runProgram(`
    आयात { कोष्ठागार } आ "std/कोष्ठागार"।
    आयात { वस्तु, अक्षर, सङ्ख्या, परीक्ष्य } आ "std/आकृति"।
    असमकालिक कार्य मुख्यम् () {
        नियत श = वस्तु(कोष{ नाम: अक्षर, वर्षम्: सङ्ख्या })।
        नियत खं = कोष्ठागार("\${DATA}", कार्य(र){ फलम् परीक्ष्य(श, र)। })।
        नियत ठीक = प्रतीक्षा खं.योजय(कोष{ नाम: "गीता", वर्षम्: ४०० })।
        दर्शय("valid:", ठीक.सफल)।
        नियत दुष्टम् = प्रतीक्षा खं.योजय(कोष{ नाम: "x", वर्षम्: "पुरा" })।
        दर्शय("invalid:", दुष्टम्.सफल, दुष्टम्.दोषः)।
        दर्शय("count:", (उद्धृ प्रतीक्षा खं.गणना()))।   # only the valid one landed
        फलम् साधितम्(०)।
    }
    मुख्यम्()।`);
  ok('a validated insert accepts a conforming record', lines[0] === 'valid: true');
  ok('a validated insert rejects a bad record with the schema error',
     lines[1] === 'invalid: false वर्षम्: अपेक्षितम् सङ्ख्या, प्राप्तम् वाक्');
  ok('a rejected insert does not touch the collection', lines[2] === 'count: 1');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
