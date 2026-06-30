// symbols.test.js — scope-aware symbol table, go-to-definition, rename.
import { buildSymbols, definitionAt, occurrencesAt } from '../src/symbols.js';
import { definition, renameOccurrences } from '../src/analyzer.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// helper: occurrences as a comparable "line:col" set
const locs = arr => arr.map(o => `${o.line}:${o.col}`).sort().join(',');

// ---------- basic binding & references ----------
{
  const src = 'चर क = ५।\nदर्शय(क)।\nचर ख = क + १।';
  const { bindings, references } = buildSymbols(src);
  ok('records the binding', bindings.some(b => b.name === 'क' && b.line === 1));
  ok('records both references', references.filter(r => r.name === 'क').length === 2);
  ok('references resolve to the binding',
     references.filter(r => r.name === 'क').every(r => r.binding && r.binding.line === 1));
}

// ---------- go-to-definition ----------
{
  const src = 'चर क = ५।\nदर्शय(क)।';
  const def = definitionAt(src, 2, 8);   // क reference on line 2
  ok('definition points to the binding', def && def.line === 1 && def.col === 5);
}
{
  const src = 'कार्य द्वि (न) {\n  फलम् न * २।\n}';
  const def = definitionAt(src, 2, 9);   // न used inside the body
  ok('parameter definition resolves', def && def.line === 1 && def.name === 'न');
}

// ---------- rename: all occurrences ----------
{
  const src = 'चर क = ५।\nदर्शय(क)।\nचर ख = क + १।';
  const occ = occurrencesAt(src, 1, 5);  // on the binding
  ok('rename gathers binding + all refs', occ.length === 3);
}

// ---------- shadowing: the hard case ----------
{
  const src = 'चर क = १।\nकार्य f (क) {\n  दर्शय(क)।\n  फलम् क + १।\n}\nदर्शय(क)।';
  // parameter क (line 2) + its two uses (lines 3,4) — NOT the outer or line-6 use
  const paramOcc = occurrencesAt(src, 2, 11);
  ok('shadow: parameter group has 3 occurrences', paramOcc.length === 3);
  ok('shadow: parameter group excludes outer use',
     !paramOcc.some(o => o.line === 6));
  // outer क (line 1) + only the line-6 use
  const outerOcc = occurrencesAt(src, 1, 5);
  ok('shadow: outer group is binding + line-6 use', locs(outerOcc) === locs([{line:1,col:5},{line:6,col:8}]));
  ok('shadow: outer group excludes shadowed inner uses',
     !outerOcc.some(o => o.line === 3 || o.line === 4));
}

// ---------- loop variable scoping ----------
{
  const src = 'चर कुल = ०।\nप्रत्येकम् (x : सूची) {\n  कुल += x।\n}';
  const def = definitionAt(src, 3, 11);  // x inside the loop body
  ok('loop variable resolves to the loop binding', def && def.name === 'x' && def.line === 2);
}

// ---------- function name is renamable ----------
{
  const src = 'कार्य अभिवादन () { फलम् "नमः"। }\nदर्शय(अभिवादन())।';
  const occ = occurrencesAt(src, 1, 14);  // on the function name
  ok('function name + call site rename together', occ.length === 2);
}

// ---------- analyzer wrappers ----------
{
  const src = 'चर क = ५।\nदर्शय(क)।';
  ok('analyzer.definition wrapper', definition(src, 2, 8).line === 1);
  ok('analyzer.renameOccurrences wrapper', renameOccurrences(src, 1, 5).length === 2);
}

// ---------- syntactically broken source degrades gracefully ----------
ok('broken source → empty symbols, no throw',
   buildSymbols('चर = ।').ok === false);

// ---------- LSP protocol round-trip ----------
function lsp(messages, ms = 500) {
  return new Promise(resolve => {
    const srv = spawn('node', [join(root, 'src/server.js')]);
    let buf = Buffer.alloc(0); const out = [];
    srv.stdout.on('data', c => { buf = Buffer.concat([buf, c]);
      for (;;) { const he = buf.indexOf('\r\n\r\n'); if (he === -1) break;
        const m = /Content-Length:\s*(\d+)/i.exec(buf.slice(0, he).toString());
        const len = +m[1], st = he + 4; if (buf.length < st + len) break;
        out.push(JSON.parse(buf.slice(st, st + len).toString())); buf = buf.slice(st + len); } });
    const send = msg => { const b = Buffer.from(JSON.stringify(msg)); srv.stdin.write(`Content-Length: ${b.length}\r\n\r\n`); srv.stdin.write(b); };
    for (const m of messages) send(m);
    setTimeout(() => { srv.kill(); resolve(out); }, ms);
  });
}

(async () => {
  const text = 'चर क = ५।\nदर्शय(क)।\nचर ख = क + १।';
  const responses = await lsp([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///t.deva', text } } },
    { jsonrpc: '2.0', id: 2, method: 'textDocument/definition', params: { textDocument: { uri: 'file:///t.deva' }, position: { line: 1, character: 7 } } },
    { jsonrpc: '2.0', id: 3, method: 'textDocument/rename', params: { textDocument: { uri: 'file:///t.deva' }, position: { line: 0, character: 4 }, newName: 'ग' } },
  ]);
  const cap = responses.find(r => r.id === 1).result.capabilities;
  ok('LSP advertises definition + rename', cap.definitionProvider && cap.renameProvider);
  const def = responses.find(r => r.id === 2);
  ok('LSP definition → binding line 0', def.result && def.result.range.start.line === 0);
  const ren = responses.find(r => r.id === 3);
  ok('LSP rename → 3 edits', ren.result.changes['file:///t.deva'].length === 3);
  ok('LSP rename uses the new name', ren.result.changes['file:///t.deva'][0].newText === 'ग');

  console.log(`\n${pass} पास, ${fail} फेल`);
  process.exit(fail ? 1 : 0);
})();
