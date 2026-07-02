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

import { tokenize } from './lexer.js';
import { parse } from './parser.js';

const ANY = 'किमपि';
const VOID = 'रिक्त';
export const BASE_TYPES = new Set([
  'सङ्ख्या', 'अक्षर', 'तथ्य', 'वस्तु', 'गण', VOID, ANY,
]);

// English gloss for messages.
const EN = {
  'सङ्ख्या': 'number', 'अक्षर': 'string', 'तथ्य': 'boolean', 'वस्तु': 'object',
  'गण': 'array', 'रिक्त': 'void', 'किमपि': 'any',
};
const show = t => `${t} (${EN[t] || '?'})`;

const WARNING = 2;

// Resolve an annotation node ({name} | null) to a type tag. A null annotation
// (unannotated) is किमपि. An unknown name is किमपि too (the caller warns).
const annType = ann => (ann && BASE_TYPES.has(ann.name)) ? ann.name : ANY;

// Assignability: किमपि is a wildcard both ways; otherwise names must match.
const compatible = (expected, actual) =>
  expected == null || actual == null || expected === ANY || actual === ANY ||
  expected === actual;

export function typeDiagnostics(source) {
  let ast;
  try { ast = parse(tokenize(source)); }
  catch { return []; }

  const diags = [];
  const warn = (pos, message, kind) => {
    if (!pos || pos.line == null) return;
    diags.push({ line: pos.line, col: pos.col, endCol: pos.col + 1, message, kind, severity: WARNING });
  };
  // warn once per unknown type-name annotation
  const checkTypeName = ann => {
    if (ann && !BASE_TYPES.has(ann.name))
      warn(ann, `अज्ञातप्रकारः (unknown type '${ann.name}')`, 'unknown-type');
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
      case 'Array': return 'गण';
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
        if (node.pattern) return;                    // destructured — not tracked in v1
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
        { const ls = makeScope(scope); setVar(ls, node.item, ANY); walkBody(node.body, ls, ret); }
        return;
      case 'Switch':
        walkExpr(node.discriminant, scope);
        (node.cases || []).forEach(c => {
          (c.tests || []).forEach(t => walkExpr(t, scope));
          walkBody(c.body, makeScope(scope), ret);
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
