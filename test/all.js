// all.js — aggregate test runner. Discovers and runs every test in test/:
// the smoke suite (test.js) plus every *.test.js file. Each test file exits
// non-zero on failure, so we run each in its own process and tally results.
//
//   node test/all.js
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const files = [
  'test.js',
  ...readdirSync(here).filter(f => f.endsWith('.test.js')).sort(),
];

let failed = [];
for (const f of files) {
  const label = f.replace(/\.js$/, '');
  const res = spawnSync(process.execPath, [join(here, f)], { encoding: 'utf8' });
  const passLine = (res.stdout.match(/(\d+) पास, (\d+) फेल/) || [])[0];
  if (res.status === 0) {
    console.log(`✓ ${label}${passLine ? '  — ' + passLine : ''}`);
  } else {
    failed.push(label);
    console.log(`✗ ${label}  (exit ${res.status})`);
    // surface the child's own failing lines for quick diagnosis
    const detail = (res.stdout + res.stderr).split('\n')
      .filter(l => l.includes('✗') || l.includes('फेल') || l.includes('Error'));
    detail.slice(0, 8).forEach(l => console.log('    ' + l.trim()));
  }
}

console.log(`\n${files.length - failed.length}/${files.length} test files passed.`);
if (failed.length) {
  console.log('Failed: ' + failed.join(', '));
  process.exit(1);
}
