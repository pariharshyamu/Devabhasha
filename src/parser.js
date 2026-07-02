// parser.js — builds an AST from the token stream.
// Statements: recursive descent. Expressions: Pratt (precedence climbing).

import { analyze, VACANA, KARAKA } from './vibhakti.js';
import { KARAKA_TO_SLOT, TAG_STEMS, EVENT_STEMS } from './karaka-web.js';
import { KEYWORDS } from './keywords.js';
import { DevabhashaError } from './errors.js';
import { tokenize } from './lexer.js';

// Set of token types produced by keywords — these may still be used as
// property names after a dot (property namespace is separate).
const KEYWORD_TOKENS = new Set(Object.values(KEYWORDS));

export function parse(tokens) {
  let pos = 0;

  const peek = (k = 0) => tokens[pos + k];
  const next = () => tokens[pos++];
  const check = (type, value) =>
    peek().type === type && (value === undefined || peek().value === value);

  function expect(type, value) {
    if (!check(type, value)) {
      const t = peek();
      throw new DevabhashaError(
        `expected ${value ?? type} but found '${t.value}' (${t.type})`,
        { line: t.line, col: t.col, kind: 'parse' }
      );
    }
    return next();
  }

  // optional statement terminator
  function eatSemi() {
    while (check('SEMI')) next();
  }

  // ---- statements ----------------------------------------------------

  function parseProgram() {
    const body = [];
    while (!check('EOF')) {
      eatSemi();
      if (check('EOF')) break;
      body.push(parseStatement());
      eatSemi();
    }
    return { type: 'Program', body };
  }

  function parseStatement() {
    const startTok = peek();
    const node = parseStatementInner();
    // stamp source position (line/col of the statement's first token) so the
    // codegen can emit a source map. Non-invasive: statement granularity only.
    if (node && node.line == null && startTok) {
      node.line = startTok.line;
      node.col = startTok.col;
    }
    return node;
  }

  function parseStatementInner() {
    if (check('LET') || check('CONST')) return parseVarDecl();
    if (check('FUNC')) return parseFuncDecl(false);
    if (check('ASYNC')) {
      next(); // ASYNC
      if (!check('FUNC')) {
        throw new DevabhashaError('असमकालिकदोषः: असमकालिक must be followed by कार्य',
          { line: peek().line, col: peek().col, kind: 'parse' });
      }
      return parseFuncDecl(true);
    }
    if (check('RETURN')) return parseReturn();
    if (check('IF')) return parseIf();
    if (check('WHILE')) return parseWhile();
    if (check('SWITCH')) return parseSwitch();
    if (check('FOR')) return parseFor();
    if (check('BREAK')) { next(); return { type: 'Break' }; }
    if (check('CONTINUE')) { next(); return { type: 'Continue' }; }
    if (check('PRINT')) return parsePrint();
    if (check('STYLENAME')) return parseStyleName();
    if (check('STATE')) return parseStateDecl();
    if (check('VIEW')) return parseView();
    if (check('EXPORT')) return parseExport();
    if (check('IMPORT')) return parseImport();
    if (check('OP', '{')) return parseBlock();
    // expression statement
    const expr = parseExpression();
    return { type: 'ExpressionStatement', expression: expr };
  }

  function parseBlock() {
    expect('OP', '{');
    const body = [];
    while (!check('OP', '}') && !check('EOF')) {
      eatSemi();
      if (check('OP', '}')) break;
      body.push(parseStatement());
      eatSemi();
    }
    expect('OP', '}');
    return { type: 'Block', body };
  }

  function parseVarDecl() {
    const kind = next().type; // LET | CONST
    // destructuring:  चर [अ, ब] = सूची।   नियत { नाम, वयः } = व्यक्तिः।
    if (check('OP', '[') || check('OP', '{')) {
      const pattern = check('OP', '[') ? parseArrayPattern() : parseObjectPattern();
      expect('OP', '=');
      const init = parseExpression();
      return { type: 'VarDecl', kind, name: null, pattern, init };
    }
    const nt = expect('IDENT');
    const varType = check('OP', ':') ? (next(), parseType()) : null;   // चर x: सङ्ख्या = …
    let init = null;
    if (check('OP', '=')) { next(); init = parseExpression(); }
    return { type: 'VarDecl', kind, name: nt.value, varType, init, namePos: { line: nt.line, col: nt.col } };
  }

  // [अ, ब, ग]  — array destructuring pattern (positional, no holes/rest).
  function parseArrayPattern() {
    expect('OP', '[');
    const names = [];
    while (!check('OP', ']') && !check('EOF')) {
      const t = expect('IDENT');
      names.push({ name: t.value, line: t.line, col: t.col });
      if (check('OP', ',')) next();
    }
    expect('OP', ']');
    return { kind: 'array', names };
  }

  // { कुञ्जी, अन्या: उपनाम }  — object destructuring; shorthand or key:alias.
  function parseObjectPattern() {
    expect('OP', '{');
    const props = [];
    while (!check('OP', '}') && !check('EOF')) {
      const kt = peek();
      if (!(kt.type === 'IDENT' || KEYWORD_TOKENS.has(kt.type))) {
        throw new DevabhashaError('विभाजनदोषः: object pattern key must be a name',
          { line: kt.line, col: kt.col, kind: 'parse' });
      }
      next();
      let alias = kt.value, line = kt.line, col = kt.col;
      if (check('OP', ':')) { next(); const at = expect('IDENT'); alias = at.value; line = at.line; col = at.col; }
      props.push({ key: kt.value, alias, line, col });
      if (check('OP', ',')) next();
    }
    expect('OP', '}');
    return { kind: 'object', props };
  }

  function parseFuncDecl(isAsync = false) {
    next(); // FUNC
    const nt = expect('IDENT');
    const params = parseParams();
    const returnType = check('OP', ':') ? (next(), parseType()) : null;   // optional : प्रकार
    const body = parseBlock();
    return { type: 'FuncDecl', name: nt.value, params, paramTypes: params.__types,
             returnType, body, async: isAsync,
             namePos: { line: nt.line, col: nt.col }, paramPos: params.__pos };
  }

  function parseParams() {
    expect('OP', '(');
    const params = [];
    const pos = [];
    const types = [];
    while (!check('OP', ')')) {
      const pt = expect('IDENT');
      params.push(pt.value);
      pos.push({ line: pt.line, col: pt.col });
      types.push(check('OP', ':') ? (next(), parseType()) : null);  // optional प्रकार
      if (check('OP', ',')) next();
    }
    expect('OP', ')');
    Object.defineProperty(params, '__pos', { value: pos, enumerable: false });
    Object.defineProperty(params, '__types', { value: types, enumerable: false });
    return params;
  }

  // A प्रकार (type) annotation: a single type-name identifier. Erasable — it is
  // attached to the AST but never emitted, so the JS output is identical with
  // or without it (that is what keeps the type layer gradual and optional).
  function parseType() {
    const t = peek();
    if (t.type !== 'IDENT') {
      throw new DevabhashaError('प्रकारदोषः: expected a type name (e.g. सङ्ख्या, अक्षर)',
        { line: t.line, col: t.col, kind: 'parse' });
    }
    next();
    const node = { name: t.value, line: t.line, col: t.col };
    // optional composite parameter(s): गण<सङ्ख्या> — an element-typed array.
    // Stored as `params` (a list, for forward compatibility) and, like the
    // rest of the annotation, erased by the codegen.
    if (check('OP', '<')) {
      next();
      const params = [parseType()];
      while (check('OP', ',')) { next(); params.push(parseType()); }
      if (!check('OP', '>')) {
        const g = peek();
        throw new DevabhashaError("प्रकारदोषः: expected '>' to close a composite type",
          { line: g.line, col: g.col, kind: 'parse' });
      }
      next();
      node.params = params;
    }
    return node;
  }

  function parseReturn() {
    next(); // RETURN
    let arg = null;
    if (!check('SEMI') && !check('OP', '}') && !check('EOF')) {
      arg = parseExpression();
    }
    return { type: 'Return', argument: arg };
  }

  function parseIf() {
    next(); // IF
    expect('OP', '(');
    const test = parseExpression();
    expect('OP', ')');
    const consequent = parseBlock();
    let alternate = null;
    if (check('ELSE')) {
      next();
      alternate = check('IF') ? parseIf() : parseBlock();
    }
    return { type: 'If', test, consequent, alternate };
  }

  function parseWhile() {
    next(); // WHILE
    expect('OP', '(');
    const test = parseExpression();
    expect('OP', ')');
    const body = parseBlock();
    return { type: 'While', test, body };
  }

  // विकल्प (मूल्यम्) {
  //   स्थिति क: ...।           # case; comma-separated values share a body
  //   स्थिति ख, ग: ...।
  //   अन्यथा: ...।             # default (optional)
  // }
  // Each branch is self-contained (implicit break — no JS fall-through), so
  // it reads like a match, not a C switch. A branch body is the statements up
  // to the next स्थिति / अन्यथा / '}'.
  function parseSwitch() {
    next(); // SWITCH
    expect('OP', '(');
    const discriminant = parseExpression();
    expect('OP', ')');
    expect('OP', '{');
    const cases = [];       // { tests: [expr] | null (default), body: [stmt] }
    while (!check('OP', '}') && !check('EOF')) {
      eatSemi();
      if (check('OP', '}')) break;
      let tests = null;
      if (check('CASE')) {
        next(); // CASE
        tests = [parseCaseTest()];
        while (check('OP', ',')) { next(); tests.push(parseCaseTest()); }
      } else if (check('ELSE')) {
        next(); // ELSE → default
      } else {
        throw new DevabhashaError('विकल्पदोषः: expected स्थिति (case) or अन्यथा (default)',
          { line: peek().line, col: peek().col, kind: 'parse' });
      }
      expect('OP', ':');
      const body = [];
      while (!check('CASE') && !check('ELSE') && !check('OP', '}') && !check('EOF')) {
        eatSemi();
        if (check('CASE') || check('ELSE') || check('OP', '}')) break;
        body.push(parseStatement());
        eatSemi();
      }
      cases.push({ tests, body });
    }
    expect('OP', '}');
    return { type: 'Switch', discriminant, cases };
  }

  // A स्थिति test is either a plain value expression (matched with ===, the
  // original behaviour) or a structural PATTERN — an object shape कोष { … } or
  // an array [ … ]. Patterns match by shape and bind names; they are recognised
  // by their leading token, so ordinary value cases are entirely unaffected.
  function parseCaseTest() {
    if (check('OBJECT')) return parseMatchObject();
    if (check('OP', '[')) return parseMatchArray();
    return parseExpression();
  }

  // A sub-pattern in value position (after a `:` in an object, or as an array
  // element). कोष / [ recurse into a nested pattern; a bare identifier is a
  // BINDING; anything else is a CONSTRAINT expression (the value must ===).
  //   कोष { प्रकार: "If" }        प्रकार must === "If"       (const)
  //   कोष { देहः }                 bind देहः = disc.देहः      (bind, shorthand)
  //   कोष { मूलम्: नाम }           bind नाम = disc.मूलम्      (bind, aliased)
  //   कोष { स्थानम्: कोष { x: ० }} nested object pattern      (nested)
  function classifyValue(kind) {
    if (check('OBJECT') || check('OP', '[')) return { kind: 'nested', sub: parseCaseTest() };
    const t = peek();
    if (t.type === 'IDENT') { next(); return { kind: 'bind', name: t.value, line: t.line, col: t.col }; }
    return { kind: 'const', value: parseExpression() };
  }

  // कोष { प्रकार: "If", देहः, मूलम्: नाम, स्थानम्: कोष { … } } — an object
  // pattern with constraints, shorthand/aliased bindings, and nested patterns.
  // Matches a non-null object satisfying every constraint and carrying every key.
  function parseMatchObject() {
    const kt = next(); // OBJECT
    expect('OP', '{');
    const props = [];
    while (!check('OP', '}') && !check('EOF')) {
      const t = peek();
      if (!(t.type === 'STRING' || t.type === 'IDENT' || KEYWORD_TOKENS.has(t.type)))
        throw new DevabhashaError('विन्यासदोषः: pattern key must be a name or string',
          { line: t.line, col: t.col, kind: 'parse' });
      next();
      const key = t.value;
      let prop;
      if (check('OP', ':')) { next(); prop = { key, ...classifyValue(), line: t.line, col: t.col }; }
      else prop = { key, kind: 'bind', name: key, line: t.line, col: t.col };   // shorthand
      // shorthand/aliased bind position: prefer the binding-name token if present
      if (prop.kind === 'bind' && prop.name === key) { prop.line = t.line; prop.col = t.col; }
      props.push(prop);
      if (check('OP', ',')) next();
    }
    expect('OP', '}');
    return { type: 'MatchObject', props, line: kt.line, col: kt.col };
  }

  // [ अ, ब, ०, ...शेषम् ] — an array pattern. Each element is a BINDING
  // (identifier), a CONSTRAINT (literal), or a nested pattern; an optional
  // trailing `...name` binds the remaining elements. Without a rest the length
  // must match exactly; with one it must be at least the fixed count.
  function parseMatchArray() {
    const lb = expect('OP', '[');
    const elements = [];
    let rest = null;
    while (!check('OP', ']') && !check('EOF')) {
      if (check('OP', '...')) {
        next();
        const rt = expect('IDENT');
        rest = { name: rt.value, line: rt.line, col: rt.col };
        break;                       // rest must be the final element
      }
      elements.push(classifyValue());
      if (check('OP', ',')) next();
    }
    expect('OP', ']');
    return { type: 'MatchArray', elements, rest, line: lb.line, col: lb.col };
  }

  // प्रत्येकम् (वस्तु : समूह) { ... }  → for (const वस्तु of समूह)
  function parseFor() {
    next(); // FOR
    expect('OP', '(');
    const it = expect('IDENT');
    expect('OP', ':');
    const iterable = parseExpression();
    expect('OP', ')');
    const body = parseBlock();
    return { type: 'ForOf', item: it.value, iterable, body, namePos: { line: it.line, col: it.col } };
  }

  function parsePrint() {
    next(); // PRINT
    expect('OP', '(');
    const args = [];
    while (!check('OP', ')')) {
      args.push(parseExpression());
      if (check('OP', ',')) next();
    }
    expect('OP', ')');
    return { type: 'Print', args };
  }

  // ---- expressions (Pratt) ------------------------------------------

  const BINARY_PREC = {
    '??': 1,
    '||': 1, '&&': 2,
    '==': 3, '!=': 3, '===': 3, '!==': 3,
    '<': 4, '>': 4, '<=': 4, '>=': 4,
    '+': 5, '-': 5,
    '*': 6, '/': 6, '%': 6,
  };

  // compound assignment operators → the underlying binary op
  const COMPOUND = {
    '+=': '+', '-=': '-', '*=': '*', '/=': '/', '%=': '%',
  };

  function parseExpression() {
    return parseAssignment();
  }

  function parseAssignment() {
    const left = parseOrElse();

    // compound assignment: x += y  →  x = x + y
    const tok = peek();
    if (tok.type === 'OP' && COMPOUND[tok.value]) {
      const op = COMPOUND[tok.value];
      next();
      const right = parseAssignment();   // RHS may itself be assignment/ternary
      if (left.type !== 'Identifier' && left.type !== 'Member') {
        throw new DevabhashaError('अमान्यं नियोजनम् (invalid assignment target)', { line: peek().line, col: peek().col, kind: 'parse' });
      }
      return {
        type: 'Assign',
        target: left,
        value: { type: 'Binary', op, left, right },
      };
    }

    if (check('OP', '=')) {
      next();
      const right = parseAssignment();
      if (left.type !== 'Identifier' && left.type !== 'Member') {
        throw new DevabhashaError('अमान्यं नियोजनम् (invalid assignment target)', { line: peek().line, col: peek().col, kind: 'parse' });
      }
      return { type: 'Assign', target: left, value: right };
    }
    return left;
  }

  // result अथवा fallback — yield the Result's मूल्यम् if सफल, else the fallback.
  // Sits just below assignment, above ternary, and is right-associative so
  // chains read left-to-right:  अ अथवा ब अथवा ग  =  अ अथवा (ब अथवा ग).
  function parseOrElse() {
    const left = parseTernary();
    if (check('ORELSE')) {
      next();
      const fallback = parseOrElse();
      return { type: 'OrElse', value: left, fallback };
    }
    return left;
  }

  // ternary:  परीक्षा ? तदा : अन्यथा   (sits between assignment and binary)
  function parseTernary() {
    const cond = parseBinary(0);
    if (check('OP', '?')) {
      next();
      const consequent = parseAssignment();
      expect('OP', ':');
      const alternate = parseAssignment();
      return { type: 'Ternary', test: cond, consequent, alternate };
    }
    return cond;
  }

  function parseBinary(minPrec) {
    let left = parseUnary();
    while (check('OP') && BINARY_PREC[peek().value] !== undefined) {
      const op = peek().value;
      const prec = BINARY_PREC[op];
      if (prec < minPrec) break;
      next();
      const right = parseBinary(prec + 1);
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  function parseUnary() {
    if (check('OP', '!') || check('OP', '-')) {
      const op = next().value;
      return { type: 'Unary', op, argument: parseUnary() };
    }
    // प्रतीक्षा <expr> — await a promise (only valid in an async function)
    if (check('AWAIT')) {
      next();
      return { type: 'Await', argument: parseUnary() };
    }
    return parsePostfix();
  }

  // calls, member access, indexing
  function parsePostfix() {
    let node = parsePrimary();
    while (true) {
      if (check('OP', '(')) {
        next();
        const args = [];
        while (!check('OP', ')')) {
          args.push(parseExpression());
          if (check('OP', ',')) next();
        }
        expect('OP', ')');
        node = { type: 'Call', callee: node, args };
      } else if (check('OP', '.')) {
        next();
        // Property names live in their own namespace: a word that is a
        // keyword elsewhere (e.g. योजय = MOUNT) is still a valid property
        // name here (योजय = array push). Accept any word token's value.
        const t = peek();
        if (t.type === 'IDENT' || KEYWORD_TOKENS.has(t.type)) {
          next();
          node = { type: 'Member', object: node, property: t.value, computed: false };
        } else {
          throw new DevabhashaError(`expected property name after '.' but found '${t.value}'`, { line: t.line, col: t.col, kind: 'parse' });
        }
      } else if (check('OP', '[')) {
        next();
        const prop = parseExpression();
        expect('OP', ']');
        node = { type: 'Member', object: node, property: prop, computed: true };
      } else break;
    }
    // postfix ++ / -- :  x++  →  Update node
    if (check('OP', '++') || check('OP', '--')) {
      const op = next().value;
      if (node.type !== 'Identifier' && node.type !== 'Member') {
        throw new DevabhashaError('++/-- needs a variable target', { line: peek().line, col: peek().col, kind: 'parse' });
      }
      node = { type: 'Update', op, target: node, prefix: false };
    }
    return node;
  }

  function parsePrimary() {
    if (check('NUMBER')) return { type: 'Number', value: next().value };
    if (check('STRING')) return { type: 'String', value: next().value };
    // सूत्र(expr) — a reactive reference: captures expr unevaluated (a live
    // thread to the cells it reads) so a component can bind it fine-grained.
    if (check('SUTRA')) {
      next();
      expect('OP', '(');
      const expr = parseExpression();
      expect('OP', ')');
      return { type: 'Sutra', expr };
    }
    if (check('TEMPLATE')) {
      const t = next();
      // parse each embedded expression source into an AST
      const parts = t.exprs.map(srcExpr => {
        const sub = parse(tokenize(srcExpr));
        if (!sub.body.length || sub.body[0].type !== 'ExpressionStatement') {
          throw new DevabhashaError('अन्तर्न्यासदोषः: {…} must contain a single expression',
            { line: t.line, col: t.col, kind: 'parse' });
        }
        return sub.body[0].expression;
      });
      return { type: 'Template', chunks: t.chunks, parts };
    }
    if (check('TRUE')) { next(); return { type: 'Boolean', value: true }; }
    if (check('FALSE')) { next(); return { type: 'Boolean', value: false }; }
    if (check('NULL')) { next(); return { type: 'Null' }; }
    if (check('IDENT')) {
      const t = next();
      return { type: 'Identifier', name: t.value, line: t.line, col: t.col };
    }

    // anonymous function expression: कार्य (params) { ... }
    if (check('FUNC')) {
      next();
      const params = parseParams();
      const returnType = check('OP', ':') ? (next(), parseType()) : null;
      const body = parseBlock();
      return { type: 'FuncExpr', params, paramTypes: params.__types, returnType, body, async: false };
    }
    // async function expression: असमकालिक कार्य (params) { ... }
    if (check('ASYNC')) {
      next();
      if (!check('FUNC')) {
        throw new DevabhashaError('असमकालिकदोषः: असमकालिक must be followed by कार्य',
          { line: peek().line, col: peek().col, kind: 'parse' });
      }
      next(); // FUNC
      const params = parseParams();
      const returnType = check('OP', ':') ? (next(), parseType()) : null;
      const body = parseBlock();
      return { type: 'FuncExpr', params, paramTypes: params.__types, returnType, body, async: true };
    }

    // web-layer builtins as expressions
    if (check('ELEMENT')) return parseElement();
    if (check('MOUNT')) return parseBuiltinCall('Mount');
    if (check('LISTEN')) return parseBuiltinCall('Listen');
    if (check('CONSTRUCT')) return parseConstruct();
    if (check('OBJECT')) return parseObjectLiteral();

    // array literal
    if (check('OP', '[')) {
      next();
      const elements = [];
      while (!check('OP', ']')) {
        elements.push(parseExpression());
        if (check('OP', ',')) next();
      }
      expect('OP', ']');
      return { type: 'Array', elements };
    }

    // grouping
    if (check('OP', '(')) {
      next();
      const e = parseExpression();
      expect('OP', ')');
      return e;
    }

    const t = peek();
    throw new DevabhashaError(`अनपेक्षितम् (unexpected) '${t.value}' (${t.type})`, { line: t.line, col: t.col, kind: 'parse' });
  }

  // अङ्गम्("div", "नमस्ते", [...children])
  function parseElement() {
    next(); // ELEMENT
    expect('OP', '(');
    const args = [];
    while (!check('OP', ')')) {
      args.push(parseExpression());
      if (check('OP', ',')) next();
    }
    expect('OP', ')');
    return { type: 'ElementExpr', args };
  }

  function parseBuiltinCall(kind) {
    next();
    expect('OP', '(');
    const args = [];
    while (!check('OP', ')')) {
      args.push(parseExpression());
      if (check('OP', ',')) next();
    }
    expect('OP', ')');
    return { type: kind, args };
  }

  // ---- kāraka construction -------------------------------------------
  //
  //   रचय  <case-noun> [value]  <case-noun> [value]  …
  //
  // Each case-marked noun contributes a ROLE (from its vibhakti ending).
  // Arguments may appear in ANY ORDER — they're collected into a slot map,
  // not a positional list. A noun whose stem names a tag/event is
  // self-valued; otherwise the following expression is its value.
  function isCaseNoun(tok) {
    if (!tok || tok.type !== 'IDENT') return null;
    return analyze(tok.value); // {stem, case, karaka} | null
  }

  // Distinguish a रूप override block `{ वर्णः: … }` from a समास children
  // block `{ रचय … }`. We're positioned at '{'. It's a style block iff the
  // token after '{' is a name/string AND the one after that is ':'.
  function looksLikeStyleBlock() {
    const a = peek(1), b = peek(2);
    if (!a || !b) return false;
    const nameLike = a.type === 'IDENT' || a.type === 'STRING' || KEYWORD_TOKENS.has(a.type);
    return nameLike && b.type === 'OP' && b.value === ':';
  }

  // Parse a { key: value, ... } style body into translated pairs.
  // Assumes the current token is '{'.
  function parseStylePairs() {
    expect('OP', '{');
    const pairs = [];
    while (!check('OP', '}') && !check('EOF')) {
      const t = peek();
      let key;
      if (t.type === 'STRING' || t.type === 'IDENT' || KEYWORD_TOKENS.has(t.type)) {
        next();
        key = t.value;
      } else {
        throw new DevabhashaError('रूपदोषः: style property must be a name', { line: t.line, col: t.col, kind: 'parse' });
      }
      expect('OP', ':');
      const valTok = peek();
      let value;
      const loneWord = (valTok.type === 'IDENT' || KEYWORD_TOKENS.has(valTok.type)) &&
        peek(1) && (peek(1).type === 'OP' && (peek(1).value === ',' || peek(1).value === '}'));
      if (loneWord) {
        next();
        value = { kind: 'word', value: valTok.value };
      } else {
        value = { kind: 'expr', value: parseExpression() };
      }
      pairs.push({ key, value });
      if (check('OP', ',')) next();
    }
    expect('OP', '}');
    return pairs;
  }

  // रूपनाम X = रूप { ... }  — declare a reusable named style.
  // Desugars to a const binding whose value is the style object.
  function parseStyleName() {
    next(); // STYLENAME
    const nt = expect('IDENT');
    expect('OP', '=');
    expect('STYLE');
    const pairs = parseStylePairs();
    return { type: 'StyleDecl', name: nt.value, pairs, namePos: { line: nt.line, col: nt.col } };
  }

  // भाव x = init  — declare a reactive state cell.
  function parseStateDecl() {
    next(); // STATE
    const nt = expect('IDENT');
    let init = null;
    if (check('OP', '=')) { next(); init = parseExpression(); }
    return { type: 'StateDecl', name: nt.value, init, namePos: { line: nt.line, col: nt.col } };
  }

  // दृश्य { ... }  or  दृश्य (container) { ... }
  // The block's final expression statement is the rendered view. With no
  // container, the runtime mounts to the default root (stage/body).
  function parseView() {
    next(); // VIEW
    let container = null;
    if (check('OP', '(')) {
      next();
      container = parseExpression();
      expect('OP', ')');
    }
    const body = parseBlock();
    return { type: 'View', container, body };
  }

  // निर्यात <declaration>  — mark a declaration as exported.
  //   निर्यात कार्य द्वि(न){ … }
  //   निर्यात नियत पाई = ३.१४।
  //   निर्यात रूपनाम कार्डः = रूप { … }।
  function parseExport() {
    next(); // EXPORT
    const decl = parseStatement();
    const exportable = new Set(['VarDecl', 'FuncDecl', 'StyleDecl', 'StateDecl']);
    if (!exportable.has(decl.type)) {
      throw new DevabhashaError('निर्यातदोषः: only declarations (चर/नियत/कार्य/रूपनाम/भाव) can be exported',
        { line: peek().line, col: peek().col, kind: 'parse' });
    }
    // the exported binding's name
    const name = decl.name;
    return { type: 'Export', name, decl };
  }

  // आयात — three forms:
  //   आयात { द्वि, त्रि } आ "गणित"।        named imports
  //   आयात * रूपेण ग आ "गणित"।             namespace import (ग.द्वि …)
  //   आयात "उपकरणम्"।                       side-effect import (run the module)
  function parseImport() {
    next(); // IMPORT
    // namespace:  * रूपेण <name>
    if (check('OP', '*')) {
      next();
      // रूपेण ("as") — accept an IDENT meaning "as"; we use आ-less alias via 'रूपेण'
      const asTok = peek();
      if (asTok.type === 'IDENT' && asTok.value === 'रूपेण') next();
      const alias = expect('IDENT').value;
      expect('FROM');
      const source = expect('STRING').value;
      return { type: 'Import', kind: 'namespace', alias, names: null, source };
    }
    // named:  { a, b, c } आ "..."
    if (check('OP', '{')) {
      next();
      const names = [];
      while (!check('OP', '}') && !check('EOF')) {
        names.push(expect('IDENT').value);
        if (check('OP', ',')) next();
      }
      expect('OP', '}');
      expect('FROM');
      const source = expect('STRING').value;
      return { type: 'Import', kind: 'named', names, alias: null, source };
    }
    // side-effect:  आयात "..."
    if (check('STRING')) {
      const source = next().value;
      return { type: 'Import', kind: 'effect', names: null, alias: null, source };
    }
    throw new DevabhashaError('आयातदोषः: expected { names } आ "module", * रूपेण name आ "module", or "module"',
      { line: peek().line, col: peek().col, kind: 'parse' });
  }

  function parseConstruct() {
    next(); // CONSTRUCT
    const slots = {};   // slotName -> AST/value
    const order = [];   // record kāraka order purely for diagnostics
    let plural = false;  // बहुवचन on the कर्तृ (tag) → an element GROUP
    let dual = false;    // द्विवचन on the कर्तृ (tag) → a PAIR (a group of two)

    while (true) {
      const tok = peek();
      const a = isCaseNoun(tok);
      if (!a) break; // no more case-marked arguments → construction ends

      next(); // consume the case-marked noun
      const slot = KARAKA_TO_SLOT[a.karaka];
      // record role + position so semantic analysis can flag a duplicate
      // कारक (two arguments filling the same slot — the earlier is discarded).
      order.push({ karaka: a.karaka, slot, word: tok.value, line: tok.line, col: tok.col });

      // वचन agreement: a plural कर्तृ (nominative tag, e.g. पटाः "buttons")
      // means the element distributes over the समास children — one element
      // per child. The role is number-invariant; only the tag's number
      // switches single-element vs. group construction. A द्विवचन कर्तृ (e.g.
      // पटौ "two buttons") is a PAIR — a group the grammar expects to hold
      // exactly two children (checked in semantic analysis).
      if (a.karaka === KARAKA.KARTR && a.number === VACANA.BAHU) plural = true;
      if (a.karaka === KARAKA.KARTR && a.number === VACANA.DVI) dual = true;

      if (slot === 'tag' && TAG_STEMS[a.stem]) {
        slots.tag = { type: 'String', value: TAG_STEMS[a.stem] };
      } else if (slot === 'event' && EVENT_STEMS[a.stem]) {
        slots.event = { type: 'String', value: EVENT_STEMS[a.stem] };
      } else {
        // role marker followed by its value expression
        slots[slot] = parseExpression();
      }
    }

    if (!slots.tag) {
      throw new DevabhashaError('रचयदोषः: no कर्तृ (nominative) naming the element kind', { line: peek().line, col: peek().col, kind: 'parse' });
    }

    // रूप — style.  Three forms:
    //   रूप { वर्णः: रक्तः }          inline block
    //   रूप मुख्यपटः                  named-style reference (an identifier)
    //   रूप मुख्यपटः { अन्तरालः: … }   named base + inline overrides
    let style = null;
    if (check('STYLE')) {
      next();
      let base = null;
      if (check('IDENT')) {
        base = { type: 'Identifier', name: next().value };
      }
      let pairs = [];
      // A '{' here is style-overrides ONLY if it looks like key:value pairs
      // (i.e. `{ word : ...`). Otherwise the '{' belongs to the समास children
      // block — important after a bare named ref:  रूप कार्डः { ...children }.
      if (check('OP', '{') && looksLikeStyleBlock()) {
        pairs = parseStylePairs();
      }
      style = { base, pairs };
    }

    // समास (compound) block form: a तत्पुरुष container whose body is a
    // द्वन्द्व (sibling list) of child constructions and/or expressions.
    let children = null;
    if (check('OP', '{')) {
      next();
      children = [];
      while (!check('OP', '}') && !check('EOF')) {
        eatSemi();
        if (check('OP', '}')) break;
        // a child is either a nested रचय or any expression (text/value)
        children.push(parseExpression());
        eatSemi();
      }
      expect('OP', '}');
    }

    return { type: 'Construct', slots, order, children, style, plural, dual };
  }

  // कोष { कुञ्जी: मूल्यम्, अन्या: मूल्यम् }  →  object literal
  function parseObjectLiteral() {
    next(); // OBJECT
    expect('OP', '{');
    const props = [];
    while (!check('OP', '}')) {
      let key;
      const t = peek();
      // Keys live in their own namespace: a STRING, an IDENT, or any word
      // that happens to be a keyword elsewhere (चर, यदि…) is a valid key.
      if (t.type === 'STRING' || t.type === 'IDENT' || KEYWORD_TOKENS.has(t.type)) {
        next();
        key = { type: 'String', value: t.value };
      } else {
        throw new DevabhashaError('कोषदोषः: object key must be a name or string', { line: peek().line, col: peek().col, kind: 'parse' });
      }
      expect('OP', ':');
      const value = parseExpression();
      props.push({ key, value });
      if (check('OP', ',')) next();
    }
    expect('OP', '}');
    return { type: 'ObjectLiteral', props };
  }

  return parseProgram();
}
