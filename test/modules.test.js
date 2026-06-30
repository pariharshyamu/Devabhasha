// modules.test.js — आयात / निर्यात module system (compile-time bundler).
import { bundle, buildGraph } from '../src/bundler.js';
import { compileModule } from '../src/index.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// run a bundled program (no DOM) and capture console output
function runBundle(entryPath) {
  const code = bundle(entryPath, { includeRuntime: false });
  const logs = [];
  const __DB = new Proxy({}, { get: () => () => { throw new Error('no DOM'); } });
  const console = { log: (...a) => logs.push(a.join(' ')) };
  new Function('__DB', 'console', code)(__DB, console);
  return logs;
}

// scratch dir with helper to write modules
const dir = mkdtempSync(join(tmpdir(), 'deva-mod-'));
const mod = (name, src) => { writeFileSync(join(dir, name + '.deva'), src, 'utf8'); return join(dir, name + '.deva'); };

// ---------- compileModule metadata ----------
{
  const m = compileModule('निर्यात कार्य द्वि(न){ फलम् न*२। } चर ख = ५।');
  ok('compileModule returns code', typeof m.code === 'string');
  ok('records exported name', m.exports.includes('द्वि'));
  ok('does not export non-exported', !m.exports.includes('ख'));
}
{
  const m = compileModule('आयात { अ, ब } आ "गणित"।');
  ok('records import', m.imports.length === 1 && m.imports[0].kind === 'named');
  ok('records imported names', m.imports[0].names.join(',') === 'अ,ब');
}

// ---------- named imports across files ----------
mod('lib', `
निर्यात नियत पाई = ३।
निर्यात कार्य द्वि (न) { फलम् न * २। }
कार्य गुप्तम् () { फलम् "x"। }    # not exported
`);
{
  const entry = mod('a', `आयात { द्वि } आ "lib"। दर्शय(द्वि(५))।`);
  ok('named import runs', runBundle(entry)[0] === '10');
}

// non-exported names are NOT importable (private)
{
  const entry = mod('a2', `आयात { गुप्तम् } आ "lib"। दर्शय("ran")।`);
  // गुप्तम् is undefined (not exported) → calling would throw, but binding to
  // undefined is allowed; the point is it's not in the export object.
  const g = buildGraph(mod('a2b', `आयात { द्वि } आ "lib"।`));
  const libPath = [...g.modules.keys()].find(p => p.endsWith('lib.deva'));
  ok('private name not exported', !g.modules.get(libPath).exports.includes('गुप्तम्'));
}

// ---------- namespace import ----------
{
  const entry = mod('ns', `आयात * रूपेण ग आ "lib"। दर्शय(ग.पाई, ग.द्वि(७))।`);
  ok('namespace import', runBundle(entry)[0] === '3 14');
}

// ---------- multiple named imports ----------
{
  const entry = mod('multi', `आयात { पाई, द्वि } आ "lib"। दर्शय(पाई, द्वि(पाई))।`);
  ok('multiple named imports', runBundle(entry)[0] === '3 6');
}

// ---------- transitive dependencies (a → b → c) ----------
mod('base', `निर्यात कार्य मूल () { फलम् १००। }`);
mod('mid', `आयात { मूल } आ "base"। निर्यात कार्य द्विगुण () { फलम् मूल() * २। }`);
{
  const entry = mod('top', `आयात { द्विगुण } आ "mid"। दर्शय(द्विगुण())।`);
  ok('transitive dependency', runBundle(entry)[0] === '200');
}

// dependency-first ordering in the graph
{
  const g = buildGraph(mod('top2', `आयात { द्विगुण } आ "mid"।`));
  const order = g.order.map(p => p.split('/').pop());
  ok('topological order (base before mid before top)',
     order.indexOf('base.deva') < order.indexOf('mid.deva') &&
     order.indexOf('mid.deva') < order.indexOf('top2.deva'));
}

// ---------- diamond dependency (shared module compiled once) ----------
mod('shared', `निर्यात नियत मूल्यम् = ७।`);
mod('left', `आयात { मूल्यम् } आ "shared"। निर्यात कार्य वाम () { फलम् मूल्यम् + १। }`);
mod('right', `आयात { मूल्यम् } आ "shared"। निर्यात कार्य दक्षिण () { फलम् मूल्यम् + २। }`);
{
  const entry = mod('diamond', `आयात { वाम } आ "left"। आयात { दक्षिण } आ "right"। दर्शय(वाम(), दक्षिण())।`);
  const g = buildGraph(entry);
  const sharedCount = [...g.modules.keys()].filter(p => p.endsWith('shared.deva')).length;
  ok('diamond: shared compiled once', sharedCount === 1);
  ok('diamond: both sides resolve', runBundle(entry)[0] === '8 9');
}

// ---------- error: missing module ----------
{
  const entry = mod('bad', `आयात { x } आ "नास्ति"।`);
  let threw = false;
  try { bundle(entry, { includeRuntime: false }); } catch (e) { threw = /not found/.test(e.message); }
  ok('missing module errors', threw);
}

// ---------- error: exporting a non-declaration ----------
{
  let threw = false;
  try { compileModule('निर्यात दर्शय("x")।'); } catch (e) { threw = /निर्यातदोषः/.test(e.message); }
  ok('export of non-declaration errors', threw);
}

// ---------- side-effect import runs the module ----------
mod('sidefx', `दर्शय("side effect ran")।`);
{
  const entry = mod('se', `आयात "sidefx"। दर्शय("main")।`);
  const logs = runBundle(entry);
  ok('side-effect import runs dependency first',
     logs[0] === 'side effect ran' && logs[1] === 'main');
}

// ---------- exporting different declaration kinds ----------
mod('kinds', `
निर्यात नियत स्थिरः = ४२।
निर्यात चर चलः = १०।
निर्यात कार्य कार्यम् () { फलम् "f"। }
निर्यात रूपनाम शैली = रूप { वर्णः: रक्तः }।
`);
{
  const g = buildGraph(mod('kinds2', `आयात { स्थिरः } आ "kinds"।`));
  const kp = [...g.modules.keys()].find(p => p.endsWith('kinds.deva'));
  const ex = g.modules.get(kp).exports;
  ok('exports const, let, func, style',
     ex.includes('स्थिरः') && ex.includes('चलः') && ex.includes('कार्यम्') && ex.includes('शैली'));
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
