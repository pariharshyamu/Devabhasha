// extension.js — Devabhāṣā VS Code extension.
//
// Wires the SAME dependency-free analyzer core (analyzer.js — the engine behind
// src/server.js) directly to VS Code's provider APIs, in-process. The LSP server
// and this extension are two frontends over one analyzer, so behaviour matches
// exactly, with no bundled language-client dependency and no child process.
//
// NOTE: the analyzer uses 1-based line/column; VS Code is 0-based. The same ±1
// conversions the stdio server applies are applied here.

const vscode = require('vscode');
const analyzer = require('./analyzer.js');

const SELECTOR = { language: 'devabhasha' };

let diagCollection;

function refreshDiagnostics(doc) {
  if (!doc || doc.languageId !== 'devabhasha') return;
  const diags = (analyzer.diagnostics(doc.getText()) || []).map(d => {
    const startLine = d.line - 1, startCh = d.col - 1;
    const endCh = (d.endCol || d.col + 1) - 1;
    const range = new vscode.Range(startLine, startCh, startLine, endCh);
    return new vscode.Diagnostic(range, d.message, vscode.DiagnosticSeverity.Error);
  });
  diagCollection.set(doc.uri, diags);
}

function activate(context) {
  diagCollection = vscode.languages.createDiagnosticCollection('devabhasha');
  context.subscriptions.push(diagCollection);

  if (vscode.window.activeTextEditor) refreshDiagnostics(vscode.window.activeTextEditor.document);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refreshDiagnostics),
    vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document)),
    vscode.workspace.onDidCloseTextDocument(doc => diagCollection.delete(doc.uri))
  );

  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(SELECTOR, {
    provideCompletionItems(doc, pos) {
      const lineText = doc.lineAt(pos.line).text;
      const { word, start } = analyzer.wordAt(lineText, pos.character);
      const cursorInWord = Math.max(0, pos.character - start);
      const prefix = (word || '').slice(0, cursorInWord);
      return (analyzer.completions(prefix) || []).map(c => {
        const item = new vscode.CompletionItem(c.label, mapKind(c.kind));
        if (c.detail) item.detail = c.detail;
        if (c.doc) item.documentation = c.doc;
        return item;
      });
    }
  }));

  context.subscriptions.push(vscode.languages.registerHoverProvider(SELECTOR, {
    provideHover(doc, pos) {
      const lineText = doc.lineAt(pos.line).text;
      const { word } = analyzer.wordAt(lineText, pos.character);
      if (!word) return null;
      const h = analyzer.hover(word);
      if (!h) return null;
      const md = new vscode.MarkdownString(`**${h.label}** — ${h.detail}\n\n${h.doc}`);
      return new vscode.Hover(md);
    }
  }));

  context.subscriptions.push(vscode.languages.registerDefinitionProvider(SELECTOR, {
    provideDefinition(doc, pos) {
      const def = analyzer.definition(doc.getText(), pos.line + 1, pos.character + 1);
      if (!def) return null;
      return new vscode.Location(doc.uri, new vscode.Position(def.line - 1, def.col - 1));
    }
  }));

  context.subscriptions.push(vscode.languages.registerRenameProvider(SELECTOR, {
    provideRenameEdits(doc, pos, newName) {
      const occ = analyzer.renameOccurrences(doc.getText(), pos.line + 1, pos.character + 1);
      if (!occ || !occ.length) return null;
      const edit = new vscode.WorkspaceEdit();
      for (const o of occ) {
        const range = new vscode.Range(o.line - 1, o.col - 1, o.line - 1, o.col - 1 + o.name.length);
        edit.replace(doc.uri, range, newName);
      }
      return edit;
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('devabhasha.run', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'devabhasha') {
      vscode.window.showInformationMessage('Open a .deva file to run it.');
      return;
    }
    const term = vscode.window.createTerminal('Devabhāṣā');
    term.show();
    term.sendText(`devabhasha run "${editor.document.fileName}"`);
  }));
}

function mapKind(kind) {
  const K = vscode.CompletionItemKind;
  switch (kind) {
    case 'keyword': return K.Keyword;
    case 'function': return K.Function;
    case 'method': return K.Method;
    case 'property': return K.Property;
    case 'constant': return K.Constant;
    case 'class': return K.Class;
    case 'variable': return K.Variable;
    default: return K.Text;
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
