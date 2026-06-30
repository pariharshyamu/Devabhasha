// fullstack.test.js — the full-stack example (examples/पूर्णस्तर). Verifies the
// frontend compiles to a browser bundle (DOM runtime + browser fetch shim) and
// that the backend's सेवक JSON API answers a real GET/POST round trip over HTTP.
import { compile } from '../src/index.js';
import { IO_BROWSER_SOURCE } from '../src/io-browser.js';
import { __IO } from '../src/io-node.js';
import { __SRV } from '../src/server-node.js';
import { readFileSync, existsSync } from 'fs';
import { request } from 'http';
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

// ---- frontend compiles to a runnable browser bundle ----
{
  const front = readFileSync(join(dir, 'अग्रिम.deva'), 'utf8');
  const js = IO_BROWSER_SOURCE + '\n' + compile(front, { includeRuntime: true });
  ok('frontend compiles with DOM runtime', js.includes('__DB') && js.includes('construct'));
  ok('frontend bundle includes a browser __IO (native fetch)', js.includes('const __IO') && js.includes('fetchJson'));
  // it must be syntactically valid JS
  let valid = true; try { new Function(js); } catch { valid = false; }
  ok('frontend bundle is valid JavaScript', valid);
  ok('browser file I/O degrades to a Result, not a throw', IO_BROWSER_SOURCE.includes('not available in the browser'));
}

// ---- backend serves the API; exercise a real round trip ----
const back = readFileSync(join(dir, 'पश्चिम.deva'), 'utf8');
const backJs = compile(back, { includeRuntime: false });
ok('backend has no DOM (__DB) references', !backJs.includes('__DB.'));

// run the backend, but skip its file read (no bundle on disk in CI) by giving a
// __IO whose file.read returns a tiny stub page, and capture the server handle.
let server;
const __IO_stub = {
  file: { ...__IO.file, read: async () => ({ 'सफल': true, 'मूल्यम्': '/* frontend */', 'दोषः': null }) },
  net: __IO.net,
};
const __SRV_capture = { serve: (h, p) => { server = __SRV.serve(h, p); return server; } };
const __DB = new Proxy({}, { get: () => () => { throw new Error('no DOM'); } });
// eslint-disable-next-line no-new-func
new Function('__DB', '__IO', '__SRV', 'console', backJs)(__DB, __IO_stub, __SRV_capture, { log() {} });

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

if (server) {
  // GET / serves an HTML page embedding the frontend mount root
  {
    const r = await http('GET', '/');
    ok('GET / serves an HTML page', r.status === 200 && r.body.includes("id='मूलम्'"));
  }
  // GET the API
  {
    const r = await http('GET', '/api/ग्रन्थाः');
    const data = JSON.parse(r.body);
    ok('GET /api → seeded book list', Array.isArray(data) && data.length === 2);
  }
  // POST a book, then GET again → it persisted (the round trip)
  {
    const post = await http('POST', '/api/ग्रन्थाः', JSON.stringify({ 'शीर्षकम्': 'रघुवंशम्', 'लेखकः': 'कालिदासः' }));
    ok('POST /api → 201', post.status === 201);
    const after = JSON.parse((await http('GET', '/api/ग्रन्थाः')).body);
    ok('POST persisted across requests (now 3)', after.length === 3 && after[2]['शीर्षकम्'] === 'रघुवंशम्');
  }
  server.close();
} else {
  ok('backend started a server', false);
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
