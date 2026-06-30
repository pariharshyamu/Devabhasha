// devserver.test.js — the dev server: serves a runnable page + compiled bundle,
// pushes live-reload over SSE on source change, and shows compile errors on the
// page instead of crashing. Uses only Node built-ins (no browser needed).
import { serve } from '../src/devserver.js';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const dir = mkdtempSync(join(tmpdir(), 'deva-serve-'));
const entry = join(dir, 'app.deva');
writeFileSync(entry, 'भाव ग = ०। चर प = रचय शीर्षः वाक्यम् पाठ"v{ग}"। योजय(प)।', 'utf8');

const port = 5210 + Math.floor(Math.random() * 50);
const dev = serve(entry, { port });
await sleep(400);

// 1. the HTML page
const page = await fetch(`http://localhost:${port}/`).then(r => r.text());
ok('serves HTML with a mount root', page.includes('id="मूलम्"'));
ok('page includes the live-reload client', page.includes('/__live') && page.includes('EventSource'));
ok('page references the bundle', page.includes('/__bundle.js'));

// 2. the compiled bundle
const bundleJs = await fetch(`http://localhost:${port}/__bundle.js`).then(r => r.text());
ok('bundle is compiled JS with the DOM runtime', bundleJs.includes('__DB'));
ok('bundle is wrapped to mount at the root', bundleJs.includes("getElementById('मूलम्')"));
ok('bundle guards runtime errors (try/catch on page)', bundleJs.includes('दोषः (runtime)'));

// 3. live reload over SSE on file change
let gotReload = false;
const ac = new AbortController();
(async () => {
  try {
    const res = await fetch(`http://localhost:${port}/__live`, { signal: ac.signal });
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value);
      if (buf.includes('event: reload')) { gotReload = true; ac.abort(); break; }
    }
  } catch {}
})();
await sleep(150);
writeFileSync(entry, 'चर प = रचय शीर्षः वाक्यम् "edited"। योजय(प)।', 'utf8');
await sleep(500);
ok('edit triggers a live-reload push over SSE', gotReload);

// 4. compile error → shown on page, server stays up
writeFileSync(entry, 'चर x = ।', 'utf8');   // syntax error
await sleep(150);
const errBundle = await fetch(`http://localhost:${port}/__bundle.js`).then(r => r.text());
ok('compile error is rendered on the page (not a crash)', errBundle.includes('__err'));
const stillUp = await fetch(`http://localhost:${port}/`).then(r => r.ok).catch(() => false);
ok('server stays up despite a compile error', stillUp === true);

// 5. 404 for unknown paths
const notFound = await fetch(`http://localhost:${port}/nope`).then(r => r.status);
ok('unknown path → 404', notFound === 404);

dev.close();
rmSync(dir, { recursive: true, force: true });

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
