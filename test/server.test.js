// server.test.js — the सेवक HTTP-server primitive (Node backend). Compiles a
// Devabhāṣā server program, runs it with the live __SRV backend on a random
// port, and makes real HTTP requests to verify routing, the Devanagari-keyed
// request/response model, JSON in/out, status codes, and error handling.
import { compile } from '../src/index.js';
import { __SRV } from '../src/server-node.js';
import { request } from 'http';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// ---- compilation ----
ok('सेवक → __SRV.serve',
   compile('सेवक(क, ३०००)।', { includeRuntime: false }).includes('__SRV.serve(ka, 3000)'));

// ---- run a Devabhāṣā server and hit it over real HTTP ----
function startServer(src) {
  const js = compile(src, { includeRuntime: false });
  const __DB = new Proxy({}, { get: () => () => { throw new Error('no DOM'); } });
  // the program calls सेवक(...) which returns the http.Server; capture it
  let server;
  const __SRV_capture = { serve: (h, p) => { server = __SRV.serve(h, p); return server; } };
  // eslint-disable-next-line no-new-func
  new Function('__DB', '__SRV', 'console', js)(__DB, __SRV_capture, { log() {} });
  return server;
}
function http(method, port, path, body) {
  return new Promise((resolve) => {
    const req = request({ host: 'localhost', port, path: encodeURI(path), method }, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, type: res.headers['content-type'] }));
    });
    if (body != null) req.write(body);
    req.end();
  });
}

const PORT = 3950 + Math.floor(Math.random() * 40);
const server = startServer(`
  चर सूची = [कोष{ अंकः: १, नाम: "रामः" }]।
  सेवक(असमकालिक कार्य(अनुरोधः, प्रत्युत्तरम्){
      यदि (अनुरोधः.मार्गः == "/नमस्ते") {
          प्रत्युत्तरम्.स्थिति(२००).लेखय("नमस्ते")।
      } अन्यथा {
          यदि (अनुरोधः.मार्गः == "/जनाः") {
              यदि (अनुरोधः.रीतिः == "GET") {
                  प्रत्युत्तरम्.प्रेषय_जेसन(सूची)।
              } अन्यथा {
                  चर परि = प्रतीक्षा अनुरोधः.देहम्_जेसन()।
                  यदि (परि.सफल) {
                      सूची.योजय(कोष{ अंकः: सूची.दीर्घता + १, नाम: परि.मूल्यम्.नाम })।
                      प्रत्युत्तरम्.स्थिति(२०१).प्रेषय_जेसन(कोष{ योजितम्: सत्यम् })।
                  } अन्यथा {
                      प्रत्युत्तरम्.स्थिति(४००).प्रेषय_जेसन(कोष{ दोषः: "bad" })।
                  }
              }
          } अन्यथा {
              यदि (अनुरोधः.मार्गः == "/स्फोट") {
                  चर ब = रिक्तः.किमपि।   # deliberately throws → 500
              } अन्यथा {
                  प्रत्युत्तरम्.स्थिति(४०४).लेखय("न प्राप्तम्")।
              }
          }
      }
  }, ${PORT})।
`);

await new Promise(r => setTimeout(r, 300));

// text response + status + content type
{
  const r = await http('GET', PORT, '/नमस्ते');
  ok('GET text route → 200 with body', r.status === 200 && r.body === 'नमस्ते');
  ok('text response defaults to text/html', /text\/html/.test(r.type));
}
// JSON GET
{
  const r = await http('GET', PORT, '/जनाः');
  ok('GET JSON route → application/json', /application\/json/.test(r.type));
  const data = JSON.parse(r.body);
  ok('JSON body is the data array', Array.isArray(data) && data[0]['नाम'] === 'रामः');
}
// JSON POST with body parsing + mutation + 201
{
  const r = await http('POST', PORT, '/जनाः', JSON.stringify({ 'नाम': 'सीता' }));
  ok('POST parses JSON body → 201', r.status === 201);
  const after = JSON.parse((await http('GET', PORT, '/जनाः')).body);
  ok('POST mutated server state (now 2 people)', after.length === 2 && after[1]['नाम'] === 'सीता');
}
// bad JSON body → 400 via Result
{
  const r = await http('POST', PORT, '/जनाः', 'not json');
  ok('POST bad JSON → 400 (Result, no crash)', r.status === 400);
}
// unknown path → 404
{
  const r = await http('GET', PORT, '/whatever');
  ok('unknown path → 404', r.status === 404);
}
// handler throws → 500, server survives
{
  const r = await http('GET', PORT, '/स्फोट');
  ok('handler error → 500 (caught)', r.status === 500);
  const after = await http('GET', PORT, '/नमस्ते');
  ok('server survives a handler error', after.status === 200);
}

server.close();
console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
