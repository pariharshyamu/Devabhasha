// web-middleware.test.js — Arc E HTTP maturity over real HTTP.
//
// Spins a मार्गकः server that mounts कोर्स (CORS), सत्रमध्यगः (signed-cookie
// sessions, backed by पत्रम्), and स्थैतिक (static files), then exercises the
// round trips with http.request: an anonymous request, a login that sets a
// signed session cookie, an authenticated request that reads it back, a static
// asset, a CORS preflight, and a 404 (routing still works with middleware
// running on every request).
import { bundle } from '../src/bundler.js';
import { __IO } from '../src/io-node.js';
import { __SRV } from '../src/server-node.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { request } from 'http';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

const PORT = 8123;
const dir = mkdtempSync(join(tmpdir(), 'deva-web-'));
const staticDir = join(dir, 'सार्वजनिक');
mkdirSync(staticDir);
writeFileSync(join(staticDir, 'style.css'), 'body { color: saffron; }', 'utf8');

const server_src = `
आयात { मार्गकः } आ "std/मार्गकः"।
आयात { सत्रमध्यगः } आ "std/सत्र"।
आयात { स्थैतिक, कोर्स } आ "std/जालमध्यगाः"।
नियत ऐप = मार्गकः()।
ऐप.उपयुज्(कोर्स())।
ऐप.उपयुज्(सत्रमध्यगः("परीक्षा-गुप्तम्"))।
ऐप.उपयुज्(स्थैतिक(${JSON.stringify(staticDir)}))।
ऐप.स्थापय("/प्रवेश", कार्य(अ, प्र){ प्र.सत्रस्थापय(कोष{ उपयोक्ता: "राम" })। प्र.प्रेषय_जेसन(कोष{ ठीक: सत्यम् })। })।
ऐप.प्राप्("/अहम्", कार्य(अ, प्र){ प्र.प्रेषय_जेसन(कोष{ सत्रम्: अ.सत्रम् })। })।
ऐप.चालय(${PORT})।
`;

const entry = join(dir, 'सेवकः.deva');
writeFileSync(entry, server_src, 'utf8');

let server;
const __SRV_capture = { serve: (h, p) => { server = __SRV.serve(h, p); return server; } };
const __DB = new Proxy({}, { get: () => () => { throw new Error('no DOM'); } });

function http(method, path, { cookie } = {}) {
  return new Promise((resolve) => {
    const headers = cookie ? { Cookie: cookie } : {};
    const req = request({ host: 'localhost', port: PORT, path: encodeURI(path), method, headers }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.end();
  });
}

try {
  const code = bundle(entry, { includeRuntime: false });
  new Function('__DB', '__IO', '__SRV', 'console', code)(__DB, __IO, __SRV_capture, { log() {} });
  await new Promise(r => setTimeout(r, 300));

  if (!server) { ok('server started', false); }
  else {
    // ---------- anonymous: no session ----------
    {
      const r = await http('GET', '/अहम्');
      ok('an anonymous request has a null session', r.status === 200 && JSON.parse(r.body)['सत्रम्'] === null);
    }
    // ---------- login sets a signed session cookie ----------
    let cookie = '';
    {
      const r = await http('POST', '/प्रवेश');
      const sc = r.headers['set-cookie'];
      ok('login responds 200', r.status === 200 && JSON.parse(r.body)['ठीक'] === true);
      ok('login sets a "sess" cookie', Array.isArray(sc) && /^sess=/.test(sc[0]));
      cookie = sc[0].split(';')[0];
    }
    // ---------- the cookie round-trips → the session is readable ----------
    {
      const r = await http('GET', '/अहम्', { cookie });
      ok('the signed session cookie authenticates the next request',
         JSON.parse(r.body)['सत्रम्'] && JSON.parse(r.body)['सत्रम्']['उपयोक्ता'] === 'राम');
    }
    // ---------- a tampered cookie is rejected (null session, not a crash) ----------
    {
      const r = await http('GET', '/अहम्', { cookie: cookie + 'x' });
      ok('a tampered session cookie is rejected', JSON.parse(r.body)['सत्रम्'] === null);
    }
    // ---------- static file serving ----------
    {
      const r = await http('GET', '/style.css');
      ok('a static file is served with its content type',
         r.status === 200 && /text\/css/.test(r.headers['content-type']) && r.body.includes('saffron'));
    }
    // ---------- CORS: headers on responses + a 204 preflight ----------
    {
      const r = await http('GET', '/अहम्');
      ok('CORS headers are set on responses', r.headers['access-control-allow-origin'] === '*');
      const p = await http('OPTIONS', '/अहम्');
      ok('an OPTIONS preflight is answered 204', p.status === 204);
    }
    // ---------- routing still works (middleware runs on every request) ----------
    {
      const r = await http('GET', '/नास्ति');
      ok('an unknown path still 404s through the middleware chain',
         r.status === 404 && JSON.parse(r.body)['दोषः'].includes('न प्राप्त'));
    }
    server.close();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
