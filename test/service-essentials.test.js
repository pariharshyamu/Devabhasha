// service-essentials.test.js — Arc C: काल (time), पर्यावरण (env), प्रलेख (logs).
//
// The unglamorous glue a service needs: a clock, environment access, and
// structured logging. काल() and the प्रलेख logger are host-independent (काल is
// in __RT, प्रलेख is pure Devabhāṣā over काल + प्रदत्त); पर्यावरण reads the Node
// __IO backend. Programs are bundled from a temp dir (so std/ resolves) and run
// in-process with console + __IO injected.
import { bundle } from '../src/bundler.js';
import { typeDiagnostics } from '../src/types.js';
import { __IO } from '../src/io-node.js';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

function run(src) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-svc-'));
  const entry = join(dir, 'main.deva');
  writeFileSync(entry, src, 'utf8');
  try {
    const code = bundle(entry, { includeRuntime: false });
    const logs = [];
    new Function('console', '__IO', code)(
      { log: (...a) => logs.push(a.map(String).join(' ')) }, __IO);
    return logs;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ---------- काल — epoch-ms clock ----------
{
  // 1e12 ms ≈ year 2001; any real "now" is well past it
  const out = run(`दर्शय(स्वरूपम्(काल()))। दर्शय(काल() > १०००००००००००० && काल() < ९००००००००००००)।`);
  ok('काल() is a number (अङ्क)', out[0] === 'अङ्क');
  ok('काल() is a plausible epoch-ms timestamp', out[1] === 'true');
}

// ---------- पर्यावरण — environment variables, with अथवा defaults ----------
{
  process.env.DEVA_TEST_VAR = 'मूल्यम्';
  delete process.env.DEVA_TEST_ABSENT;
  const out = run(`
    दर्शय(पर्यावरण("DEVA_TEST_VAR") अथवा "-")।
    दर्शय(पर्यावरण("DEVA_TEST_ABSENT") अथवा "पूर्वनिर्धारितम्")।`);
  ok('पर्यावरण reads a set variable', out[0] === 'मूल्यम्');
  ok('पर्यावरण(unset) अथवा default falls back', out[1] === 'पूर्वनिर्धारितम्');
  delete process.env.DEVA_TEST_VAR;
}

// ---------- प्रलेख — the module type-checks clean ----------
ok('प्रलेख.deva type-checks clean',
   typeDiagnostics(readFileSync(join(here, '..', 'examples', 'stdlib', 'प्रलेख.deva'), 'utf8')).length === 0);

// ---------- प्रलेख — one structured JSON line per event ----------
{
  const out = run(`
    आयात { प्रलेख } आ "std/प्रलेख"।
    प्रलेख.सूचना("आरब्धम्", कोष{ पत्तनम्: ८०८० })।`);
  let rec = null; try { rec = JSON.parse(out[0]); } catch { /* leave null */ }
  ok('a log line is valid JSON', rec !== null);
  ok('it carries स्तरः + संदेशः', rec && rec['स्तरः'] === 'सूचना' && rec['संदेशः'] === 'आरब्धम्');
  ok('structured क्षेत्राणि are merged in', rec && rec['पत्तनम्'] === 8080);
  ok('it is stamped with a काल timestamp', rec && typeof rec['काल'] === 'number');
}

// ---------- प्रलेखकः — base fields on every line; distinct levels ----------
{
  const out = run(`
    आयात { प्रलेखकः } आ "std/प्रलेख"।
    नियत लॉग = प्रलेखकः(कोष{ सेवा: "ग्रन्थालयः" })।
    लॉग.चेतावनी("मन्दा")।
    लॉग.दोष("पतितम्", कोष{ अङ्कः: ५ })।`);
  const a = JSON.parse(out[0]), b = JSON.parse(out[1]);
  ok('a प्रलेखकः merges its base fields into every line',
     a['सेवा'] === 'ग्रन्थालयः' && b['सेवा'] === 'ग्रन्थालयः');
  ok('levels are tagged distinctly', a['स्तरः'] === 'चेतावनी' && b['स्तरः'] === 'दोष');
  ok('per-call fields still merge over the base', b['अङ्कः'] === 5);
}

// ---------- reserved keys are authoritative (a stray field can't rewrite them) ----
{
  const out = run(`
    आयात { प्रलेख } आ "std/प्रलेख"।
    प्रलेख.सूचना("सन्देशः", कोष{ स्तरः: "मिथ्या", संदेशः: "अपहृतम्", स्वकीयम्: १ })।`);
  const rec = JSON.parse(out[0]);
  ok('a field named स्तरः cannot override the real level', rec['स्तरः'] === 'सूचना');
  ok('a field named संदेशः cannot override the real message', rec['संदेशः'] === 'सन्देशः');
  ok('other user fields still come through', rec['स्वकीयम्'] === 1);
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
