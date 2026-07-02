// tooling.test.js — source maps + language-server analysis + LSP protocol.
import { compileWithMap } from '../src/index.js';
import { diagnostics, completions, hover, hoverAt, wordAt, VOCAB } from '../src/analyzer.js';
import { parse } from '../src/parser.js';
import { tokenize } from '../src/lexer.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// ---------- source maps ----------
{
  const r = compileWithMap('चर क = ५।\nदर्शय(क)।', { includeRuntime: false });
  ok('compileWithMap returns code + map', typeof r.code === 'string' && r.map);
  ok('source map version 3', r.map.version === 3);
  ok('source map has mappings string', typeof r.map.mappings === 'string' && r.map.mappings.length > 0);
  ok('source map lists a source', r.map.sources.length === 1);
}

// validate VLQ mappings decode to the right lines (without external deps:
// decode the first segment of each generated line ourselves)
{
  const r = compileWithMap('चर अ = १।\nचर ब = २।\nदर्शय(अ)।', { includeRuntime: false });
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function decodeLine(seg) {
    // decode VLQ ints in one segment string
    const vals = []; let shift = 0, val = 0;
    for (const ch of seg) {
      let d = B64.indexOf(ch);
      const cont = d & 32; d &= 31;
      val += d << shift;
      if (cont) { shift += 5; }
      else { const shouldNeg = val & 1; let r = val >> 1; if (shouldNeg) r = -r; vals.push(r); val = 0; shift = 0; }
    }
    return vals;
  }
  const lines = r.map.mappings.split(';');
  // 3 generated lines, each should carry a mapping; srcLine delta accumulates
  let srcLine = 0; const mappedSrcLines = [];
  for (const ln of lines) {
    if (!ln) { continue; }
    const v = decodeLine(ln.split(',')[0]); // [genCol, srcIdx, srcLineDelta, srcColDelta]
    srcLine += v[2];
    mappedSrcLines.push(srcLine + 1); // back to 1-based
  }
  ok('maps to source lines 1,2,3', mappedSrcLines.join(',') === '1,2,3');
}

// ---------- analyzer: diagnostics ----------
ok('diagnostics: clean program → none', diagnostics('चर क = ५।').length === 0);
{
  const d = diagnostics('दर्शय(@)।');
  ok('diagnostics: lex error reported', d.length === 1 && d[0].kind === 'lex');
  ok('diagnostics: has position', d[0].line === 1 && d[0].col === 7);
}
{
  const d = diagnostics('चर = ५।'); // missing name
  ok('diagnostics: parse error reported', d.length === 1 && d[0].severity === 1);
}

// ---------- analyzer: completion ----------
ok('completion: vocabulary is large', VOCAB.length > 100);
ok('completion: empty prefix returns all', completions('').length === VOCAB.length);
{
  const c = completions('वर्');
  ok('completion: prefix filters', c.every(it => it.label.startsWith('वर्')));
  ok('completion: finds वर्णः', c.some(it => it.label === 'वर्णः'));
}
ok('completion: keyword present', completions('चर').some(it => it.kind === 'keyword'));

// ---------- analyzer: hover ----------
ok('hover: style prop', hover('वर्णः').detail === 'color:');
ok('hover: color value', hover('रक्तः').detail === 'crimson');
ok('hover: math method', hover('वर्गमूलम्') && /sqrt/.test(hover('वर्गमूलम्').detail));
ok('hover: keyword', hover('कार्य') && /function/.test(hover('कार्य').doc));
ok('hover: unknown word → null', hover('अपरिचितम्') === null);

// ---------- analyzer: type-aware hover (hoverAt) ----------
// Use the parser's own recorded positions so the columns match the lexer
// exactly (Devanagari clusters make raw string indices unreliable).
{
  const src = [
    'कार्य योग (अ: सङ्ख्या): सङ्ख्या {',   // 1
    '    फलम् अ।',                           // 2
    '}',                                     // 3
    'नियत आधारः: सङ्ख्या = योग(१)।',        // 4
    'नियत माला: गण<अक्षर> = ["क"]।',         // 5
    'दर्शय(आधारः)।',                         // 6
  ].join('\n');
  const a = parse(tokenize(src)); const ast = a.body || a;
  const fn = ast.find(n => n.type === 'FuncDecl');
  const v1 = ast.find(n => n.type === 'VarDecl' && n.name === 'आधारः');
  const v2 = ast.find(n => n.type === 'VarDecl' && n.name === 'माला');
  const useTok = tokenize(src).find(t => t.value === 'आधारः' && t.line === 6);
  const typeAt = pos => (hoverAt(src, pos.line, pos.col) || {}).type;

  ok('hoverAt: typed variable declaration', typeAt(v1.namePos) === 'सङ्ख्या (number)');
  ok('hoverAt: composite गण<अक्षर> type', typeAt(v2.namePos) === 'गण<अक्षर> (array of string)');
  ok('hoverAt: typed parameter', typeAt(fn.paramPos[0]) === 'सङ्ख्या (number)');
  ok('hoverAt: function shows a signature',
     /\(सङ्ख्या\) → सङ्ख्या \(function\)/.test(typeAt(fn.namePos) || ''));
  ok('hoverAt: a reference reports its binding’s type',
     typeAt({ line: 6, col: useTok.col }) === 'सङ्ख्या (number)');
  ok('hoverAt: unannotated binding has no type',
     (() => { const s = 'नियत क = ५।'; const n = (parse(tokenize(s)).body || parse(tokenize(s)))[0];
              return typeAtOf(s, n.namePos) === undefined; })());
  function typeAtOf(s, pos) { return (hoverAt(s, pos.line, pos.col) || {}).type; }
}

// ---------- analyzer: wordAt ----------
{
  const w = wordAt('दर्शय(वर्णः)', 8);
  ok('wordAt: extracts Devanagari run', w.word === 'वर्णः');
}

// ---------- LSP server protocol (spawn + JSON-RPC over stdio) ----------
function lspSession(messages, durationMs = 500) {
  return new Promise(resolve => {
    const srv = spawn('node', [join(root, 'src/server.js')]);
    let buf = Buffer.alloc(0); const out = [];
    srv.stdout.on('data', c => {
      buf = Buffer.concat([buf, c]);
      for (;;) {
        const he = buf.indexOf('\r\n\r\n'); if (he === -1) break;
        const m = /Content-Length:\s*(\d+)/i.exec(buf.slice(0, he).toString());
        if (!m) { buf = buf.slice(he + 4); continue; }
        const len = +m[1], start = he + 4;
        if (buf.length < start + len) break;
        out.push(JSON.parse(buf.slice(start, start + len).toString()));
        buf = buf.slice(start + len);
      }
    });
    const send = msg => { const b = Buffer.from(JSON.stringify(msg)); srv.stdin.write(`Content-Length: ${b.length}\r\n\r\n`); srv.stdin.write(b); };
    for (const m of messages) send(m);
    setTimeout(() => { srv.kill(); resolve(out); }, durationMs);
  });
}

(async () => {
  const responses = await lspSession([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///t.deva', text: 'दर्शय(@)।' } } },
    { jsonrpc: '2.0', id: 2, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///t.deva' }, position: { line: 0, character: 0 } } },
    { jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: 'file:///t.deva' }, contentChanges: [{ text: 'चर क = ५।' }] } },
    { jsonrpc: '2.0', id: 3, method: 'textDocument/hover', params: { textDocument: { uri: 'file:///t.deva' }, position: { line: 0, character: 0 } } },
  ]);

  const init = responses.find(r => r.id === 1);
  ok('LSP: initialize returns capabilities', init && init.result.capabilities.hoverProvider === true);

  const firstDiag = responses.find(r => r.method === 'textDocument/publishDiagnostics');
  ok('LSP: publishes diagnostics on open', firstDiag && firstDiag.params.diagnostics.length === 1);
  ok('LSP: diagnostic has range', firstDiag && firstDiag.params.diagnostics[0].range.start.character === 6);

  const comp = responses.find(r => r.id === 2);
  ok('LSP: completion returns items', comp && comp.result.items.length > 100);

  const allDiags = responses.filter(r => r.method === 'textDocument/publishDiagnostics');
  ok('LSP: diagnostics cleared after fix', allDiags[allDiags.length - 1].params.diagnostics.length === 0);

  const hov = responses.find(r => r.id === 3);
  ok('LSP: hover returns markdown', hov && hov.result && /चर/.test(hov.result.contents.value));

  console.log(`\n${pass} पास, ${fail} फेल`);
  process.exit(fail ? 1 : 0);
})();
