// symbols.js — a scope-aware symbol table over the AST.
//
// Powers go-to-definition and rename in the language server. It walks the AST
// tracking lexical scopes: every binding (चर/नियत/कार्य/भाव/रूपनाम, function
// parameters, प्रत्येकम् loop variables) records its name and source position,
// and every Identifier reference is resolved to the binding it sees under
// normal shadowing rules. The result lets us answer:
//   • definitionOf(line, col)  → where the name at this position is bound
//   • referencesOf(binding)    → every occurrence bound to THAT binding
//
// Positions are 1-based (line, col), matching the lexer/parser.

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { isMatchPattern, patternBindings, patternConstraints } from './patterns.js';

// A Scope maps a name → binding record. Bindings live in the scope where the
// declaration appears; lookups walk outward to enclosing scopes.
function makeScope(parent) {
  return { parent, names: new Map() };
}
function declare(scope, name, binding) {
  scope.names.set(name, binding);
}
function resolve(scope, name) {
  for (let s = scope; s; s = s.parent) {
    if (s.names.has(name)) return s.names.get(name);
  }
  return null;
}

// Build the symbol table. Returns { bindings, references }:
//   bindings   — array of { name, line, col, id }
//   references — array of { name, line, col, binding|null }
export function buildSymbols(source) {
  let ast;
  try { ast = parse(tokenize(source)); }
  catch { return { bindings: [], references: [], ok: false }; }

  const bindings = [];
  const references = [];
  let nextId = 0;

  const addBinding = (name, pos, scope) => {
    if (!pos) return null;
    const b = { name, line: pos.line, col: pos.col, id: nextId++ };
    bindings.push(b);
    declare(scope, name, b);
    return b;
  };
  const addRef = (name, pos, scope) => {
    if (!pos) return;
    references.push({ name, line: pos.line, col: pos.col, binding: resolve(scope, name) });
  };

  // walk an expression, recording references
  function walkExpr(node, scope) {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'Identifier':
        addRef(node.name, { line: node.line, col: node.col }, scope);
        return;
      case 'FuncExpr': {
        const fscope = makeScope(scope);
        (node.params || []).forEach((p, i) =>
          addBinding(p, node.params.__pos && node.params.__pos[i], fscope));
        walkBlock(node.body, fscope);
        return;
      }
      case 'Member':
        walkExpr(node.object, scope);
        if (node.computed) walkExpr(node.property, scope);
        // non-computed property is not a reference to a binding
        return;
      default:
        // generic structural walk over child nodes/arrays
        for (const k of Object.keys(node)) {
          if (k === 'line' || k === 'col' || k === 'namePos' || k === 'paramPos') continue;
          const v = node[k];
          if (Array.isArray(v)) v.forEach(c => walkExpr(c, scope));
          else if (v && typeof v === 'object' && v.type) walkExpr(v, scope);
        }
    }
  }

  // walk a block/body (array of statements or a {body:[]} node) in a NEW scope
  function walkBlock(block, scope) {
    const body = Array.isArray(block) ? block : (block && block.body) || [];
    for (const s of body) walkStmt(s, scope);
  }

  function walkStmt(node, scope) {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'VarDecl':
        if (node.init) walkExpr(node.init, scope);  // init sees the OUTER scope
        if (node.pattern) {
          // destructuring binds each pattern name at its own position
          if (node.pattern.kind === 'array')
            node.pattern.names.forEach(n => addBinding(n.name, { line: n.line, col: n.col }, scope));
          else
            node.pattern.props.forEach(p => addBinding(p.alias, { line: p.line, col: p.col }, scope));
        } else {
          addBinding(node.name, node.namePos, scope);
        }
        return;
      case 'StateDecl':
        if (node.init) walkExpr(node.init, scope);
        addBinding(node.name, node.namePos, scope);
        return;
      case 'StyleDecl':
        addBinding(node.name, node.namePos, scope);
        (node.pairs || []).forEach(p => p.value && p.value.kind === 'expr' && walkExpr(p.value.value, scope));
        return;
      case 'FuncDecl': {
        addBinding(node.name, node.namePos, scope);   // function name in outer scope
        const fscope = makeScope(scope);
        (node.params || []).forEach((p, i) =>
          addBinding(p, node.paramPos && node.paramPos[i], fscope));
        walkBlock(node.body, fscope);
        return;
      }
      case 'ForOf': {
        walkExpr(node.iterable, scope);
        const lscope = makeScope(scope);
        addBinding(node.item, node.namePos, lscope);
        walkBlock(node.body, lscope);
        return;
      }
      case 'Block':
        walkBlock(node.body, makeScope(scope));
        return;
      case 'If':
        walkExpr(node.test, scope);
        node.consequent && walkBlock(node.consequent.body || node.consequent, makeScope(scope));
        node.alternate && walkBlock(node.alternate.body || node.alternate, makeScope(scope));
        return;
      case 'While':
        walkExpr(node.test, scope);
        node.body && walkBlock(node.body.body || node.body, makeScope(scope));
        return;
      case 'Switch':
        walkExpr(node.discriminant, scope);
        (node.cases || []).forEach(c => {
          const cscope = makeScope(scope);
          for (const t of (c.tests || [])) {
            // a pattern binds names (at their own positions) and constrains
            // with value expressions; a plain value test is just an expression.
            if (isMatchPattern(t)) {
              patternConstraints(t).forEach(e => walkExpr(e, scope));
              patternBindings(t).forEach(b => addBinding(b.name, { line: b.line, col: b.col }, cscope));
            } else {
              walkExpr(t, scope);
            }
          }
          walkBlock(c.body, cscope);
        });
        return;
      case 'Export':
        walkStmt(node.decl, scope);
        return;
      case 'View':
        node.container && walkExpr(node.container, scope);
        node.body && walkBlock(node.body.body || node.body, makeScope(scope));
        return;
      case 'ExpressionStatement':
        walkExpr(node.expression, scope);
        return;
      default:
        // structural fallback: walk children as expressions
        for (const k of Object.keys(node)) {
          if (k === 'line' || k === 'col' || k === 'namePos' || k === 'paramPos') continue;
          const v = node[k];
          if (Array.isArray(v)) v.forEach(c => c && c.type && walkExpr(c, scope));
          else if (v && typeof v === 'object' && v.type) walkExpr(v, scope);
        }
    }
  }

  const top = makeScope(null);
  walkBlock(ast, top);
  // compound assignment (x += y) desugars to x = x + y, which visits the
  // target identifier twice; dedup references sharing an exact position.
  const seen = new Set();
  const deduped = references.filter(r => {
    const key = r.name + '@' + r.line + ':' + r.col;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return { bindings, references: deduped, ok: true };
}

// Find the binding referenced at (line, col): either a reference sitting on
// that position, or a binding declared there. Returns the binding record.
export function definitionAt(source, line, col) {
  const { bindings, references } = buildSymbols(source);
  // a reference whose span covers the position?
  const ref = references.find(r => r.line === line && col >= r.col && col < r.col + r.name.length);
  if (ref) return ref.binding || null;
  // already on a binding?
  const b = bindings.find(b => b.line === line && col >= b.col && col < b.col + b.name.length);
  return b || null;
}

// All occurrences (the binding + every reference bound to it) for the symbol
// at (line, col). Returns an array of { line, col, name } edit locations.
export function occurrencesAt(source, line, col) {
  const { bindings, references } = buildSymbols(source);
  // resolve the target binding from the cursor
  let target = null;
  const ref = references.find(r => r.line === line && col >= r.col && col < r.col + r.name.length);
  if (ref) target = ref.binding;
  if (!target) target = bindings.find(b => b.line === line && col >= b.col && col < b.col + b.name.length);
  if (!target) return [];
  const out = [{ line: target.line, col: target.col, name: target.name }];
  for (const r of references) {
    if (r.binding && r.binding.id === target.id) out.push({ line: r.line, col: r.col, name: r.name });
  }
  return out;
}
