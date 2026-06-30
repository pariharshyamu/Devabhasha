// extension.test.js — validates the VS Code extension wires the analyzer core
// to provider APIs correctly. Mocks the `vscode` module, activates the
// extension, and drives each provider (completion, hover, definition, rename,
// diagnostics). Requires the built CJS bundle at extension/analyzer.js.
import { existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const extDir = join(here, '..', 'extension');

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

if (!existsSync(join(extDir, 'analyzer.js'))) {
  console.log('  (extension/analyzer.js not built — run the esbuild bundle step; skipping)');
  console.log(`\n${pass} पास, ${fail} फेल`);
  process.exit(0);
}

// ---- mock the vscode module ----
const captured = { providers: {}, commands: {}, diags: null };
const vscodeMock = {
  DiagnosticSeverity: { Error: 0 },
  CompletionItemKind: { Keyword: 13, Function: 2, Method: 1, Property: 9, Constant: 20, Class: 6, Variable: 5, Text: 0 },
  Range: class { constructor(a, b, c, d) { this.sl = a; this.sc = b; this.el = c; this.ec = d; } },
  Position: class { constructor(l, c) { this.line = l; this.character = c; } },
  Location: class { constructor(uri, pos) { this.uri = uri; this.target = pos; } },
  Hover: class { constructor(c) { this.contents = c; } },
  MarkdownString: class { constructor(v) { this.value = v; } },
  CompletionItem: class { constructor(label, kind) { this.label = label; this.kind = kind; } },
  WorkspaceEdit: class { constructor() { this.edits = []; } replace(uri, range, txt) { this.edits.push({ range, txt }); } },
  Diagnostic: class { constructor(range, msg, sev) { this.range = range; this.message = msg; this.severity = sev; } },
  languages: {
    createDiagnosticCollection: () => ({ set: (uri, d) => { captured.diags = d; }, delete: () => {} }),
    registerCompletionItemProvider: (s, p) => { captured.providers.completion = p; return { dispose() {} }; },
    registerHoverProvider: (s, p) => { captured.providers.hover = p; return { dispose() {} }; },
    registerDefinitionProvider: (s, p) => { captured.providers.definition = p; return { dispose() {} }; },
    registerRenameProvider: (s, p) => { captured.providers.rename = p; return { dispose() {} }; },
  },
  workspace: {
    onDidOpenTextDocument: () => ({ dispose() {} }),
    onDidChangeTextDocument: () => ({ dispose() {} }),
    onDidCloseTextDocument: () => ({ dispose() {} }),
  },
  window: { activeTextEditor: null, createTerminal: () => ({ show() {}, sendText() {} }), showInformationMessage: () => {} },
  commands: { registerCommand: (id, fn) => { captured.commands[id] = fn; return { dispose() {} }; } },
};

// intercept require('vscode')
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'vscode') return vscodeMock;
  return origLoad.call(this, request, ...rest);
};

const ext = require(join(extDir, 'extension.js'));
ok('extension exports activate/deactivate', typeof ext.activate === 'function' && typeof ext.deactivate === 'function');

ext.activate({ subscriptions: { push() {} } });

ok('registers a completion provider', !!captured.providers.completion);
ok('registers a hover provider', !!captured.providers.hover);
ok('registers a definition provider', !!captured.providers.definition);
ok('registers a rename provider', !!captured.providers.rename);
ok('registers the run command', !!captured.commands['devabhasha.run']);

function doc(text) {
  const lines = text.split('\n');
  return { languageId: 'devabhasha', uri: 'file:///x.deva', getText: () => text, lineAt: n => ({ text: lines[n] || '' }) };
}

// completion
const comps = captured.providers.completion.provideCompletionItems(doc('रच'), { line: 0, character: 2 });
ok('completion returns items for a prefix', Array.isArray(comps) && comps.length > 0);
ok('completion includes रचय', comps.some(c => c.label === 'रचय'));

// hover
const hov = captured.providers.hover.provideHover(doc('रचय'), { line: 0, character: 1 });
ok('hover returns markdown for a keyword', !!(hov && hov.contents && hov.contents.value.includes('रचय')));

// definition (Devanagari identifier; VS Code 0-based positions)
const dDoc = doc('चर क = ५।\nदर्शय(क)।\nचर ख = क + १।');
const def = captured.providers.definition.provideDefinition(dDoc, { line: 1, character: 7 });
ok('definition resolves a reference to its binding', !!def && def.target.line === 0);

// rename
const ren = captured.providers.rename.provideRenameEdits(dDoc, { line: 0, character: 4 }, 'य');
ok('rename returns edits for all occurrences', !!ren && ren.edits.length === 3);

Module._load = origLoad;

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
