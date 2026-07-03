// fullstack.test.js — the full-stack example (examples/पूर्णस्तर). Verifies the
// frontend compiles to a browser bundle (DOM runtime + browser fetch shim), and
// that the backend — मार्गकः router + सञ्चयः (SQLite) + आकृति validation —
// answers real GET/POST/DELETE round trips over HTTP, including a schema
// rejection and persistence to the database.
import { compile } from '../src/index.js';
import { bundle } from '../src/bundler.js';
import { IO_BROWSER_SOURCE } from '../src/io-browser.js';
import { __IO } from '../src/io-node.js';
import { __SRV } from '../src/server-node.js';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { request } from 'http';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'examples', 'पूर्णस्तर');

if (!existsSync(join(dir, 'अग्रिम.deva')) || !existsSync(join(dir, 'पश्चिम.deva'))) {
  console.log('  (full-stack example not present — skipping)');
  console.log(`\n${pass} पास, ${fail} फेल`);
  process.exit(0);
}

// the backend uses सञ्चयः (SQLite); on Nodes without node:sqlite (< 22.5), skip.
try { (await import('node:module')).createRequire(import.meta.url)('node:sqlite'); }
catch { console.log('  (node:sqlite unavailable — needs Node 22.5+; skipping)\n0 पास, 0 फेल'); process.exit(0); }

// ---- frontend compiles to a runnable browser bundle ----
{
  const front = readFileSync(join(dir, 'अग्रिम.deva'), 'utf8');
  const js = IO_BROWSER_SOURCE + '\n' + compile(front, { includeRuntime: true });
  ok('frontend compiles with DOM runtime', js.includes('__DB') && js.includes('construct'));
  ok('frontend bundle includes a browser __IO (native fetch)', js.includes('const __IO') && js.includes('fetchJson'));
  let valid = true; try { new Function(js); } catch { valid = false; }
  ok('frontend bundle is valid JavaScript', valid);
  ok('browser file I/O degrades to a Result, not a throw', IO_BROWSER_SOURCE.includes('not available in the browser'));
}

// ---- backend serves the API; exercise a real round trip ----
// The backend आयात-s मार्गकः / सञ्चयः / आकृति, so it goes through the bundler.
const backJs = bundle(join(dir, 'पश्चिम.deva'), { includeRuntime: false });
ok('backend has no DOM (__DB) references', !backJs.includes('__DB.'));

// Run it from a throwaway dir so ग्रन्थालयः.db lands there; stub only file.read
// (no frontend bundle on disk in CI) and keep a real __IO.db (SQLite).
const work = mkdtempSync(join(tmpdir(), 'deva-fullstack-'));
const prevCwd = process.cwd();
process.chdir(work);
const __IO_run = {
  file: { ...__IO.file, read: async () => ({ 'सफल': true, 'मूल्यम्': '/* frontend */', 'दोषः': null }) },
  net: __IO.net,
  db: __IO.db,
};
let server;
const __SRV_capture = { serve: (h, p) => { server = __SRV.serve(h, p); return server; } };
const __DB = new Proxy({}, { get: () => () => { throw new Error('no DOM'); } });
// eslint-disable-next-line no-new-func
new Function('__DB', '__IO', '__SRV', 'console', backJs)(__DB, __IO_run, __SRV_capture, { log() {} });

await new Promise(r => setTimeout(r, 400));

function http(method, path, body) {
  return new Promise((resolve) => {
    const req = request({ host: 'localhost', port: 8100, path: encodeURI(path), method }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    if (body != null) req.write(body);
    req.end();
  });
}

try {
  if (server) {
    // GET / serves an HTML page embedding the frontend mount root
    {
      const r = await http('GET', '/');
      ok('GET / serves an HTML page', r.status === 200 && r.body.includes("id='मूलम्'"));
    }
    // GET the API → the seeded list, from the database
    {
      const r = await http('GET', '/api/ग्रन्थाः');
      const data = JSON.parse(r.body);
      ok('GET /api → seeded book list (2)', Array.isArray(data) && data.length === 2 && data[0]['अङ्कः'] === 1);
    }
    // POST a valid book → 201, then GET → it persisted to the database
    {
      const post = await http('POST', '/api/ग्रन्थाः', JSON.stringify({ 'शीर्षकम्': 'रघुवंशम्', 'लेखकः': 'कालिदासः' }));
      ok('POST /api (valid) → 201', post.status === 201 && JSON.parse(post.body)['अङ्कः'] === 3);
      const after = JSON.parse((await http('GET', '/api/ग्रन्थाः')).body);
      ok('POST persisted to the database (now 3)', after.length === 3 && after[2]['शीर्षकम्'] === 'रघुवंशम्');
    }
    // POST an invalid book → 422 with the आकृति schema error (nothing stored)
    {
      const bad = await http('POST', '/api/ग्रन्थाः', JSON.stringify({ 'शीर्षकम्': 'x' }));
      ok('POST /api (invalid) → 422 schema rejection', bad.status === 422 && JSON.parse(bad.body)['दोषः'].includes('लेखकः'));
      const after = JSON.parse((await http('GET', '/api/ग्रन्थाः')).body);
      ok('a rejected POST did not touch the store (still 3)', after.length === 3);
    }
    // DELETE by id → 200, then GET → it is gone
    {
      const del = await http('DELETE', '/api/ग्रन्थाः/3');
      ok('DELETE /api/:अङ्कः → 200', del.status === 200 && JSON.parse(del.body)['ठीक'] === true);
      const after = JSON.parse((await http('GET', '/api/ग्रन्थाः')).body);
      ok('DELETE removed the record (back to 2)', after.length === 2);
    }
    // an unknown route still 404s through the router
    {
      const r = await http('GET', '/api/नास्ति');
      ok('unknown route → 404', r.status === 404 && JSON.parse(r.body)['दोषः'].includes('न प्राप्त'));
    }
    server.close();
  } else {
    ok('backend started a server', false);
  }
} finally {
  process.chdir(prevCwd);
  rmSync(work, { recursive: true, force: true });
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
