// stdlib-types.test.js — the standard library carries प्रकार annotations.
//
// The data-structure modules (सूची / पाठ / कोष) are TYPED where the type is
// genuinely concrete. Two things must hold:
//   1. each module type-checks clean on its own (no false positive in the
//      library's own bodies — annotations that don't survive their own check
//      are worse than none), and
//   2. those types now BITE across the आयात boundary — a wrong argument to an
//      imported stdlib function is flagged by `check` (checkProgram), while a
//      correct call, and an element-polymorphic one, stay clean.
// Annotations are erased at codegen, so runtime is untouched — the stdlib
// runtime behaviour is covered by stdlib-modules.test.js; this file is only
// about the type layer.
import { typeDiagnostics } from '../src/types.js';
import { checkProgram } from '../src/bundler.js';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const stdlibDir = join(here, '..', 'examples', 'stdlib');

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// check a lone program (imports resolve to the shipped std/) and return diags
function check(src) {
  const dir = mkdtempSync(join(tmpdir(), 'deva-stdt-'));
  const entry = join(dir, 'main.deva');
  writeFileSync(entry, src, 'utf8');
  try { return checkProgram(entry); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
const hasArgErr = ds => ds.some(d => d.kind === 'type-arg');

// ---------- 1. each module is self-clean ----------
for (const m of ['सूची', 'पाठ', 'कोष']) {
  const src = readFileSync(join(stdlibDir, m + '.deva'), 'utf8');
  ok(`${m}.deva type-checks clean on its own`, typeDiagnostics(src).length === 0);
}

// ---------- 2a. सूची — गण<सङ्ख्या> signatures bite ----------
ok('योगः([nums]) is clean', check(`आयात { योगः } आ "std/सूची"। दर्शय(योगः([१,२,३]))।`).length === 0);
ok('योगः("पाठ") is flagged (wants गण<सङ्ख्या>, got अक्षर)',
   hasArgErr(check(`आयात { योगः } आ "std/सूची"। दर्शय(योगः("पाठ"))।`)));
ok('न्यूनतमम्([nums]) is clean',
   check(`आयात { न्यूनतमम् } आ "std/सूची"। दर्शय(न्यूनतमम्([५,२,८]))।`).length === 0);
ok('परिसरः(१, ५) feeds योगः cleanly (return type flows गण<सङ्ख्या>)',
   check(`आयात { परिसरः, योगः } आ "std/सूची"। दर्शय(योगः(परिसरः(१, ५)))।`).length === 0);

// predicate/reducer function-typed params accept a matching callback…
ok('सन्ति(list, predicate) is clean',
   check(`आयात { सन्ति } आ "std/सूची"। दर्शय(सन्ति([१,२], कार्य(x){ फलम् x > ०। }))।`).length === 0);
ok('न्यूनीकरणम्(list, 2-arg fn, seed) is clean',
   check(`आयात { न्यूनीकरणम् } आ "std/सूची"। दर्शय(न्यूनीकरणम्([१,२], कार्य(अ,ब){ फलम् अ+ब। }, ०))।`).length === 0);
// …but a non-function where a predicate is wanted is flagged
ok('सन्ति(list, नसङ्ख्या) is flagged (predicate wants कार्य, got सङ्ख्या)',
   hasArgErr(check(`आयात { सन्ति } आ "std/सूची"। दर्शय(सन्ति([१,२], ५))।`)));

// element-polymorphic helpers stay gradual — a string list into अद्वितीयम् is fine
ok('अद्वितीयम्(["a","b"]) stays gradual (bare गण, no false positive)',
   check(`आयात { अद्वितीयम् } आ "std/सूची"। दर्शय(अद्वितीयम्(["अ","आ","अ"]).दीर्घता)।`).length === 0);

// ---------- 2b. पाठ — every helper concretely typed ----------
ok('आवर्तय("ab", ३) is clean',
   check(`आयात { आवर्तय } आ "std/पाठ"। दर्शय(आवर्तय("ab", ३))।`).length === 0);
ok('आवर्तय(५, "x") is flagged on BOTH arguments',
   check(`आयात { आवर्तय } आ "std/पाठ"। दर्शय(आवर्तय(५, "x"))।`).filter(d => d.kind === 'type-arg').length === 2);
ok('वामपूरणम्("7", ३, "0") is clean',
   check(`आयात { वामपूरणम् } आ "std/पाठ"। दर्शय(वामपूरणम्("7", ३, "0"))।`).length === 0);

// ---------- 2c. कोष — वस्तु in, concrete out ----------
ok('अस्ति(कोष{…}, "क") is clean',
   check(`आयात { अस्ति } आ "std/कोष"। दर्शय(अस्ति(कोष{अ:१}, "अ"))।`).length === 0);
ok('अस्ति(कोष{…}, ५) is flagged (key wants अक्षर, got सङ्ख्या)',
   hasArgErr(check(`आयात { अस्ति } आ "std/कोष"। दर्शय(अस्ति(कोष{अ:१}, ५))।`)));
ok('गालयकुञ्जीभिः(obj, [keys]) is clean',
   check(`आयात { गालयकुञ्जीभिः } आ "std/कोष"। दर्शय(गालयकुञ्जीभिः(कोष{अ:१,ब:२}, ["अ"]))।`).length === 0);

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
