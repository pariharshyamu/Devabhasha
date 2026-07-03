// sqlite.test.js — दत्ताधारः (SQLite) and std/सञ्चयः, the durable v2 of the store.
//
// Exercises everything END-TO-END through the real `devabhasha run` path (which
// injects the Node __IO backend, whose db namespace opens node:sqlite): raw SQL
// through the दत्ताधारः handle (आदेश/चालय/सर्वे/प्रथमा with bound params), then the
// std/सञ्चयः document store — the same CRUD API as कोष्ठागार but table-backed —
// including durability across a close/reopen and an आकृति-backed validator.
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

// write `program` to a temp dir and run it; `${DB}` → a fresh temp .db path.
// NODE_NO_WARNINGS quiets node:sqlite's one-time ExperimentalWarning.
function runProgram(program) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-sqlite-'));
  const db = join(dir, 'store.db');
  const entry = join(dir, 'prog.deva');
  writeFileSync(entry, program.replaceAll('${DB}', db), 'utf8');
  try {
    const res = spawnSync(process.execPath, [cli, 'run', entry],
      { encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' } });
    if (res.status !== 0) { console.log('    ' + (res.stderr || res.stdout).trim()); return { lines: [] }; }
    return { lines: res.stdout.trim().split('\n') };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ---------- raw SQL through the दत्ताधारः handle ----------
{
  const { lines } = runProgram(`
    असमकालिक कार्य मुख्यम् () {
        नियत आधार = उद्धृ दत्ताधारः.उद्घाटय("\${DB}")।
        उद्धृ आधार.आदेश("CREATE TABLE \\"कवयः\\"(\\"नाम\\" TEXT, \\"वर्षम्\\" INTEGER)")।
        नियत र = उद्धृ आधार.चालय("INSERT INTO \\"कवयः\\" VALUES(?,?)", ["कालिदासः", ४५०])।
        दर्शय("run:", र.परिवर्तनानि, र.अन्तिमाङ्कः)।
        उद्धृ आधार.चालय("INSERT INTO \\"कवयः\\" VALUES(?,?)", ["भवभूतिः", ७००])।
        नियत सर्वे = उद्धृ आधार.सर्वे("SELECT \\"नाम\\" FROM \\"कवयः\\" WHERE \\"वर्षम्\\" < ? ORDER BY \\"वर्षम्\\"", [६००])।
        दर्शय("where:", सर्वे.दीर्घता, सर्वे[०].नाम)।
        नियत एक = उद्धृ आधार.प्रथमा("SELECT \\"नाम\\" FROM \\"कवयः\\" WHERE \\"वर्षम्\\" = ?", [७००])।
        दर्शय("get:", एक.नाम)।
        नियत रिक्तः = उद्धृ आधार.प्रथमा("SELECT \\"नाम\\" FROM \\"कवयः\\" WHERE \\"वर्षम्\\" = ?", [९९९])।
        दर्शय("miss:", रिक्तः == शून्यम्)।
        उद्धृ आधार.पिधा()।
        फलम् साधितम्(०)।
    }
    मुख्यम्()।`);
  ok('चालय reports changes and lastInsertRowid', lines[0] === 'run: 1 1');
  ok('सर्वे returns bound-param query rows', lines[1] === 'where: 1 कालिदासः');
  ok('प्रथमा returns a single row', lines[2] === 'get: भवभूतिः');
  ok('प्रथमा on no match is शून्यम् (null), not a throw', lines[3] === 'miss: true');
}

// ---------- सञ्चयः: full CRUD lifecycle (same API as कोष्ठागार) ----------
{
  const { lines } = runProgram(`
    आयात { सञ्चयः } आ "std/सञ्चयः"।
    असमकालिक कार्य मुख्यम् () {
        नियत आधार = उद्धृ दत्ताधारः.उद्घाटय("\${DB}")।
        नियत खं = सञ्चयः(आधार, "ग्रन्थाः")।
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
  ok('योजय assigns sequential ids (1, 2)', lines[0] === 'ids: 1 2');
  ok('गणना counts the records', lines[1] === 'count: 2');
  ok('एकम् fetches by id', lines[2] === 'get1: गीता');
  ok('परिवर्तय merges a patch', lines[3] === 'patched: 401');
  ok('अन्वेषय filters by predicate', lines[4] === 'query: 1');
  ok('निष्कासय removes a record', lines[5] === 'after-delete: 1');
}

// ---------- durability: records survive a close + reopen ----------
{
  const { lines } = runProgram(`
    आयात { सञ्चयः } आ "std/सञ्चयः"।
    असमकालिक कार्य मुख्यम् () {
        नियत आधार = उद्धृ दत्ताधारः.उद्घाटय("\${DB}")।
        नियत खं = सञ्चयः(आधार, "पुस्तकानि")।
        उद्धृ प्रतीक्षा खं.योजय(कोष{ नाम: "अ" })।
        उद्धृ प्रतीक्षा खं.योजय(कोष{ नाम: "आ" })।
        उद्धृ आधार.पिधा()।                          # close
        नियत पुनः = उद्धृ दत्ताधारः.उद्घाटय("\${DB}")।    # reopen the same file
        नियत कोशः = सञ्चयः(पुनः, "पुस्तकानि")।
        दर्शय("reopened:", (उद्धृ प्रतीक्षा कोशः.गणना()))।
        दर्शय("first:", (उद्धृ प्रतीक्षा कोशः.एकम्(१)).नाम)।
        फलम् साधितम्(०)।
    }
    मुख्यम्()।`);
  ok('records persist across a close and reopen', lines[0] === 'reopened: 2');
  ok('a persisted record reads back intact', lines[1] === 'first: अ');
}

// ---------- not-found is a विफलम्, not a throw ----------
{
  const { lines } = runProgram(`
    आयात { सञ्चयः } आ "std/सञ्चयः"।
    असमकालिक कार्य मुख्यम् () {
        नियत आधार = उद्धृ दत्ताधारः.उद्घाटय("\${DB}")।
        नियत खं = सञ्चयः(आधार, "क")।
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
    आयात { सञ्चयः } आ "std/सञ्चयः"।
    आयात { वस्तु, अक्षर, सङ्ख्या, परीक्ष्य } आ "std/आकृति"।
    असमकालिक कार्य मुख्यम् () {
        नियत श = वस्तु(कोष{ नाम: अक्षर, वर्षम्: सङ्ख्या })।
        नियत आधार = उद्धृ दत्ताधारः.उद्घाटय("\${DB}")।
        नियत खं = सञ्चयः(आधार, "क", कार्य(र){ फलम् परीक्ष्य(श, र)। })।
        नियत ठीक = प्रतीक्षा खं.योजय(कोष{ नाम: "गीता", वर्षम्: ४०० })।
        दर्शय("valid:", ठीक.सफल)।
        नियत दुष्टम् = प्रतीक्षा खं.योजय(कोष{ नाम: "x", वर्षम्: "पुरा" })।
        दर्शय("invalid:", दुष्टम्.सफल)।
        दर्शय("count:", (उद्धृ प्रतीक्षा खं.गणना()))।   # only the valid one landed
        फलम् साधितम्(०)।
    }
    मुख्यम्()।`);
  ok('a validated insert accepts a conforming record', lines[0] === 'valid: true');
  ok('a validated insert rejects a bad record', lines[1] === 'invalid: false');
  ok('a rejected insert does not touch the table', lines[2] === 'count: 1');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
