// types.js — प्रकार, a gradual, erasable type layer.
//
// Types are OPTIONAL annotations on parameters, return values, and variables
// (`कार्य योग(अ: सङ्ख्या, ब: सङ्ख्या): सङ्ख्या { … }`). They are ERASED by the
// codegen — the emitted JS is byte-identical with or without them — so this
// module never affects runtime behaviour. It only produces diagnostics.
//
// GRADUAL. The escape type किमपि ("anything") is compatible with everything,
// and an un-annotated binding is किमपि by default. A mismatch is reported ONLY
// when both sides have a concrete, known type — so unannotated code is never
// warned about, and annotations can be added incrementally.
//
// The base types (drawn from Sanskrit grammatical/quantitative vocabulary):
//   सङ्ख्या number · अक्षर string · तथ्य boolean · वस्तु object · गण array ·
//   रिक्त void (a कार्य that returns nothing) · किमपि any (the gradual escape).
//
// COMPOSITE. गण also takes an element type — गण<सङ्ख्या> is an array of numbers.
// Internally a type is either a base string ('सङ्ख्या') or a structured node
// { base:'गण', elem:<type> }. A bare गण behaves as गण<किमपि>. The element type
// flows: iterating a गण<सङ्ख्या> in प्रत्येकम्, or array-destructuring it, binds
// each element as सङ्ख्या.

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { isMatchPattern, patternBindings, patternConstraints } from './patterns.js';

const ANY = 'किमपि';
const VOID = 'रिक्त';
export const BASE_TYPES = new Set([
  'सङ्ख्या', 'अक्षर', 'तथ्य', 'वस्तु', 'गण', VOID, ANY,
]);
// Base types that accept a <...> element parameter.
const PARAMETRIC = new Set(['गण']);

// English gloss for messages.
const EN = {
  'सङ्ख्या': 'number', 'अक्षर': 'string', 'तथ्य': 'boolean', 'वस्तु': 'object',
  'गण': 'array', 'रिक्त': 'void', 'किमपि': 'any',
};
// A type is an array iff it is bare गण or a { base:'गण' } node.
const isArr = t => t === 'गण' || !!(t && t.base === 'गण');
// The element type of an array; a bare गण is unconstrained (किमपि).
const elemOf = t => (t && t.base === 'गण') ? t.elem : ANY;
// Structural identity — used to decide an array literal's element type.
const sameType = (a, b) =>
  (a && a.base === 'गण' && b && b.base === 'गण') ? sameType(a.elem, b.elem) : a === b;

// Human-readable rendering: गण<सङ्ख्या>, and its gloss "array of number".
const typeName = t => (t && t.base === 'गण') ? `गण<${typeName(t.elem)}>` : t;
const typeGloss = t => (t && t.base === 'गण') ? `array of ${typeGloss(t.elem)}` : (EN[t] || '?');
const show = t => `${typeName(t)} (${typeGloss(t)})`;

const WARNING = 2;

// Resolve an annotation node ({name, params?} | null) to a type tag. A null
// annotation (unannotated) is किमपि; an unknown name is किमपि too (the caller
// warns). A parametric गण<T> becomes a structured { base:'गण', elem }.
function annType(ann) {
  if (!ann || !BASE_TYPES.has(ann.name)) return ANY;
  if (ann.name === 'गण' && ann.params && ann.params.length)
    return { base: 'गण', elem: annType(ann.params[0]) };
  return ann.name;
}

// Assignability: किमपि is a wildcard both ways; two arrays are compatible when
// their element types are (bare गण's element is किमपि, so it fits anything);
// otherwise base names must match.
function compatible(expected, actual) {
  if (expected == null || actual == null) return true;
  if (expected === ANY || actual === ANY) return true;
  if (isArr(expected) && isArr(actual)) return compatible(elemOf(expected), elemOf(actual));
  return expected === actual;
}

export function typeDiagnostics(source) {
  let ast;
  try { ast = parse(tokenize(source)); }
  catch { return []; }

  const diags = [];
  const warn = (pos, message, kind) => {
    if (!pos || pos.line == null) return;
    diags.push({ line: pos.line, col: pos.col, endCol: pos.col + 1, message, kind, severity: WARNING });
  };
  // Validate an annotation node: flag unknown names and misplaced type
  // parameters (e.g. सङ्ख्या<...>), recursing through composite params.
  const checkTypeName = ann => {
    if (!ann) return;
    if (!BASE_TYPES.has(ann.name))
      warn(ann, `अज्ञातप्रकारः (unknown type '${ann.name}')`, 'unknown-type');
    else if (ann.params && ann.params.length && !PARAMETRIC.has(ann.name))
      warn(ann, `प्रकारदोषः ('${ann.name}' takes no type parameter)`, 'type-arity');
    (ann.params || []).forEach(checkTypeName);
  };

  const makeScope = parent => ({ parent, vars: new Map() });
  const setVar = (scope, name, tag) => name && scope.vars.set(name, tag);
  const getVar = (scope, name) => {
    for (let s = scope; s; s = s.parent) if (s.vars.has(name)) return s.vars.get(name);
    return ANY;                       // unknown binding → gradual (any)
  };

  // function signatures, hoisted so forward calls type-check.
  const sigs = new Map();
  const signatureOf = node => ({
    paramTypes: (node.paramTypes || node.params.map(() => null)).map(annType),
    returnType: node.returnType ? annType(node.returnType) : null,
  });
  const hoistSigs = (statements, scope) => {
    for (const s of statements) {
      const decl = s && s.type === 'Export' ? s.decl : s;
      if (decl && decl.type === 'FuncDecl') sigs.set(decl.name, signatureOf(decl));
      // a नियत bound to a typed function expression is callable too
      if (decl && decl.type === 'VarDecl' && decl.init && decl.init.type === 'FuncExpr')
        sigs.set(decl.name, signatureOf(decl.init));
    }
  };

  // ---- type inference ----
  function infer(node, scope) {
    if (!node || typeof node !== 'object') return ANY;
    switch (node.type) {
      case 'Number': return 'सङ्ख्या';
      case 'String': case 'Template': return 'अक्षर';
      case 'Boolean': return 'तथ्य';
      case 'ObjectLiteral': return 'वस्तु';
      case 'Array': {
        // Infer the element type: गण<T> when the elements agree on a concrete
        // type, गण<किमपि> otherwise (empty, mixed, or containing anything).
        const els = node.elements || [];
        if (!els.length) return { base: 'गण', elem: ANY };
        let elem = infer(els[0], scope);
        for (let k = 1; k < els.length; k++) {
          if (!sameType(elem, infer(els[k], scope))) { elem = ANY; break; }
        }
        return { base: 'गण', elem };
      }
      case 'Null': return ANY;
      case 'Identifier': return getVar(scope, node.name);
      case 'Call': {
        const c = node.callee;
        if (c && c.type === 'Identifier' && sigs.has(c.name)) {
          const rt = sigs.get(c.name).returnType;
          return rt == null ? ANY : rt;
        }
        return ANY;
      }
      case 'Unary': return node.op === '!' ? 'तथ्य' : node.op === '-' ? 'सङ्ख्या' : ANY;
      case 'Binary': {
        const op = node.op;
        if (['==', '!=', '===', '!==', '<', '>', '<=', '>='].includes(op)) return 'तथ्य';
        if (op === '+') {
          const l = infer(node.left, scope), r = infer(node.right, scope);
          if (l === 'अक्षर' || r === 'अक्षर') return 'अक्षर';   // string concat
          if (l === 'सङ्ख्या' && r === 'सङ्ख्या') return 'सङ्ख्या';
          return ANY;
        }
        if (['-', '*', '/', '%'].includes(op)) {
          const l = infer(node.left, scope), r = infer(node.right, scope);
          return (l === 'सङ्ख्या' && r === 'सङ्ख्या') ? 'सङ्ख्या' : ANY;
        }
        return ANY;                    // &&, ||, ?? — could be either operand
      }
      default: return ANY;             // Member, Await, Sutra, Ternary, …
    }
  }

  // ---- walk ----
  const walkBody = (block, scope, ret) => {
    const body = Array.isArray(block) ? block : (block && block.body) || [];
    hoistSigs(body, scope);
    for (const s of body) walkStmt(s, scope, ret);
  };

  function enterFunction(node, scope) {
    (node.paramTypes || []).forEach(checkTypeName);
    checkTypeName(node.returnType);
    const fscope = makeScope(scope);
    node.params.forEach((p, i) => setVar(fscope, p, annType((node.paramTypes || [])[i])));
    const ret = node.returnType
      ? { tag: annType(node.returnType), ann: node.returnType }
      : null;
    walkBody(node.body, fscope, ret);
  }

  function walkStmt(node, scope, ret) {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'VarDecl': {
        if (node.init) walkExpr(node.init, scope);
        if (node.pattern) {
          // Array-destructuring a गण<सङ्ख्या> binds each name as सङ्ख्या.
          // Object shapes aren't modelled yet, so object patterns stay किमपि.
          if (node.pattern.kind === 'array' && node.init) {
            const elem = elemOf(infer(node.init, scope));
            for (const n of node.pattern.names) setVar(scope, n.name, elem);
          }
          return;
        }
        if (node.varType) {
          checkTypeName(node.varType);
          const declared = annType(node.varType);
          if (node.init) {
            const got = infer(node.init, scope);
            if (!compatible(declared, got))
              warn(node.namePos,
                `प्रकारभेदः ('${node.name}' declared ${show(declared)} but assigned ${show(got)})`,
                'type-init');
          }
          setVar(scope, node.name, declared);
        } else {
          setVar(scope, node.name, node.init ? infer(node.init, scope) : ANY);
        }
        return;
      }
      case 'FuncDecl': enterFunction(node, scope); return;
      case 'Return': {
        node.argument && walkExpr(node.argument, scope);
        if (ret) {
          if (ret.tag === VOID) {
            if (node.argument)
              warn(ret.ann, `प्रकारभेदः (रिक्त function returns a value)`, 'type-return');
          } else if (!node.argument) {
            warn(ret.ann, `प्रकारभेदः (must return ${show(ret.tag)})`, 'type-return');
          } else {
            const got = infer(node.argument, scope);
            if (!compatible(ret.tag, got))
              warn(ret.ann,
                `प्रकारभेदः (returns ${show(got)} but declared ${show(ret.tag)})`, 'type-return');
          }
        }
        return;
      }
      case 'If':
        walkExpr(node.test, scope);
        node.consequent && walkBody(node.consequent.body || node.consequent, makeScope(scope), ret);
        node.alternate && walkBody(node.alternate.body || node.alternate, makeScope(scope), ret);
        return;
      case 'While':
        walkExpr(node.test, scope);
        node.body && walkBody(node.body.body || node.body, makeScope(scope), ret);
        return;
      case 'ForOf':
        walkExpr(node.iterable, scope);
        { const ls = makeScope(scope);
          // Iterating a गण<सङ्ख्या> binds the item as सङ्ख्या; otherwise किमपि.
          setVar(ls, node.item, elemOf(infer(node.iterable, scope)));
          walkBody(node.body, ls, ret); }
        return;
      case 'Switch':
        walkExpr(node.discriminant, scope);
        (node.cases || []).forEach(c => {
          const cscope = makeScope(scope);
          for (const t of (c.tests || [])) {
            // pattern tests bind names (typed किमपि — the shape isn't tracked
            // yet) and constrain with value expressions; value tests are exprs.
            if (isMatchPattern(t)) {
              patternConstraints(t).forEach(e => walkExpr(e, scope));
              patternBindings(t).forEach(b => setVar(cscope, b.name, ANY));
            } else {
              walkExpr(t, scope);
            }
          }
          walkBody(c.body, cscope, ret);
        });
        return;
      case 'Block': walkBody(node.body, makeScope(scope), ret); return;
      case 'View':
        node.container && walkExpr(node.container, scope);
        node.body && walkBody(node.body.body || node.body, makeScope(scope), ret);
        return;
      case 'Export': walkStmt(node.decl, scope, ret); return;
      case 'Import': return;
      case 'ExpressionStatement': walkExpr(node.expression, scope); return;
      default: walkExpr(node, scope);
    }
  }

  function checkCall(node, scope) {
    const c = node.callee;
    if (!c || c.type !== 'Identifier' || !sigs.has(c.name)) return;
    const { paramTypes } = sigs.get(c.name);
    const args = node.args || [];
    for (let i = 0; i < Math.min(args.length, paramTypes.length); i++) {
      const want = paramTypes[i];
      if (want === ANY) continue;
      const got = infer(args[i], scope);
      if (!compatible(want, got)) {
        // literal args carry no position; fall back to the callee's.
        const pos = args[i].line != null ? { line: args[i].line, col: args[i].col } : c;
        warn(pos,
          `प्रकारभेदः (argument ${i + 1} of '${c.name}' expects ${show(want)}, got ${show(got)})`,
          'type-arg');
      }
    }
  }

  function walkExpr(node, scope) {
    if (!node || typeof node !== 'object') return;
    switch (node.type) {
      case 'Call':
        checkCall(node, scope);
        walkExpr(node.callee, scope);
        (node.args || []).forEach(a => walkExpr(a, scope));
        return;
      case 'FuncExpr': enterFunction(node, scope); return;
      case 'Member':
        walkExpr(node.object, scope);
        if (node.computed) walkExpr(node.property, scope);
        return;
      default:
        for (const k of Object.keys(node)) {
          if (['line', 'col', 'namePos', 'paramPos', 'varType', 'returnType', 'paramTypes'].includes(k)) continue;
          const v = node[k];
          if (Array.isArray(v)) v.forEach(x => x && typeof x === 'object' && walkExpr(x, scope));
          else if (v && typeof v === 'object' && v.type) walkExpr(v, scope);
        }
    }
  }

  try { walkBody(ast, makeScope(null), null); }
  catch { return []; }
  return diags;
}

// ---- type-aware hover ----
// The DECLARED type at a binding position (line, col) — the annotation on the
// VarDecl / parameter / function it introduces — or null when that binding is
// unannotated (types are optional, so most bindings have none). This drives
// type-aware hover: no inference is done, so only explicitly-typed bindings
// report a type. Returns { display } where display is a human string, plus
// `tag` (the type) for a value or `fn: true` for a function.
export function declaredTypeAt(source, line, col) {
  let ast;
  try { ast = parse(tokenize(source)); } catch { return null; }
  const at = pos => pos && pos.line === line && pos.col === col;
  const fnSig = node => {
    const ps = (node.paramTypes || node.params.map(() => null))
      .map(a => a ? typeName(annType(a)) : '?');
    const rt = node.returnType ? typeName(annType(node.returnType)) : '?';
    return `(${ps.join(', ')}) → ${rt}`;
  };
  let found = null;
  const visit = node => {
    if (found || !node || typeof node !== 'object') return;
    if (node.type === 'VarDecl') {
      if (at(node.namePos)) {
        if (node.varType) { found = { display: show(annType(node.varType)), tag: annType(node.varType) }; return; }
        if (node.init && node.init.type === 'FuncExpr') { found = { display: `${fnSig(node.init)} (function)`, fn: true }; return; }
      }
    } else if (node.type === 'FuncDecl') {
      if (at(node.namePos)) { found = { display: `${fnSig(node)} (function)`, fn: true }; return; }
      (node.paramPos || []).forEach((p, i) => {
        if (!found && at(p) && node.paramTypes && node.paramTypes[i])
          found = { display: show(annType(node.paramTypes[i])), tag: annType(node.paramTypes[i]) };
      });
    }
    for (const k of Object.keys(node)) {
      if (found) return;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  (Array.isArray(ast) ? ast : [ast]).forEach(visit);
  return found;
}
