#!/usr/bin/env node
// server.js — a Language Server (LSP) for Devabhāṣā, over stdio.
//
// Speaks the Language Server Protocol: Content-Length framed JSON-RPC on
// stdin/stdout. Supports:
//   • textDocument/publishDiagnostics  — compile errors as you type
//   • textDocument/completion          — keywords, stdlib, style vocab, tags
//   • textDocument/hover               — what a Sanskrit word means
//
// Editor-agnostic: any LSP client (VS Code, Neovim, etc.) can connect by
// running `node src/server.js`. The analysis itself lives in analyzer.js;
// this file is purely the protocol.

import { diagnostics, completions, hover, hoverAt, wordAt, definition, renameOccurrences } from './analyzer.js';

// ---- LSP completion-item kinds (subset) ----
const CIK = { keyword: 14, method: 2, property: 10, constant: 21, function: 3,
              field: 5, value: 12, tag: 7, event: 23 };

// open documents: uri → text
const docs = new Map();

// ---- JSON-RPC / LSP framing ----
let buffer = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const header = buffer.slice(0, headerEnd).toString('utf8');
    const m = /Content-Length:\s*(\d+)/i.exec(header);
    if (!m) { buffer = buffer.slice(headerEnd + 4); continue; }
    const len = parseInt(m[1], 10);
    const start = headerEnd + 4;
    if (buffer.length < start + len) return; // wait for more
    const body = buffer.slice(start, start + len).toString('utf8');
    buffer = buffer.slice(start + len);
    try { handle(JSON.parse(body)); } catch (e) { /* ignore malformed */ }
  }
});

function send(msg) {
  const json = JSON.stringify(msg);
  const buf = Buffer.from(json, 'utf8');
  process.stdout.write(`Content-Length: ${buf.length}\r\n\r\n`);
  process.stdout.write(buf);
}
function reply(id, result) { send({ jsonrpc: '2.0', id, result }); }
function notify(method, params) { send({ jsonrpc: '2.0', method, params }); }

// ---- diagnostics: compute + publish for a document ----
function publishDiagnostics(uri) {
  const text = docs.get(uri) || '';
  const diags = diagnostics(text).map(d => ({
    range: {
      start: { line: d.line - 1, character: d.col - 1 },
      end:   { line: d.line - 1, character: (d.endCol || d.col + 1) - 1 },
    },
    severity: d.severity || 1,
    source: 'devabhasha',
    message: d.message,
  }));
  notify('textDocument/publishDiagnostics', { uri, diagnostics: diags });
}

// ---- get the word at an LSP position ----
function wordAtPosition(uri, position) {
  const text = docs.get(uri) || '';
  const lines = text.split('\n');
  const lineText = lines[position.line] || '';
  return wordAt(lineText, position.character);
}

// ---- request/notification dispatch ----
function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize':
      reply(id, {
        capabilities: {
          textDocumentSync: 1,                 // full document sync
          completionProvider: { triggerCharacters: [] },
          hoverProvider: true,
          definitionProvider: true,
          renameProvider: true,
        },
        serverInfo: { name: 'devabhasha-language-server', version: '1.0.0' },
      });
      break;

    case 'initialized':
      break;

    case 'textDocument/didOpen': {
      const { uri, text } = params.textDocument;
      docs.set(uri, text);
      publishDiagnostics(uri);
      break;
    }
    case 'textDocument/didChange': {
      const uri = params.textDocument.uri;
      // full sync: last change holds the whole document
      const text = params.contentChanges[params.contentChanges.length - 1].text;
      docs.set(uri, text);
      publishDiagnostics(uri);
      break;
    }
    case 'textDocument/didClose':
      docs.delete(params.textDocument.uri);
      notify('textDocument/publishDiagnostics', { uri: params.textDocument.uri, diagnostics: [] });
      break;

    case 'textDocument/completion': {
      const { word, start } = wordAtPosition(params.textDocument.uri, params.position);
      // complete on the prefix up to the cursor
      const cursorInWord = Math.max(0, params.position.character - start);
      const prefix = word.slice(0, cursorInWord);
      const items = completions(prefix).map(it => ({
        label: it.label,
        kind: CIK[it.kind] || 1,
        detail: it.detail,
        documentation: it.doc,
      }));
      reply(id, { isIncomplete: false, items });
      break;
    }

    case 'textDocument/hover': {
      const text = docs.get(params.textDocument.uri) || '';
      // position-aware: enrich the word's meaning with its declared type
      const h = hoverAt(text, params.position.line + 1, params.position.character + 1);
      if (!h) { reply(id, null); break; }
      const typeLine = h.type ? `\n\n\`${h.type}\`` : '';
      reply(id, {
        contents: { kind: 'markdown', value: `**${h.label}** — ${h.detail}\n\n${h.doc}${typeLine}` },
      });
      break;
    }

    case 'textDocument/definition': {
      const uri = params.textDocument.uri;
      const text = docs.get(uri) || '';
      // LSP positions are 0-based; the symbol table is 1-based
      const def = definition(text, params.position.line + 1, params.position.character + 1);
      if (!def) { reply(id, null); break; }
      reply(id, {
        uri,
        range: {
          start: { line: def.line - 1, character: def.col - 1 },
          end:   { line: def.line - 1, character: def.col - 1 + def.name.length },
        },
      });
      break;
    }

    case 'textDocument/rename': {
      const uri = params.textDocument.uri;
      const text = docs.get(uri) || '';
      const newName = params.newName;
      const occ = renameOccurrences(text, params.position.line + 1, params.position.character + 1);
      if (!occ.length) { reply(id, null); break; }
      const edits = occ.map(o => ({
        range: {
          start: { line: o.line - 1, character: o.col - 1 },
          end:   { line: o.line - 1, character: o.col - 1 + o.name.length },
        },
        newText: newName,
      }));
      reply(id, { changes: { [uri]: edits } });
      break;
    }

    case 'shutdown':
      reply(id, null);
      break;
    case 'exit':
      process.exit(0);
      break;

    default:
      // unknown request → null result so clients don't hang
      if (id !== undefined) reply(id, null);
  }
}
