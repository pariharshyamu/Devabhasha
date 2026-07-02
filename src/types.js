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
import { isMatchPattern, patternConstraints } from './patterns.js';

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
// A type is an object iff it is bare वस्तु or a { base:'वस्तु' } node. A bare
// वस्तु carries no known fields (fieldsOf → null → structurally unconstrained).
const isObj = t => t === 'वस्तु' || !!(t && t.base === 'वस्तु');
const fieldsOf = t => (t && t.base === 'वस्तु') ? t.fields : null;
// The declared type of a field on a known shape, else किमपि (gradual).
const fieldType = (t, key) => { const f = fieldsOf(t); return f && (key in f) ? f[key] : ANY; };
// A function type: { base:'कार्य', params:[type], ret:type }.
const isFn = t => !!(t && t.base === 'कार्य');

// Structural identity — used to decide an array literal's element type.
function sameType(a, b) {
  if (a && a.base === 'गण' && b && b.base === 'गण') return sameType(a.elem, b.elem);
  if (a && a.base === 'वस्तु' && b && b.base === 'वस्तु') {
    const ka = Object.keys(a.fields), kb = Object.keys(b.fields);
    return ka.length === kb.length && ka.every(k => k in b.fields && sameType(a.fields[k], b.fields[k]));
  }
  if (isFn(a) && isFn(b))
    return a.params.length === b.params.length &&
      a.params.every((p, i) => sameType(p, b.params[i])) && sameType(a.ret, b.ret);
  return a === b;
}

// Human-readable rendering: गण<सङ्ख्या>, { नाम: अक्षर }, कार्य(सङ्ख्या): तथ्य.
function typeName(t) {
  if (t && t.base === 'गण') return `गण<${typeName(t.elem)}>`;
  if (t && t.base === 'वस्तु') return `{ ${Object.entries(t.fields).map(([k, v]) => `${k}: ${typeName(v)}`).join(', ')} }`;
  if (isFn(t)) return `कार्य(${t.params.map(typeName).join(', ')}): ${typeName(t.ret)}`;
  return t;
}
function typeGloss(t) {
  if (t && t.base === 'गण') return `array of ${typeGloss(t.elem)}`;
  if (t && t.base === 'वस्तु') return 'object';
  if (isFn(t)) return 'function';
  return EN[t] || '?';
}
const show = t => `${typeName(t)} (${typeGloss(t)})`;

const WARNING = 2;

// Resolve an annotation node ({name, params?} | null) to a type tag. A null
// annotation (unannotated) is किमपि; an unknown name is किमपि too (the caller
// warns). A parametric गण<T> becomes a structured { base:'गण', elem }.
function annType(ann) {
  if (!ann) return ANY;
  if (ann.shape) {   // object shape { key: Type, … }
    const fields = {};
    for (const f of ann.shape) fields[f.key] = annType(f.type);
    return { base: 'वस्तु', fields };
  }
  if (ann.fn)        // function type कार्य(params): ret
    return { base: 'कार्य', params: ann.fn.params.map(annType), ret: ann.fn.ret ? annType(ann.fn.ret) : ANY };
  if (!BASE_TYPES.has(ann.name)) return ANY;
  if (ann.name === 'गण' && ann.params && ann.params.length)
    return { base: 'गण', elem: annType(ann.params[0]) };
  return ann.name;
}

// Assignability: किमपि is a wildcard both ways; two arrays are compatible when
// their element types are (bare गण's element is किमपि). Objects are structural
// with WIDTH subtyping: the expected shape's every field must be present and
// compatible in the actual (which may carry more); a bare वस्तु on either side
// (no known fields) is unconstrained and fits. Otherwise base names must match.
function compatible(expected, actual) {
  if (expected == null || actual == null) return true;
  if (expected === ANY || actual === ANY) return true;
  if (isArr(expected) && isArr(actual)) return compatible(elemOf(expected), elemOf(actual));
  if (isObj(expected) && isObj(actual)) {
    const want = fieldsOf(expected), got = fieldsOf(actual);
    if (!want || !got) return true;      // a bare वस्तु is unconstrained
    return Object.keys(want).every(k => k in got && compatible(want[k], got[k]));
  }
  if (isFn(expected) && isFn(actual)) {  // same arity, params + return compatible
    return expected.params.length === actual.params.length &&
      expected.params.every((p, i) => compatible(p, actual.params[i])) &&
      compatible(expected.ret, actual.ret);
  }
  return expected === actual;
}

// `opts.importSigs` is an optional Map<localName, type> seeding the types of
// names brought in by आयात — a named import's export type, or a namespace alias
// modelled as an object shape whose fields are the module's exports. With it,
// calls to imported functions are argument-checked across module boundaries;
// without it (a single-file check) imported names stay gradual, exactly as
// before. See moduleExportTypes + the bundler's checkProgram.
export function typeDiagnostics(source, opts = {}) {
  let ast;
  try { ast = parse(tokenize(source)); }
  catch { return []; }
  const importSigs = opts.importSigs || null;

  const diags = [];
  const warn = (pos, message, kind) => {
    if (!pos || pos.line == null) return;
    diags.push({ line: pos.line, col: pos.col, endCol: pos.col + 1, message, kind, severity: WARNING });
  };
  // First source position on a node — descending a member/call chain to the
  // root identifier, since Member/Call nodes themselves carry none.
  const posOf = n => {
    if (!n || typeof n !== 'object') return null;
    if (n.line != null) return { line: n.line, col: n.col };
    return posOf(n.object) || posOf(n.callee) || null;
  };
  // Validate an annotation node: flag unknown names and misplaced type
  // parameters (e.g. सङ्ख्या<...>), recursing through composite params.
  const checkTypeName = ann => {
    if (!ann) return;
    if (ann.shape) { ann.shape.forEach(f => checkTypeName(f.type)); return; }
    if (ann.fn) { ann.fn.params.forEach(checkTypeName); checkTypeName(ann.fn.ret); return; }
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
      case 'ObjectLiteral': {
        // A literal infers a structural shape: each field's key → its value's
        // inferred type, so कोष { नाम: "र", वयः: ३० } is { नाम: अक्षर, वयः: सङ्ख्या }.
        const fields = {};
        for (const p of (node.props || [])) {
          const k = p.key && p.key.value;
          if (k != null) fields[k] = infer(p.value, scope);
        }
        return { base: 'वस्तु', fields };
      }
      case 'Member': {
        // field access on a known shape flows the field's type; anything else
        // (computed access, unknown shape, bare वस्तु) stays gradual.
        if (node.computed) return ANY;
        const ot = infer(node.object, scope);
        const f = fieldsOf(ot);
        return (f && node.property in f) ? f[node.property] : ANY;
      }
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
      case 'FuncExpr': {
        // a function expression's own type, from its annotations (body-return
        // inference stays gradual — an unannotated return is किमपि).
        const params = (node.paramTypes || node.params.map(() => null)).map(annType);
        return { base: 'कार्य', params, ret: node.returnType ? annType(node.returnType) : ANY };
      }
      case 'Call': {
        const c = node.callee;
        if (c && c.type === 'Identifier' && sigs.has(c.name)) {
          const rt = sigs.get(c.name).returnType;
          return rt == null ? ANY : rt;
        }
        const ct = infer(c, scope);         // a function-typed value → its ret
        return isFn(ct) ? ct.ret : ANY;
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

  // ---- type narrowing from a विकल्प pattern ----
  // Within a branch that matched a pattern, the discriminant is known to have
  // the pattern's shape. narrowFromPattern derives that refined type, preferring
  // the discriminant's own (more precise, declared) field types where it has
  // them and adding what the pattern guarantees. An array pattern just confirms
  // गण-ness (keeping the discriminant's element type when known).
  function narrowFromPattern(pat, dt, scope) {
    if (pat.type === 'MatchObject') {
      const fields = {};
      for (const p of pat.props) {
        if (p.kind === 'const') fields[p.key] = infer(p.value, scope);
        else if (p.kind === 'nested') fields[p.key] = narrowFromPattern(p.sub, fieldType(dt, p.key), scope);
        else fields[p.key] = fieldType(dt, p.key);            // a binding
      }
      // the discriminant's own known fields win (they are declared, hence more
      // precise than a constraint literal's inferred base type)
      return { base: 'वस्तु', fields: { ...fields, ...(fieldsOf(dt) || {}) } };
    }
    if (pat.type === 'MatchArray') return isArr(dt) ? dt : { base: 'गण', elem: ANY };
    return dt;
  }

  // Give each binding a pattern introduces its type FROM THE DISCRIMINANT: an
  // object field's declared type, an array element's element type, the rest as
  // the array itself. Falls back to किमपि when the discriminant's type is
  // unknown — so this only ever refines, never invents a mismatch.
  function bindPatternTypes(pat, dt, scope) {
    if (pat.type === 'MatchObject') {
      for (const p of pat.props) {
        if (p.kind === 'bind') setVar(scope, p.name, fieldType(dt, p.key));
        else if (p.kind === 'nested') bindPatternTypes(p.sub, fieldType(dt, p.key), scope);
      }
    } else if (pat.type === 'MatchArray') {
      const et = elemOf(dt);
      pat.elements.forEach(e => {
        if (e.kind === 'bind') setVar(scope, e.name, et);
        else if (e.kind === 'nested') bindPatternTypes(e.sub, et, scope);
      });
      if (pat.rest) setVar(scope, pat.rest.name, isArr(dt) ? dt : { base: 'गण', elem: ANY });
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
      case 'Switch': {
        walkExpr(node.discriminant, scope);
        const discType = infer(node.discriminant, scope);
        // narrow only a plain-identifier discriminant (नोड), and only in a
        // single-pattern branch (comma-alternatives don't share one shape).
        const discName = node.discriminant.type === 'Identifier' ? node.discriminant.name : null;
        (node.cases || []).forEach(c => {
          const cscope = makeScope(scope);
          for (const t of (c.tests || [])) {
            if (isMatchPattern(t)) {
              patternConstraints(t).forEach(e => walkExpr(e, scope));
              // bindings inherit the discriminant's field/element types…
              bindPatternTypes(t, discType, cscope);
              // …and the discriminant itself is narrowed to the matched shape.
              if (discName && c.tests.length === 1)
                setVar(cscope, discName, narrowFromPattern(t, discType, scope));
            } else {
              walkExpr(t, scope);
            }
          }
          walkBody(c.body, cscope, ret);
        });
        return;
      }
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
    // A callee's parameter types come from a hoisted signature (named function),
    // or from an inferred function TYPE (a कार्य-typed variable/parameter).
    let paramTypes = null, name = null;
    if (c && c.type === 'Identifier' && sigs.has(c.name)) { paramTypes = sigs.get(c.name).paramTypes; name = c.name; }
    else { const ct = infer(c, scope); if (isFn(ct)) { paramTypes = ct.params; name = c && c.name; } }
    if (!paramTypes) return;
    const label = name ? `'${name}'` : 'the function';
    const args = node.args || [];
    for (let i = 0; i < Math.min(args.length, paramTypes.length); i++) {
      const want = paramTypes[i];
      if (want === ANY) continue;
      const got = infer(args[i], scope);
      if (!compatible(want, got)) {
        // literal args carry no position; fall back to the callee (descending a
        // member chain to the root identifier, which does carry one).
        const pos = posOf(args[i]) || posOf(c) || posOf(node);
        warn(pos,
          `प्रकारभेदः (argument ${i + 1} of ${label} expects ${show(want)}, got ${show(got)})`,
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

  const root = makeScope(null);
  // Seed imported names: give each its type in the root scope, and register any
  // that are functions in `sigs` so direct calls to them are argument-checked.
  if (importSigs) for (const [name, t] of importSigs) {
    setVar(root, name, t);
    if (isFn(t)) sigs.set(name, { paramTypes: t.params, returnType: t.ret });
  }
  try { walkBody(ast, root, null); }
  catch { return []; }
  return diags;
}

// The exported types of a module, as { exportName: type } — a FuncDecl's or
// typed function-expression's signature, or a typed नियत/चर's declared type.
// Signatures come from annotations (syntactic), so this needs no type-checking
// and no dependency ordering: it is what lets an importer check calls across
// the module boundary. Unannotated exports are किमपि (gradual).
export function moduleExportTypes(source) {
  let ast;
  try { ast = parse(tokenize(source)); }
  catch { return {}; }
  const body = ast.body || ast;
  const fnTypeOf = node => ({
    base: 'कार्य',
    params: (node.paramTypes || node.params.map(() => null)).map(annType),
    ret: node.returnType ? annType(node.returnType) : ANY,
  });
  const out = {};
  for (const s of body) {
    if (!s || s.type !== 'Export') continue;
    if (s.reexport) {
      // निर्यात { a, b रूपेण c } आ "म" — the exported type IS the source
      // module's export type; record a marker for checkProgram to resolve
      // (it has the whole graph; this function sees only one file).
      s.names.forEach((name, i) => { out[name] = { __reexport: { source: s.source, name: s.sources[i] } }; });
      continue;
    }
    const d = s.decl;
    if (!d) continue;
    if (d.type === 'FuncDecl') out[s.name] = fnTypeOf(d);
    else if (d.type === 'VarDecl') {
      if (d.varType) out[s.name] = annType(d.varType);
      else if (d.init && d.init.type === 'FuncExpr') out[s.name] = fnTypeOf(d.init);
      else out[s.name] = ANY;
    } else out[s.name] = ANY;
  }
  return out;
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
