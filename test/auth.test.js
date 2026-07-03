// auth.test.js — Arc D: गुप्ति (crypto) + std/प्रमाणम् (signed tokens, passwords).
//
// गुप्ति exposes node:crypto — SHA-256 digest, HMAC, a constant-time compare,
// random bytes, UUID, base64url, and scrypt. std/प्रमाणम् builds two auth
// facilities on top, in Devabhāṣā: पत्रम् (tamper-evident signed tokens) and
// गूढपदम् (salted password hashing). Programs are bundled from a temp dir (so
// std/ resolves) and run in-process with console + the Node __IO injected.
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
  const dir = mkdtempSync(join(tmpdir(), 'deva-auth-'));
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

// ---------- गुप्ति crypto primitives ----------
{
  const out = run(`
    दर्शय(गुप्ति.संक्षेप("अ").दीर्घता, गुप्ति.संक्षेप("अ") == गुप्ति.संक्षेप("अ"), गुप्ति.संक्षेप("अ") == गुप्ति.संक्षेप("आ"))।
    दर्शय(गुप्ति.समान("क", "क"), गुप्ति.समान("क", "ख"), गुप्ति.समान("क", "कक"))।
    दर्शय(गुप्ति.यादृच्छिक(१६).दीर्घता, गुप्ति.अनन्यांक().अस्ति("-"))।
    दर्शय(गुप्ति.विसंकेतय(गुप्ति.संकेतय("पाठः ब्रह्म")) == "पाठः ब्रह्म")।`);
  ok('संक्षेप is a 64-hex SHA-256 digest', out[0].startsWith('64 '));
  ok('संक्षेप is deterministic and collision-distinct', out[0] === '64 true false');
  ok('समान is a constant-time equality (equal/unequal/length)', out[1] === 'true false false');
  ok('यादृच्छिक(16) is 32 hex chars; अनन्यांक is a UUID', out[2] === '32 true');
  ok('संकेतय/विसंकेतय round-trips Unicode through base64url', out[3] === 'true');
}

// ---------- std/प्रमाणम् type-checks clean ----------
ok('प्रमाणम्.deva type-checks clean',
   typeDiagnostics(readFileSync(join(here, '..', 'examples', 'stdlib', 'प्रमाणम्.deva'), 'utf8')).length === 0);

// ---------- signed tokens ----------
{
  const out = run(`
    आयात { पत्रम् } आ "std/प्रमाणम्"।
    नियत कुं = "गुप्तकुञ्जी"।
    नियत ट = पत्रम्.रचय(कोष{ उपयोक्ता: "राम", भूमिका: "पालकः" }, कुं)।
    नियत फल = पत्रम्.सत्यापय(ट, कुं)।
    दर्शय(फल.सफल, फल.मूल्यम्.उपयोक्ता, फल.मूल्यम्.भूमिका)।
    दर्शय(पत्रम्.सत्यापय(ट, "अन्या").सफल)।       # wrong key
    दर्शय(पत्रम्.सत्यापय(ट + "x", कुं).सफल)।       # tampered
    दर्शय(पत्रम्.सत्यापय("नास्ति", कुं).सफल)।      # malformed`);
  ok('a valid token verifies and yields its payload', out[0] === 'true राम पालकः');
  ok('a wrong signing key is rejected', out[1] === 'false');
  ok('a tampered token is rejected', out[2] === 'false');
  ok('a malformed token is rejected', out[3] === 'false');
}

// ---------- password hashing ----------
{
  const out = run(`
    आयात { गूढपदम् } आ "std/प्रमाणम्"।
    नियत ग = गूढपदम्.रचय("रहस्यम्")।
    दर्शय(गूढपदम्.मेलय("रहस्यम्", ग))।           # correct
    दर्शय(गूढपदम्.मेलय("असत्यम्", ग))।           # wrong
    दर्शय(ग != गूढपदम्.रचय("रहस्यम्"))।          # salted → distinct hashes
    दर्शय(गूढपदम्.मेलय("x", "दुष्टम्"))।          # malformed stored hash → false`);
  ok('a correct password verifies', out[0] === 'true');
  ok('a wrong password fails', out[1] === 'false');
  ok('equal passwords hash differently (random salt)', out[2] === 'true');
  ok('a malformed stored hash is a clean false, not a crash', out[3] === 'false');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
