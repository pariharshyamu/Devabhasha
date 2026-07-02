// semantics.js — a lightweight semantic-analysis pass over the AST.
//
// The lexer/parser catch syntax; this catches a class of *meaning* bugs that
// still parse: referencing a name that is never bound, code that can never run
// (after फलम्/भङ्ग/अनुवृत्तम्), and calling a locally-defined function with the
// wrong number of arguments. It produces diagnostics (warnings), never throws,
// and never blocks compilation — a purely additive editor aid.
//
// Design notes on avoiding false positives:
//  • Scopes HOIST: every binding in a scope is visible throughout it, so
//    forward references (mutual recursion, a function called before its
//    declaration) are fine.
//  • Known Sanskrit globals (संकेताक्षर, गणित, आवली …) and style/color words
//    (रक्तः, नीलः …, which appear bare inside रूप value expressions) are always
//    treated as resolved.
//  • Arity is checked only for names bound to a नियत/कार्य function whose param
//    count is fixed and known — never for reassignable चर bindings, imports, or
//    globals, whose target we can't pin down statically.

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { GLOBALS } from './stdlib.js';
import { STYLE_VALUES } from './style.js';
import { KARAKA_NAME_SA } from './vibhakti.js';
import { isMatchPattern, patternBindings, patternConstraints } from './patterns.js';

const KNOWN_GLOBALS = new Set(Object.keys(GLOBALS));
const STYLE_WORDS = new Set(Object.keys(STYLE_VALUES));

// severities match the LSP / analyzer convention: 1 = error, 2 = warning.
const WARNING = 2;

export function semanticDiagnostics(source) {
  let ast;
  try { ast = parse(tokenize(source)); }
  catch { return []; }              // parse errors are the parser's job

  const diags = [];
  const warn = (pos, message, kind) => {
    if (!pos || pos.line == null) return;
    diags.push({ line: pos.line, col: pos.col, endCol: pos.col + 1, message, kind, severity: WARNING });
  };

  // A scope: name → { arity } (arity present only for fixed-arity functions).
  const makeScope = parent => ({ parent, names: new Map() });
  const declare = (scope, name, info = {}) => { if (name) scope.names.set(name, info); };
  const lookup = (scope, name) => {
    for (let s = scope; s; s = s.parent) if (s.names.has(name)) return s.names.get(name);
    return null;
  };
  const isKnown = (scope, name) =>
    lookup(scope, name) != null || KNOWN_GLOBALS.has(name) || STYLE_WORDS.has(name);

  // the local names a destructuring pattern binds.
  const patternNames = pattern =>
    pattern.kind === 'array' ? pattern.names.map(n => n.name)
                             : pattern.props.map(p => p.alias);

  // arity of a declaration whose value is a fixed-param function, else null.
  const fnArity = node => {
    if (!node) return null;
    if (node.type === 'FuncDecl') return node.params.length;
    if (node.type === 'VarDecl' && node.kind === 'CONST' && node.init &&
        node.init.type === 'FuncExpr') return node.init.params.length;
    return null;
  };

  // Pre-declare every binding a statement list introduces (hoisting), so the
  // subsequent walk resolves forward references.
  const hoist = (statements, scope) => {
    for (const s of statements) {
      if (!s || typeof s !== 'object') continue;
      const decl = s.type === 'Export' ? s.decl : s;
      switch (decl.type) {
        case 'VarDecl':
          if (decl.pattern) patternNames(decl.pattern).forEach(n => declare(scope, n));
          else declare(scope, decl.name, { arity: fnArity(decl) ?? undefined });
          break;
        case 'StateDecl': case 'StyleDecl':
          declare(scope, decl.name, { arity: fnArity(decl) ?? undefined });
          break;
        case 'FuncDecl':
          declare(scope, decl.name, { arity: decl.params.length });
          break;
        case 'Import':
          if (decl.kind === 'named') (decl.names || []).forEach(n => declare(scope, n));
          else if (decl.kind === 'namespace') declare(scope, decl.alias);
          break;
      }
    }
  };

  const walkBody = (block, scope) => {
    const body = Array.isArray(block) ? block : (block && block.body) || [];
    hoist(body, scope);
    // unreachable-code: once a terminator is seen, the rest of this list is dead.
    let deadFrom = null;
    for (const s of body) {
      if (deadFrom == null && s && ['Return', 'Break', 'Continue'].includes(s.type)) {
        deadFrom = s.type;
      } else if (deadFrom != null && s) {
        warn(stmtPos(s), `अगम्यसंहिता (unreachable code — follows ${termWord(deadFrom)})`, 'unreachable');
        deadFrom = 'reported';      // report only the first dead statement
      }
      walkStmt(s, scope);
    }
  };

  function walkStmt(node, scope) {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'VarDecl': case 'StateDecl':
        if (node.init) walkExpr(node.init, scope);
        return;                       // name already hoisted
      case 'StyleDecl':
        (node.pairs || []).forEach(p => p.value?.kind === 'expr' && walkExpr(p.value.value, scope));
        return;
      case 'FuncDecl': {
        const fscope = makeScope(scope);
        node.params.forEach(p => declare(fscope, p));
        walkBody(node.body, fscope);
        return;
      }
      case 'ForOf': {
        walkExpr(node.iterable, scope);
        const ls = makeScope(scope);
        declare(ls, node.item);
        walkBody(node.body, ls);
        return;
      }
      case 'If':
        walkExpr(node.test, scope);
        node.consequent && walkBody(node.consequent.body || node.consequent, makeScope(scope));
        node.alternate && walkBody(node.alternate.body || node.alternate, makeScope(scope));
        return;
      case 'While':
        walkExpr(node.test, scope);
        node.body && walkBody(node.body.body || node.body, makeScope(scope));
        return;
      case 'Switch':
        walkExpr(node.discriminant, scope);
        for (const c of node.cases) {
          const cscope = makeScope(scope);        // each branch is its own scope
          for (const t of (c.tests || [])) {
            // a pattern binds names into the branch and constrains with value
            // expressions; a plain value test is just an expression.
            if (isMatchPattern(t)) {
              patternConstraints(t).forEach(e => walkExpr(e, scope));
              patternBindings(t).forEach(b => declare(cscope, b.name));
            } else {
              walkExpr(t, scope);
            }
          }
          walkBody(c.body, cscope);
        }
        return;
      case 'Block':
        walkBody(node.body, makeScope(scope));
        return;
      case 'View':
        node.container && walkExpr(node.container, scope);
        node.body && walkBody(node.body.body || node.body, makeScope(scope));
        return;
      case 'Export':
        walkStmt(node.decl, scope);
        return;
      case 'Import':
        return;
      case 'Return':
        node.argument && walkExpr(node.argument, scope);
        return;
      case 'Break': case 'Continue':
        return;
      case 'ExpressionStatement':
        walkExpr(node.expression, scope);
        return;
      default:
        walkExpr(node, scope);        // Print, Construct, etc. are expression-shaped
    }
  }

  function walkExpr(node, scope) {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'Identifier':
        if (!isKnown(scope, node.name)) {
          warn(node, `अपरिभाषितम् (undefined) '${node.name}'`, 'undefined');
        }
        return;
      case 'Call':
        checkArity(node, scope);
        walkExpr(node.callee, scope);
        (node.args || []).forEach(a => walkExpr(a, scope));
        return;
      case 'Member':
        walkExpr(node.object, scope);
        if (node.computed) walkExpr(node.property, scope);
        return;                       // non-computed property is not a reference
      case 'Construct': {
        // duplicate कारक: two arguments whose vibhakti maps to the same DOM
        // slot — free word order means position doesn't disambiguate them, so
        // the earlier value is silently overwritten. Almost always a mistake.
        const firstBySlot = new Map();
        for (const o of node.order || []) {
          const prev = firstBySlot.get(o.slot);
          if (prev) {
            warn({ line: o.line, col: o.col },
              `पुनरुक्तकारकम् (duplicate ${KARAKA_NAME_SA[o.karaka]}-कारक: '${o.word}' overrides '${prev.word}')`,
              'duplicate-karaka');
          } else {
            firstBySlot.set(o.slot, o);
          }
        }
        // वचन agreement: a द्विवचन कर्तृ (पटौ "two buttons") is a PAIR — it
        // distributes over exactly two समास children, one element each. Any
        // other count contradicts the dual. (बहुवचन is a group of any size, so
        // it is not checked.) Anchored at the कर्तृ so the fix is obvious.
        if (node.dual) {
          const n = (node.children || []).length;
          if (n !== 2) {
            const kartr = (node.order || []).find(o => o.slot === 'tag');
            warn(kartr && { line: kartr.line, col: kartr.col },
              `वचनभेदः (द्विवचन '${kartr ? kartr.word : ''}' is a pair — expected two समास children, got ${n})`,
              'vacana-agreement');
          }
        }
        // walk the value expressions so undefined names inside a रचय are caught
        for (const k of Object.keys(node.slots || {})) walkExpr(node.slots[k], scope);
        if (node.style) {
          node.style.base && walkExpr(node.style.base, scope);
          (node.style.pairs || []).forEach(p => p.value?.kind === 'expr' && walkExpr(p.value.value, scope));
        }
        (node.children || []).forEach(c => walkExpr(c, scope));
        return;
      }
      case 'FuncExpr': {
        const fscope = makeScope(scope);
        node.params.forEach(p => declare(fscope, p));
        walkBody(node.body, fscope);
        return;
      }
      default:
        for (const k of Object.keys(node)) {
          if (k === 'line' || k === 'col' || k === 'namePos' || k === 'paramPos') continue;
          const v = node[k];
          if (Array.isArray(v)) v.forEach(c => c && typeof c === 'object' && walkExpr(c, scope));
          else if (v && typeof v === 'object' && v.type) walkExpr(v, scope);
        }
    }
  }

  function checkArity(call, scope) {
    const callee = call.callee;
    if (!callee || callee.type !== 'Identifier') return;
    const b = lookup(scope, callee.name);
    if (!b || typeof b.arity !== 'number') return;   // unknown / reassignable / global
    const got = (call.args || []).length;
    if (got !== b.arity) {
      warn(callee,
        `प्राचलसङ्ख्यादोषः ('${callee.name}' expects ${b.arity} argument${b.arity === 1 ? '' : 's'}, got ${got})`,
        'arity');
    }
  }

  try {
    walkBody(ast, makeScope(null));
  } catch {
    return [];                        // never let analysis break the editor
  }
  return diags;
}

// position of a statement for the unreachable-code caret.
function stmtPos(s) {
  if (!s) return null;
  if (s.line != null) return { line: s.line, col: s.col };
  if (s.namePos) return s.namePos;
  const inner = s.expression || s.argument || s.init || s.test;
  return inner && inner.line != null ? { line: inner.line, col: inner.col } : null;
}

const termWord = t => t === 'Return' ? 'फलम्' : t === 'Break' ? 'भङ्ग' : 'अनुवृत्तम्';
