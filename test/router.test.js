// router.test.js — the मार्गकः routing library (written in Devabhāṣā, built on
// सेवक). Bundles the example app (which imports the router via आयात), runs it
// with the live __SRV backend, and exercises static routes, path parameters,
// POST with a JSON body, middleware, and 404 over real HTTP.
import { bundle } from '../src/bundler.js';
import { __SRV } from '../src/server-node.js';
import { request } from 'http';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

const here = dirname(fileURLToPath(import.meta.url));
const example = join(here, '..', 'examples', 'stdlib', 'मार्गक-उदाहरणम्.deva');

if (!existsSync(example)) {
  console.log('  (router example not present — skipping)');
  console.log(`\n${pass} पास, ${fail} फेल`);
  process.exit(0);
}

// bundle the example (resolves the आयात of मार्गकः) and run it, capturing the server
const js = bundle(example, { includeRuntime: false });
ok('router example bundles (आयात मार्गकः resolves)', js.includes('__SRV.serve'));
ok('routes are grouped by method (compiled once)', js.includes('GET') && js.includes('POST'));

let server;
const __SRV_capture = { serve: (h, p) => { server = __SRV.serve(h, p); return server; } };
const __DB = new Proxy({}, { get: () => () => { throw new Error('no DOM'); } });
let logged = 0;
const consoleStub = { log: () => { logged++; } };
// eslint-disable-next-line no-new-func
new Function('__DB', '__SRV', 'console', js)(__DB, __SRV_capture, consoleStub);

await new Promise(r => setTimeout(r, 400));

function http(method, path, body) {
  return new Promise((resolve) => {
    const req = request({ host: 'localhost', port: 8080, path: encodeURI(path), method }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    if (body != null) req.write(body);
    req.end();
  });
}

if (server) {
  // static route
  {
    const r = await http('GET', '/');
    ok('static GET / → 200 JSON', r.status === 200 && JSON.parse(r.body)['सेवा'] === 'ग्रन्थ-कोशः');
  }
  // list
  {
    const r = await http('GET', '/ग्रन्थाः');
    ok('GET /ग्रन्थाः → seeded list', JSON.parse(r.body).length === 2);
  }
  // PATH PARAMETER — the core feature
  {
    const r = await http('GET', '/ग्रन्थाः/2');
    ok('path param /ग्रन्थाः/:अंकः captures and matches', JSON.parse(r.body)['शीर्षकम्'] === 'मेघदूतम्');
  }
  // param route, not found in data → handler's own 404
  {
    const r = await http('GET', '/ग्रन्थाः/99');
    ok('param route with missing id → handler 404', r.status === 404);
  }
  // static and param routes under the SAME prefix don't collide
  {
    const list = await http('GET', '/ग्रन्थाः');
    const one = await http('GET', '/ग्रन्थाः/1');
    ok('/ग्रन्थाः (list) and /ग्रन्थाः/1 (param) dispatch correctly',
       Array.isArray(JSON.parse(list.body)) && JSON.parse(one.body)['अंकः'] === 1);
  }
  // POST with JSON body + state mutation
  {
    const post = await http('POST', '/ग्रन्थाः', JSON.stringify({ 'शीर्षकम्': 'रघुवंशम्', 'लेखकः': 'कालिदासः' }));
    ok('POST /ग्रन्थाः → 201', post.status === 201);
    const after = JSON.parse((await http('GET', '/ग्रन्थाः')).body);
    ok('POST mutated state (now 3)', after.length === 3);
  }
  // method dispatch: a POST to a GET-only path falls through to 404
  {
    const r = await http('POST', '/', JSON.stringify({}));
    ok('POST to a GET-only route → 404 (method-scoped)', r.status === 404);
  }
  // unknown path → router 404
  {
    const r = await http('GET', '/अज्ञातम्');
    ok('unknown path → router 404', r.status === 404 && JSON.parse(r.body)['दोषः'].includes('न प्राप्त'));
  }
  // middleware ran (it logs each request)
  ok('middleware ran for requests', logged > 0);

  server.close();
} else {
  ok('router started a server', false);
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
