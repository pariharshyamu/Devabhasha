// io.test.js — layered I/O (सञ्चिका files, जाल network).
//
// The key property of the layered design: a program is bound to the __IO
// *interface*, not to Node. These tests run compiled programs against an
// in-memory backend (proving swappability) AND against the real Node backend.
import { compile, PRELUDE } from '../src/index.js';
import { __IO as nodeIO } from '../src/io-node.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- compilation: surface lowers to the __IO interface ----------
ok('सञ्चिका.पठ → __IO.file.read', js('सञ्चिका.पठ("a")।').includes('__IO.file.read("a")'));
ok('सञ्चिका.लिख → __IO.file.write', js('सञ्चिका.लिख("a","b")।').includes('__IO.file.write("a", "b")'));
ok('सञ्चिका.विद्यते → __IO.file.exists', js('सञ्चिका.विद्यते("a")।').includes('__IO.file.exists("a")'));
ok('जाल.आनय → __IO.net.fetch', js('जाल.आनय("u")।').includes('__IO.net.fetch("u")'));

// ---------- run a program against an INJECTED in-memory backend ----------
// proves the program depends only on the __IO contract, not on Node.
function runWith(src, io) {
  return new Promise(resolve => {
    const logs = [];
    const consoleObj = { log: (...a) => logs.push(a.join(' ')) };
    const code = PRELUDE + '\n' + compile(src, { includeRuntime: false });
    new Function('console', '__IO', code)(consoleObj, io);
    setTimeout(() => resolve(logs), 60);
  });
}

// an in-memory backend implementing the same __IO contract
function memoryIO(initial = {}) {
  const files = new Map(Object.entries(initial));
  const ok = v => ({ 'सफल': true, 'मूल्यम्': v, 'दोषः': null });
  const err = e => ({ 'सफल': false, 'मूल्यम्': null, 'दोषः': String(e) });
  return {
    file: {
      async read(p) { return files.has(p) ? ok(files.get(p)) : err('ENOENT: ' + p); },
      async write(p, d) { files.set(p, String(d)); return ok(true); },
      async exists(p) { return ok(files.has(p)); },
      async remove(p) { files.delete(p); return ok(true); },
      async list() { return ok([...files.keys()]); },
    },
    net: {
      async fetch(url) { return ok({ 'स्थितिः': 200, 'पाठः': 'mocked:' + url, 'सफलम्': true }); },
    },
  };
}

(async () => {
  // write then read, against the in-memory backend
  {
    const logs = await runWith(`असमकालिक कार्य m(){
        प्रतीक्षा सञ्चिका.लिख("/x", "नमः")।
        चर r = प्रतीक्षा सञ्चिका.पठ("/x")।
        दर्शय(r.सफल, r.मूल्यम्)।
      } m()।`, memoryIO());
    ok('mem backend: write+read roundtrip', logs[0] === 'true नमः');
  }

  // missing file → Result error, not a throw
  {
    const logs = await runWith(`असमकालिक कार्य m(){
        चर r = प्रतीक्षा सञ्चिका.पठ("/none")।
        दर्शय(r.सफल, r.दोषः)।
      } m()।`, memoryIO());
    ok('mem backend: missing file → Err Result', logs[0].startsWith('false') && /ENOENT/.test(logs[0]));
  }

  // exists returns false (not an error) for absent file
  {
    const logs = await runWith(`असमकालिक कार्य m(){
        चर r = प्रतीक्षा सञ्चिका.विद्यते("/none")।
        दर्शय(r.सफल, r.मूल्यम्)।
      } m()।`, memoryIO());
    ok('mem backend: exists=false is success', logs[0] === 'true false');
  }

  // net.fetch returns a structured Result
  {
    const logs = await runWith(`असमकालिक कार्य m(){
        चर r = प्रतीक्षा जाल.आनय("http://x")।
        दर्शय(r.मूल्यम्.स्थितिः, r.मूल्यम्.पाठः)।
      } m()।`, memoryIO());
    ok('mem backend: fetch returns status+text', logs[0] === '200 mocked:http://x');
  }

  // SAME program runs against the real Node backend
  {
    const dir = mkdtempSync(join(tmpdir(), 'deva-io-'));
    const p = join(dir, 'f.txt');
    const logs = await runWith(`असमकालिक कार्य m(){
        प्रतीक्षा सञ्चिका.लिख("${p}", "विश्वम्")।
        चर r = प्रतीक्षा सञ्चिका.पठ("${p}")।
        दर्शय(r.मूल्यम्)।
        चर e = प्रतीक्षा सञ्चिका.विद्यते("${p}")।
        दर्शय(e.मूल्यम्)।
        प्रतीक्षा सञ्चिका.निष्कासय("${p}")।
        चर e2 = प्रतीक्षा सञ्चिका.विद्यते("${p}")।
        दर्शय(e2.मूल्यम्)।
      } m()।`, nodeIO);
    ok('node backend: write/read/exists/remove', logs.join(',') === 'विश्वम्,true,false');
    rmSync(dir, { recursive: true, force: true });
  }

  // the in-memory and node backends satisfy the same contract shape
  ok('backends share the __IO contract',
     typeof nodeIO.file.read === 'function' && typeof nodeIO.net.fetch === 'function' &&
     typeof memoryIO().file.read === 'function' && typeof memoryIO().net.fetch === 'function');

  // directory listing returns the file names
  {
    const logs = await runWith(`असमकालिक कार्य m(){
        चर r = प्रतीक्षा सञ्चिका.सूचीकृ("/")।
        दर्शय(r.मूल्यम्.दीर्घता)।
      } m()।`, memoryIO({ '/a': '1', '/b': '2', '/c': '3' }));
    ok('list: returns all entries', logs[0] === '3');
  }

  // write overwrites an existing file
  {
    const logs = await runWith(`असमकालिक कार्य m(){
        प्रतीक्षा सञ्चिका.लिख("/x", "प्रथम")।
        प्रतीक्षा सञ्चिका.लिख("/x", "द्वितीय")।
        चर r = प्रतीक्षा सञ्चिका.पठ("/x")।
        दर्शय(r.मूल्यम्)।
      } m()।`, memoryIO());
    ok('write: overwrites existing content', logs[0] === 'द्वितीय');
  }

  // remove then read → error
  {
    const logs = await runWith(`असमकालिक कार्य m(){
        प्रतीक्षा सञ्चिका.लिख("/x", "y")।
        प्रतीक्षा सञ्चिका.निष्कासय("/x")।
        चर r = प्रतीक्षा सञ्चिका.पठ("/x")।
        दर्शय(r.सफल)।
      } m()।`, memoryIO());
    ok('remove: file gone after निष्कासय', logs[0] === 'false');
  }

  // promise-chaining style (.ततः) as an alternative to await
  {
    const logs = await runWith(`सञ्चिका.पठ("/g").ततः(कार्य(r){ दर्शय("chained", r.मूल्यम्)। })।`,
      memoryIO({ '/g': 'सिद्धम्' }));
    ok('promise chaining via ततः works', logs[0] === 'chained सिद्धम्');
  }

  // a fallible pipeline: read → transform → write, propagating errors
  {
    const logs = await runWith(`असमकालिक कार्य प्रतिलिपिः (अतः, प्रति) {
        चर र = प्रतीक्षा सञ्चिका.पठ(अतः)।
        यदि (र.सफल == असत्यम्) { फलम् र। }      # propagate read error
        फलम् प्रतीक्षा सञ्चिका.लिख(प्रति, र.मूल्यम् + "!")।
      }
      असमकालिक कार्य m(){
        चर ok = प्रतीक्षा प्रतिलिपिः("/src", "/dst")।
        दर्शय("copy ok:", ok.सफल)।
        चर r = प्रतीक्षा सञ्चिका.पठ("/dst")।
        दर्शय(r.मूल्यम्)।
        चर bad = प्रतीक्षा प्रतिलिपिः("/missing", "/dst2")।
        दर्शय("bad ok:", bad.सफल)।
      } m()।`, memoryIO({ '/src': 'मूलम्' }));
    ok('pipeline: copy succeeds', logs[0] === 'copy ok: true' && logs[1] === 'मूलम्!');
    ok('pipeline: error propagates', logs[2] === 'bad ok: false');
  }

  console.log(`\n${pass} पास, ${fail} फेल`);
  process.exit(fail ? 1 : 0);
})();
