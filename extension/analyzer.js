var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/analyzer.js
var analyzer_exports = {};
__export(analyzer_exports, {
  VOCAB: () => VOCAB,
  completions: () => completions,
  definition: () => definition,
  diagnostics: () => diagnostics,
  hover: () => hover,
  renameOccurrences: () => renameOccurrences,
  wordAt: () => wordAt
});
module.exports = __toCommonJS(analyzer_exports);

// src/keywords.js
var KEYWORDS = {
  // declarations
  "\u091A\u0930": "LET",
  // cara — "it varies" → mutable binding
  "\u0928\u093F\u092F\u0924": "CONST",
  // niyata — "fixed" → constant
  "\u0915\u093E\u0930\u094D\u092F": "FUNC",
  // kārya — "work to be done" → function
  "\u092B\u0932\u092E\u094D": "RETURN",
  // phalam — "fruit/result" → return
  // control flow
  "\u092F\u0926\u093F": "IF",
  // yadi — if
  "\u0905\u0928\u094D\u092F\u0925\u093E": "ELSE",
  // anyathā — otherwise
  "\u092F\u093E\u0935\u0924\u094D": "WHILE",
  // yāvat — "as long as" → while
  "\u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915\u092E\u094D": "FOR",
  // pratyekam — "for each" → for-of
  "\u092D\u0919\u094D\u0917": "BREAK",
  // bhaṅga — "breaking" → break
  "\u0905\u0928\u0941\u0935\u0943\u0924\u094D\u0924\u092E\u094D": "CONTINUE",
  // anuvṛttam — "continuing" → continue
  // literals
  "\u0938\u0924\u094D\u092F\u092E\u094D": "TRUE",
  // satyam — true
  "\u0905\u0938\u0924\u094D\u092F\u092E\u094D": "FALSE",
  // asatyam — false
  "\u0936\u0942\u0928\u094D\u092F\u092E\u094D": "NULL",
  // śūnyam — "void/zero" → null
  // web / DOM layer
  "\u0926\u0930\u094D\u0936\u092F": "PRINT",
  // darśaya — "cause to show" → console.log
  "\u0905\u0919\u094D\u0917\u092E\u094D": "ELEMENT",
  // aṅgam — "limb/part" → createElement
  "\u092F\u094B\u091C\u092F": "MOUNT",
  // yojaya — "join/attach" → append to DOM
  "\u0936\u094D\u0930\u094B\u0924\u093E": "LISTEN",
  // śrotā — "listener" → addEventListener
  "\u0930\u091A\u092F": "CONSTRUCT",
  // racaya — "construct" → kāraka-based DOM builder
  "\u0915\u094B\u0937": "OBJECT",
  // kośa — "treasury/dictionary" → object literal
  "\u0930\u0942\u092A": "STYLE",
  // rūpa — "form/appearance" → style block
  "\u0930\u0942\u092A\u0928\u093E\u092E": "STYLENAME",
  // rūpanāma — "form-name" → named reusable style
  "\u092D\u093E\u0935": "STATE",
  // bhāva — "state/condition" → reactive state cell
  "\u0926\u0943\u0936\u094D\u092F": "VIEW",
  // dṛśya — "view/visible" → reactive view region
  "\u0928\u093F\u0930\u094D\u092F\u093E\u0924": "EXPORT",
  // niryāta — "sending out" → export
  "\u0906\u092F\u093E\u0924": "IMPORT",
  // āyāta — "incoming" → import
  "\u0906": "FROM",
  // ā — "from" → module source preposition
  "\u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915": "ASYNC",
  // asamakālika — "asynchronous" → async function
  "\u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E": "AWAIT",
  // pratīkṣā — "waiting" → await
  "\u0905\u0925\u0935\u093E": "ORELSE",
  // athavā — "or else" → Result value-or-fallback
  "\u0938\u0942\u0924\u094D\u0930": "SUTRA"
  // sūtra — "thread" → a reactive reference (lazy, live)
};
var TOKEN_TO_WORD = Object.fromEntries(
  Object.entries(KEYWORDS).map(([word, tok]) => [tok, word])
);
var OPERATORS = [
  "===",
  "!==",
  "??",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "++",
  "--",
  "+",
  "-",
  "*",
  "/",
  "%",
  "=",
  "<",
  ">",
  "!",
  "?",
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
  ",",
  ";",
  ".",
  ":"
];
var DANDA = "\u0964";

// src/errors.js
var DevabhashaError = class extends Error {
  constructor(message, { line = null, col = null, kind = "parse" } = {}) {
    super(message);
    this.name = "DevabhashaError";
    this.line = line;
    this.col = col;
    this.kind = kind;
  }
};

// src/lexer.js
var DEVA = /[\u0900-\u0963\u0966-\u097F]/;
var DEVA_DIGITS = "\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F";
function isWordChar(ch) {
  return DEVA.test(ch) || /[A-Za-z_]/.test(ch);
}
function isDigit(ch) {
  return /[0-9]/.test(ch) || DEVA_DIGITS.includes(ch);
}
function normalizeDigit(ch) {
  const i = DEVA_DIGITS.indexOf(ch);
  return i >= 0 ? String(i) : ch;
}
function tokenize(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const push = (type, value) => tokens.push({ type, value, line, col });
  const advance = (n = 1) => {
    i += n;
    col += n;
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\n") {
      line++;
      col = 1;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      advance();
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (ch === DANDA) {
      push("SEMI", ";");
      advance();
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line, startCol = col;
      advance();
      let str = "";
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") {
          str += src[i] + src[i + 1];
          advance(2);
        } else if (src[i] === "\n") {
          line++;
          col = 1;
          str += "\n";
          i++;
        } else {
          str += src[i];
          advance();
        }
      }
      advance();
      tokens.push({ type: "STRING", value: str, line: startLine, col: startCol });
      continue;
    }
    if (isDigit(ch)) {
      let num = "";
      while (i < src.length && (isDigit(src[i]) || src[i] === ".")) {
        num += normalizeDigit(src[i]);
        advance();
      }
      push("NUMBER", num);
      continue;
    }
    if (isWordChar(ch)) {
      const wStartLine = line, wStartCol = col;
      let word = "";
      while (i < src.length && (isWordChar(src[i]) || isDigit(src[i]))) {
        word += src[i];
        advance();
      }
      if (word === "\u092A\u093E\u0920" && (src[i] === '"' || src[i] === "'")) {
        const quote = src[i];
        advance();
        const chunks = [""];
        const exprs = [];
        while (i < src.length && src[i] !== quote) {
          if (src[i] === "\\") {
            const nxt = src[i + 1];
            if (nxt === "{" || nxt === "}") {
              chunks[chunks.length - 1] += nxt;
              advance(2);
            } else {
              chunks[chunks.length - 1] += src[i] + nxt;
              advance(2);
            }
          } else if (src[i] === "{") {
            advance();
            let depth = 1, expr = "";
            while (i < src.length && depth > 0) {
              if (src[i] === "{") depth++;
              else if (src[i] === "}") {
                depth--;
                if (depth === 0) break;
              }
              if (src[i] === "\n") {
                line++;
                col = 1;
                expr += "\n";
                i++;
              } else {
                expr += src[i];
                advance();
              }
            }
            advance();
            exprs.push(expr);
            chunks.push("");
          } else if (src[i] === "\n") {
            line++;
            col = 1;
            chunks[chunks.length - 1] += "\n";
            i++;
          } else {
            chunks[chunks.length - 1] += src[i];
            advance();
          }
        }
        advance();
        tokens.push({ type: "TEMPLATE", chunks, exprs, line: wStartLine, col: wStartCol });
        continue;
      }
      if (KEYWORDS[word]) push(KEYWORDS[word], word);
      else push("IDENT", word);
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    if (OPERATORS.includes(three)) {
      push("OP", three);
      advance(3);
      continue;
    }
    if (OPERATORS.includes(two)) {
      const t = two === ";" ? "SEMI" : "OP";
      push(t, two);
      advance(2);
      continue;
    }
    if (OPERATORS.includes(ch)) {
      const t = ch === ";" ? "SEMI" : "OP";
      push(t, ch);
      advance();
      continue;
    }
    throw new DevabhashaError(`\u0905\u091C\u094D\u091E\u093E\u0924\u0902 \u091A\u093F\u0939\u094D\u0928\u092E\u094D (unknown character) '${ch}'`, { line, col, kind: "lex" });
  }
  push("EOF", null);
  return tokens;
}

// src/vibhakti.js
var KARAKA = {
  KARTR: "kartr",
  // agent      — nominative   (प्रथमा)
  KARMAN: "karman",
  // patient    — accusative   (द्वितीया)
  KARANA: "karana",
  // instrument — instrumental (तृतीया)
  SAMPRADANA: "sampradana",
  // recipient  — dative       (चतुर्थी)
  APADANA: "apadana",
  // source     — ablative     (पञ्चमी)
  SAMBANDHA: "sambandha",
  // relation   — genitive     (षष्ठी)
  ADHIKARANA: "adhikarana"
  // locus      — locative     (सप्तमी)
};
var A_STEM_SINGULAR = [
  // [ surface ending, case, kāraka,  stemEndsWith ]
  // The stem is recovered by removing `ending` and restoring final 'अ'
  // where the paradigm fuses it.
  { end: "\u0938\u094D\u092E\u093F\u0928\u094D", case: "locative", karaka: KARAKA.ADHIKARANA, restore: "\u0905" },
  // rare pronominal; keep before others
  { end: "\u0947\u0937\u0941", case: "locative_pl", karaka: KARAKA.ADHIKARANA, restore: "\u0905" },
  { end: "\u0947\u0928", case: "instrumental", karaka: KARAKA.KARANA, restore: "\u0905" },
  // रक्तेन
  { end: "\u093E\u092F", case: "dative", karaka: KARAKA.SAMPRADANA, restore: "\u0905" },
  // रक्ताय
  { end: "\u093E\u0924\u094D", case: "ablative", karaka: KARAKA.APADANA, restore: "\u0905" },
  // रक्तात्
  { end: "\u0938\u094D\u092F", case: "genitive", karaka: KARAKA.SAMBANDHA, restore: "\u0905" },
  // रक्तस्य
  { end: "\u0947", case: "locative", karaka: KARAKA.ADHIKARANA, restore: "\u0905" },
  // रक्ते
  { end: "\u092E\u094D", case: "accusative", karaka: KARAKA.KARMAN, restore: "\u0905" },
  // रक्तम्
  { end: "\u0903", case: "nominative", karaka: KARAKA.KARTR, restore: "\u0905" }
  // रक्तः
];
function analyze(word) {
  for (const row of A_STEM_SINGULAR) {
    if (word.endsWith(row.end)) {
      let stem = word.slice(0, word.length - row.end.length);
      if (stem.length === 0) continue;
      return { stem, case: row.case, karaka: row.karaka, ending: row.end };
    }
  }
  return null;
}
var KARAKA_NAME_SA = {
  [KARAKA.KARTR]: "\u0915\u0930\u094D\u0924\u0943",
  [KARAKA.KARMAN]: "\u0915\u0930\u094D\u092E",
  [KARAKA.KARANA]: "\u0915\u0930\u0923",
  [KARAKA.SAMPRADANA]: "\u0938\u092E\u094D\u092A\u094D\u0930\u0926\u093E\u0928",
  [KARAKA.APADANA]: "\u0905\u092A\u093E\u0926\u093E\u0928",
  [KARAKA.SAMBANDHA]: "\u0938\u092E\u094D\u092C\u0928\u094D\u0927",
  [KARAKA.ADHIKARANA]: "\u0905\u0927\u093F\u0915\u0930\u0923"
};

// src/karaka-web.js
var KARAKA_TO_SLOT = {
  [KARAKA.KARTR]: "tag",
  // कर्तृ  (nom)  — what the element IS (div, button…)
  [KARAKA.KARMAN]: "content",
  // कर्म   (acc)  — content placed into it
  [KARAKA.KARANA]: "handler",
  // करण   (instr)— the handler function (instrument)
  [KARAKA.SAMPRADANA]: "event",
  // सम्प्रदान (dat) — event it responds to
  [KARAKA.ADHIKARANA]: "parent",
  // अधिकरण (loc) — where it mounts (locus)
  [KARAKA.APADANA]: "source",
  // अपादान (abl) — data source it derives from
  [KARAKA.SAMBANDHA]: "prop"
  // सम्बन्ध (gen) — attribute/property relation
};
var TAG_STEMS = {
  "\u092A\u091F": "button",
  // paṭa — "cloth/panel" → button
  "\u092E\u0942\u0932": "div",
  // mūla — "root/base"   → div (generic container)
  "\u0936\u0940\u0930\u094D\u0937": "h1",
  // śīrṣa — "head"       → heading
  "\u0935\u093E\u0915\u094D\u092F": "p",
  // vākya — "sentence"   → paragraph
  "\u0938\u0942\u091A\u0940": "ul",
  // sūcī — "list"        → list
  "\u092A\u0919\u094D\u0915\u094D\u0924\u093F": "li",
  // paṅkti — "row/line"  → list item
  "\u092A\u0940\u0920": "input",
  // pīṭha — "seat/field" → input
  "\u091A\u093F\u0924\u094D\u0930": "img",
  // citra — "picture"    → image
  "\u0938\u0947\u0924\u0941": "a",
  // setu — "bridge/link" → anchor
  "\u0915\u094D\u0937\u0947\u0924\u094D\u0930": "span"
  // kṣetra — "field/area"→ span
};
var EVENT_STEMS = {
  "\u0938\u094D\u092A\u0930\u094D\u0936": "click",
  // sparśa — "touch"   → click
  "\u092A\u0930\u093F\u0935\u0930\u094D\u0924\u0928": "change",
  // parivartana        → change
  "\u0928\u093F\u0935\u0947\u0936": "input",
  // niveśa — "entry"   → input
  "\u092A\u094D\u0930\u0947\u0937\u0923": "submit"
  // preṣaṇa — "sending"→ submit
};

// src/parser.js
var KEYWORD_TOKENS = new Set(Object.values(KEYWORDS));
function parse(tokens) {
  let pos = 0;
  const peek = (k = 0) => tokens[pos + k];
  const next = () => tokens[pos++];
  const check = (type, value) => peek().type === type && (value === void 0 || peek().value === value);
  function expect(type, value) {
    if (!check(type, value)) {
      const t = peek();
      throw new DevabhashaError(
        `expected ${value ?? type} but found '${t.value}' (${t.type})`,
        { line: t.line, col: t.col, kind: "parse" }
      );
    }
    return next();
  }
  function eatSemi() {
    while (check("SEMI")) next();
  }
  function parseProgram() {
    const body = [];
    while (!check("EOF")) {
      eatSemi();
      if (check("EOF")) break;
      body.push(parseStatement());
      eatSemi();
    }
    return { type: "Program", body };
  }
  function parseStatement() {
    const startTok = peek();
    const node = parseStatementInner();
    if (node && node.line == null && startTok) {
      node.line = startTok.line;
      node.col = startTok.col;
    }
    return node;
  }
  function parseStatementInner() {
    if (check("LET") || check("CONST")) return parseVarDecl();
    if (check("FUNC")) return parseFuncDecl(false);
    if (check("ASYNC")) {
      next();
      if (!check("FUNC")) {
        throw new DevabhashaError(
          "\u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915\u0926\u094B\u0937\u0903: \u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915 must be followed by \u0915\u093E\u0930\u094D\u092F",
          { line: peek().line, col: peek().col, kind: "parse" }
        );
      }
      return parseFuncDecl(true);
    }
    if (check("RETURN")) return parseReturn();
    if (check("IF")) return parseIf();
    if (check("WHILE")) return parseWhile();
    if (check("FOR")) return parseFor();
    if (check("BREAK")) {
      next();
      return { type: "Break" };
    }
    if (check("CONTINUE")) {
      next();
      return { type: "Continue" };
    }
    if (check("PRINT")) return parsePrint();
    if (check("STYLENAME")) return parseStyleName();
    if (check("STATE")) return parseStateDecl();
    if (check("VIEW")) return parseView();
    if (check("EXPORT")) return parseExport();
    if (check("IMPORT")) return parseImport();
    if (check("OP", "{")) return parseBlock();
    const expr = parseExpression();
    return { type: "ExpressionStatement", expression: expr };
  }
  function parseBlock() {
    expect("OP", "{");
    const body = [];
    while (!check("OP", "}") && !check("EOF")) {
      eatSemi();
      if (check("OP", "}")) break;
      body.push(parseStatement());
      eatSemi();
    }
    expect("OP", "}");
    return { type: "Block", body };
  }
  function parseVarDecl() {
    const kind = next().type;
    const nt = expect("IDENT");
    let init = null;
    if (check("OP", "=")) {
      next();
      init = parseExpression();
    }
    return { type: "VarDecl", kind, name: nt.value, init, namePos: { line: nt.line, col: nt.col } };
  }
  function parseFuncDecl(isAsync = false) {
    next();
    const nt = expect("IDENT");
    const params = parseParams();
    const body = parseBlock();
    return {
      type: "FuncDecl",
      name: nt.value,
      params,
      body,
      async: isAsync,
      namePos: { line: nt.line, col: nt.col },
      paramPos: params.__pos
    };
  }
  function parseParams() {
    expect("OP", "(");
    const params = [];
    const pos2 = [];
    while (!check("OP", ")")) {
      const pt = expect("IDENT");
      params.push(pt.value);
      pos2.push({ line: pt.line, col: pt.col });
      if (check("OP", ",")) next();
    }
    expect("OP", ")");
    Object.defineProperty(params, "__pos", { value: pos2, enumerable: false });
    return params;
  }
  function parseReturn() {
    next();
    let arg = null;
    if (!check("SEMI") && !check("OP", "}") && !check("EOF")) {
      arg = parseExpression();
    }
    return { type: "Return", argument: arg };
  }
  function parseIf() {
    next();
    expect("OP", "(");
    const test = parseExpression();
    expect("OP", ")");
    const consequent = parseBlock();
    let alternate = null;
    if (check("ELSE")) {
      next();
      alternate = check("IF") ? parseIf() : parseBlock();
    }
    return { type: "If", test, consequent, alternate };
  }
  function parseWhile() {
    next();
    expect("OP", "(");
    const test = parseExpression();
    expect("OP", ")");
    const body = parseBlock();
    return { type: "While", test, body };
  }
  function parseFor() {
    next();
    expect("OP", "(");
    const it = expect("IDENT");
    expect("OP", ":");
    const iterable = parseExpression();
    expect("OP", ")");
    const body = parseBlock();
    return { type: "ForOf", item: it.value, iterable, body, namePos: { line: it.line, col: it.col } };
  }
  function parsePrint() {
    next();
    expect("OP", "(");
    const args = [];
    while (!check("OP", ")")) {
      args.push(parseExpression());
      if (check("OP", ",")) next();
    }
    expect("OP", ")");
    return { type: "Print", args };
  }
  const BINARY_PREC = {
    "??": 1,
    "||": 1,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "===": 3,
    "!==": 3,
    "<": 4,
    ">": 4,
    "<=": 4,
    ">=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6
  };
  const COMPOUND = {
    "+=": "+",
    "-=": "-",
    "*=": "*",
    "/=": "/",
    "%=": "%"
  };
  function parseExpression() {
    return parseAssignment();
  }
  function parseAssignment() {
    const left = parseOrElse();
    const tok = peek();
    if (tok.type === "OP" && COMPOUND[tok.value]) {
      const op = COMPOUND[tok.value];
      next();
      const right = parseAssignment();
      if (left.type !== "Identifier" && left.type !== "Member") {
        throw new DevabhashaError("\u0905\u092E\u093E\u0928\u094D\u092F\u0902 \u0928\u093F\u092F\u094B\u091C\u0928\u092E\u094D (invalid assignment target)", { line: peek().line, col: peek().col, kind: "parse" });
      }
      return {
        type: "Assign",
        target: left,
        value: { type: "Binary", op, left, right }
      };
    }
    if (check("OP", "=")) {
      next();
      const right = parseAssignment();
      if (left.type !== "Identifier" && left.type !== "Member") {
        throw new DevabhashaError("\u0905\u092E\u093E\u0928\u094D\u092F\u0902 \u0928\u093F\u092F\u094B\u091C\u0928\u092E\u094D (invalid assignment target)", { line: peek().line, col: peek().col, kind: "parse" });
      }
      return { type: "Assign", target: left, value: right };
    }
    return left;
  }
  function parseOrElse() {
    const left = parseTernary();
    if (check("ORELSE")) {
      next();
      const fallback = parseOrElse();
      return { type: "OrElse", value: left, fallback };
    }
    return left;
  }
  function parseTernary() {
    const cond = parseBinary(0);
    if (check("OP", "?")) {
      next();
      const consequent = parseAssignment();
      expect("OP", ":");
      const alternate = parseAssignment();
      return { type: "Ternary", test: cond, consequent, alternate };
    }
    return cond;
  }
  function parseBinary(minPrec) {
    let left = parseUnary();
    while (check("OP") && BINARY_PREC[peek().value] !== void 0) {
      const op = peek().value;
      const prec = BINARY_PREC[op];
      if (prec < minPrec) break;
      next();
      const right = parseBinary(prec + 1);
      left = { type: "Binary", op, left, right };
    }
    return left;
  }
  function parseUnary() {
    if (check("OP", "!") || check("OP", "-")) {
      const op = next().value;
      return { type: "Unary", op, argument: parseUnary() };
    }
    if (check("AWAIT")) {
      next();
      return { type: "Await", argument: parseUnary() };
    }
    return parsePostfix();
  }
  function parsePostfix() {
    let node = parsePrimary();
    while (true) {
      if (check("OP", "(")) {
        next();
        const args = [];
        while (!check("OP", ")")) {
          args.push(parseExpression());
          if (check("OP", ",")) next();
        }
        expect("OP", ")");
        node = { type: "Call", callee: node, args };
      } else if (check("OP", ".")) {
        next();
        const t = peek();
        if (t.type === "IDENT" || KEYWORD_TOKENS.has(t.type)) {
          next();
          node = { type: "Member", object: node, property: t.value, computed: false };
        } else {
          throw new DevabhashaError(`expected property name after '.' but found '${t.value}'`, { line: t.line, col: t.col, kind: "parse" });
        }
      } else if (check("OP", "[")) {
        next();
        const prop = parseExpression();
        expect("OP", "]");
        node = { type: "Member", object: node, property: prop, computed: true };
      } else break;
    }
    if (check("OP", "++") || check("OP", "--")) {
      const op = next().value;
      if (node.type !== "Identifier" && node.type !== "Member") {
        throw new DevabhashaError("++/-- needs a variable target", { line: peek().line, col: peek().col, kind: "parse" });
      }
      node = { type: "Update", op, target: node, prefix: false };
    }
    return node;
  }
  function parsePrimary() {
    if (check("NUMBER")) return { type: "Number", value: next().value };
    if (check("STRING")) return { type: "String", value: next().value };
    if (check("SUTRA")) {
      next();
      expect("OP", "(");
      const expr = parseExpression();
      expect("OP", ")");
      return { type: "Sutra", expr };
    }
    if (check("TEMPLATE")) {
      const t2 = next();
      const parts = t2.exprs.map((srcExpr) => {
        const sub = parse(tokenize(srcExpr));
        if (!sub.body.length || sub.body[0].type !== "ExpressionStatement") {
          throw new DevabhashaError(
            "\u0905\u0928\u094D\u0924\u0930\u094D\u0928\u094D\u092F\u093E\u0938\u0926\u094B\u0937\u0903: {\u2026} must contain a single expression",
            { line: t2.line, col: t2.col, kind: "parse" }
          );
        }
        return sub.body[0].expression;
      });
      return { type: "Template", chunks: t2.chunks, parts };
    }
    if (check("TRUE")) {
      next();
      return { type: "Boolean", value: true };
    }
    if (check("FALSE")) {
      next();
      return { type: "Boolean", value: false };
    }
    if (check("NULL")) {
      next();
      return { type: "Null" };
    }
    if (check("IDENT")) {
      const t2 = next();
      return { type: "Identifier", name: t2.value, line: t2.line, col: t2.col };
    }
    if (check("FUNC")) {
      next();
      const params = parseParams();
      const body = parseBlock();
      return { type: "FuncExpr", params, body, async: false };
    }
    if (check("ASYNC")) {
      next();
      if (!check("FUNC")) {
        throw new DevabhashaError(
          "\u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915\u0926\u094B\u0937\u0903: \u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915 must be followed by \u0915\u093E\u0930\u094D\u092F",
          { line: peek().line, col: peek().col, kind: "parse" }
        );
      }
      next();
      const params = parseParams();
      const body = parseBlock();
      return { type: "FuncExpr", params, body, async: true };
    }
    if (check("ELEMENT")) return parseElement();
    if (check("MOUNT")) return parseBuiltinCall("Mount");
    if (check("LISTEN")) return parseBuiltinCall("Listen");
    if (check("CONSTRUCT")) return parseConstruct();
    if (check("OBJECT")) return parseObjectLiteral();
    if (check("OP", "[")) {
      next();
      const elements = [];
      while (!check("OP", "]")) {
        elements.push(parseExpression());
        if (check("OP", ",")) next();
      }
      expect("OP", "]");
      return { type: "Array", elements };
    }
    if (check("OP", "(")) {
      next();
      const e = parseExpression();
      expect("OP", ")");
      return e;
    }
    const t = peek();
    throw new DevabhashaError(`\u0905\u0928\u092A\u0947\u0915\u094D\u0937\u093F\u0924\u092E\u094D (unexpected) '${t.value}' (${t.type})`, { line: t.line, col: t.col, kind: "parse" });
  }
  function parseElement() {
    next();
    expect("OP", "(");
    const args = [];
    while (!check("OP", ")")) {
      args.push(parseExpression());
      if (check("OP", ",")) next();
    }
    expect("OP", ")");
    return { type: "ElementExpr", args };
  }
  function parseBuiltinCall(kind) {
    next();
    expect("OP", "(");
    const args = [];
    while (!check("OP", ")")) {
      args.push(parseExpression());
      if (check("OP", ",")) next();
    }
    expect("OP", ")");
    return { type: kind, args };
  }
  function isCaseNoun(tok) {
    if (!tok || tok.type !== "IDENT") return null;
    return analyze(tok.value);
  }
  function looksLikeStyleBlock() {
    const a = peek(1), b = peek(2);
    if (!a || !b) return false;
    const nameLike = a.type === "IDENT" || a.type === "STRING" || KEYWORD_TOKENS.has(a.type);
    return nameLike && b.type === "OP" && b.value === ":";
  }
  function parseStylePairs() {
    expect("OP", "{");
    const pairs = [];
    while (!check("OP", "}") && !check("EOF")) {
      const t = peek();
      let key;
      if (t.type === "STRING" || t.type === "IDENT" || KEYWORD_TOKENS.has(t.type)) {
        next();
        key = t.value;
      } else {
        throw new DevabhashaError("\u0930\u0942\u092A\u0926\u094B\u0937\u0903: style property must be a name", { line: t.line, col: t.col, kind: "parse" });
      }
      expect("OP", ":");
      const valTok = peek();
      let value;
      const loneWord = (valTok.type === "IDENT" || KEYWORD_TOKENS.has(valTok.type)) && peek(1) && (peek(1).type === "OP" && (peek(1).value === "," || peek(1).value === "}"));
      if (loneWord) {
        next();
        value = { kind: "word", value: valTok.value };
      } else {
        value = { kind: "expr", value: parseExpression() };
      }
      pairs.push({ key, value });
      if (check("OP", ",")) next();
    }
    expect("OP", "}");
    return pairs;
  }
  function parseStyleName() {
    next();
    const nt = expect("IDENT");
    expect("OP", "=");
    expect("STYLE");
    const pairs = parseStylePairs();
    return { type: "StyleDecl", name: nt.value, pairs, namePos: { line: nt.line, col: nt.col } };
  }
  function parseStateDecl() {
    next();
    const nt = expect("IDENT");
    let init = null;
    if (check("OP", "=")) {
      next();
      init = parseExpression();
    }
    return { type: "StateDecl", name: nt.value, init, namePos: { line: nt.line, col: nt.col } };
  }
  function parseView() {
    next();
    let container = null;
    if (check("OP", "(")) {
      next();
      container = parseExpression();
      expect("OP", ")");
    }
    const body = parseBlock();
    return { type: "View", container, body };
  }
  function parseExport() {
    next();
    const decl = parseStatement();
    const exportable = /* @__PURE__ */ new Set(["VarDecl", "FuncDecl", "StyleDecl", "StateDecl"]);
    if (!exportable.has(decl.type)) {
      throw new DevabhashaError(
        "\u0928\u093F\u0930\u094D\u092F\u093E\u0924\u0926\u094B\u0937\u0903: only declarations (\u091A\u0930/\u0928\u093F\u092F\u0924/\u0915\u093E\u0930\u094D\u092F/\u0930\u0942\u092A\u0928\u093E\u092E/\u092D\u093E\u0935) can be exported",
        { line: peek().line, col: peek().col, kind: "parse" }
      );
    }
    const name = decl.name;
    return { type: "Export", name, decl };
  }
  function parseImport() {
    next();
    if (check("OP", "*")) {
      next();
      const asTok = peek();
      if (asTok.type === "IDENT" && asTok.value === "\u0930\u0942\u092A\u0947\u0923") next();
      const alias = expect("IDENT").value;
      expect("FROM");
      const source = expect("STRING").value;
      return { type: "Import", kind: "namespace", alias, names: null, source };
    }
    if (check("OP", "{")) {
      next();
      const names = [];
      while (!check("OP", "}") && !check("EOF")) {
        names.push(expect("IDENT").value);
        if (check("OP", ",")) next();
      }
      expect("OP", "}");
      expect("FROM");
      const source = expect("STRING").value;
      return { type: "Import", kind: "named", names, alias: null, source };
    }
    if (check("STRING")) {
      const source = next().value;
      return { type: "Import", kind: "effect", names: null, alias: null, source };
    }
    throw new DevabhashaError(
      '\u0906\u092F\u093E\u0924\u0926\u094B\u0937\u0903: expected { names } \u0906 "module", * \u0930\u0942\u092A\u0947\u0923 name \u0906 "module", or "module"',
      { line: peek().line, col: peek().col, kind: "parse" }
    );
  }
  function parseConstruct() {
    next();
    const slots = {};
    const order = [];
    while (true) {
      const tok = peek();
      const a = isCaseNoun(tok);
      if (!a) break;
      next();
      const slot = KARAKA_TO_SLOT[a.karaka];
      order.push(a.karaka);
      if (slot === "tag" && TAG_STEMS[a.stem]) {
        slots.tag = { type: "String", value: TAG_STEMS[a.stem] };
      } else if (slot === "event" && EVENT_STEMS[a.stem]) {
        slots.event = { type: "String", value: EVENT_STEMS[a.stem] };
      } else {
        slots[slot] = parseExpression();
      }
    }
    if (!slots.tag) {
      throw new DevabhashaError("\u0930\u091A\u092F\u0926\u094B\u0937\u0903: no \u0915\u0930\u094D\u0924\u0943 (nominative) naming the element kind", { line: peek().line, col: peek().col, kind: "parse" });
    }
    let style = null;
    if (check("STYLE")) {
      next();
      let base = null;
      if (check("IDENT")) {
        base = { type: "Identifier", name: next().value };
      }
      let pairs = [];
      if (check("OP", "{") && looksLikeStyleBlock()) {
        pairs = parseStylePairs();
      }
      style = { base, pairs };
    }
    let children = null;
    if (check("OP", "{")) {
      next();
      children = [];
      while (!check("OP", "}") && !check("EOF")) {
        eatSemi();
        if (check("OP", "}")) break;
        children.push(parseExpression());
        eatSemi();
      }
      expect("OP", "}");
    }
    return { type: "Construct", slots, order, children, style };
  }
  function parseObjectLiteral() {
    next();
    expect("OP", "{");
    const props = [];
    while (!check("OP", "}")) {
      let key;
      const t = peek();
      if (t.type === "STRING" || t.type === "IDENT" || KEYWORD_TOKENS.has(t.type)) {
        next();
        key = { type: "String", value: t.value };
      } else {
        throw new DevabhashaError("\u0915\u094B\u0937\u0926\u094B\u0937\u0903: object key must be a name or string", { line: peek().line, col: peek().col, kind: "parse" });
      }
      expect("OP", ":");
      const value = parseExpression();
      props.push({ key, value });
      if (check("OP", ",")) next();
    }
    expect("OP", "}");
    return { type: "ObjectLiteral", props };
  }
  return parseProgram();
}

// src/stdlib.js
var PROPERTIES = {
  "\u0926\u0940\u0930\u094D\u0918\u0924\u093E": "length",
  // dīrghatā — "length"
  "\u092E\u093E\u0928\u093E\u0928\u093F": "values"
  // (used as a marker; handled specially if needed)
};
var METHODS = {
  // --- string & array shared ---
  "\u0916\u0923\u094D\u0921": "slice",
  // khaṇḍa — "segment" → slice(start, end)
  "\u0905\u0928\u0941\u0915\u094D\u0930\u092E\u0923\u093F\u0915\u093E": "indexOf",
  // anukramaṇikā — "index" → indexOf(x)
  "\u0905\u0938\u094D\u0924\u093F": "includes",
  // asti — "exists" → includes(x)
  "\u0938\u0902\u092F\u094B\u091C\u092F": "concat",
  // saṃyojaya — "join together" → concat
  // --- string specific ---
  "\u0905\u0915\u094D\u0937\u0930\u0903": "charAt",
  // akṣaraḥ — "letter" → charAt(i)
  "\u0938\u0919\u094D\u0915\u0947\u0924\u0903": "charCodeAt",
  // saṅketaḥ — "code" → charCodeAt(i)
  "\u0935\u093F\u092D\u091C": "split",
  // vibhaja — "divide" → split(sep)
  "\u0909\u091A\u094D\u091A": "toUpperCase",
  // ucca — "high" → toUpperCase
  "\u0928\u0940\u091A": "toLowerCase",
  // nīca — "low" → toLowerCase
  "\u091B\u093F\u0928\u094D\u0926\u094D\u0927\u093F": "trim",
  // chinddhi — "cut" → trim
  "\u0906\u0930\u092D\u0924\u0947": "startsWith",
  // ārabhate — "begins" → startsWith
  "\u0938\u092E\u093E\u092A\u094D\u092F\u0924\u0947": "endsWith",
  // samāpyate — "ends" → endsWith
  // --- array specific ---
  "\u092F\u094B\u091C\u092F": "push",
  // yojaya — "join/attach" → push(x)
  "\u0905\u092A\u0928\u092F": "pop",
  // apanaya — "remove" → pop
  "\u092A\u094D\u0930\u0924\u093F\u091A\u093F\u0924\u094D\u0930\u092F": "map",
  // praticitraya — "map across" → map(fn)
  "\u0917\u093E\u0932\u092F": "filter",
  // gālaya — "filter" → filter(fn)
  "\u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915\u0938\u094D\u092E\u093F\u0928\u094D": "forEach",
  // pratyekasmin — "in each" → forEach(fn)
  "\u0938\u092E\u094D\u092E\u0940\u0932": "join",
  // sammīla — "unite" → join(sep)  (array→string)
  "\u0935\u093F\u092A\u0930\u094D\u092F\u092F": "reverse",
  // viparyaya — "reverse" → reverse
  // --- promise (आश्वासन) methods for async chaining ---
  "\u0924\u0924\u0903": "then",
  // tataḥ — "thereupon" → .then(fn)
  "\u0926\u094B\u0937\u0947": "catch",
  // doṣe — "on error" → .catch(fn)
  "\u0905\u0928\u094D\u0924\u0924\u0903": "finally",
  // antataḥ — "finally" → .finally(fn)
  // --- I/O methods (on सञ्चिका / जाल namespaces) ---
  "\u092A\u0920": "read",
  // paṭha — "read" → file.read(path)
  "\u0932\u093F\u0916": "write",
  // likha — "write" → file.write(path, data)
  "\u0935\u093F\u0926\u094D\u092F\u0924\u0947": "exists",
  // vidyate — "exists" → file.exists(path)
  "\u0928\u093F\u0937\u094D\u0915\u093E\u0938\u092F": "remove",
  // niṣkāsaya — "remove" → file.remove(path)
  "\u0938\u0942\u091A\u0940\u0915\u0943": "list",
  // sūcīkṛ — "enumerate" → file.list(dir)
  "\u0906\u0928\u092F": "fetch",
  // ānaya — "bring/fetch" → net.fetch(url)
  "\u092A\u0920\u092A\u094D\u0930\u0926\u0924\u094D\u0924": "readJson",
  // paṭha-pradatta — read + parse JSON → Result
  "\u0932\u093F\u0916\u092A\u094D\u0930\u0926\u0924\u094D\u0924": "writeJson",
  // likha-pradatta — serialize + write JSON
  "\u0906\u0928\u092F\u092A\u094D\u0930\u0926\u0924\u094D\u0924": "fetchJson",
  // ānaya-pradatta — fetch + parse JSON → Result
  // --- Object statics (on the सङ्ग्रह namespace) ---
  "\u0915\u0941\u091E\u094D\u091C\u092F\u0903": "keys",
  // kuñjayaḥ — "keys" → Object.keys(o)
  "\u092E\u0942\u0932\u094D\u092F\u093E\u0928\u093F": "values",
  // mūlyāni — "values" → Object.values(o)
  "\u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u092F\u0903": "entries",
  // praviṣṭayaḥ — "entries" → Object.entries(o)
  "\u0938\u092E\u093E\u092F\u094B\u091C\u092F": "assign",
  // samāyojaya — "merge" → Object.assign(t, s)
  // --- गणित (Math) methods: used as गणित.<name>(...) ---
  // Mapped here so गणित.वर्गमूलम्(x) → Math.sqrt(x). These names are
  // distinctive enough not to collide with user object methods.
  "\u0935\u0930\u094D\u0917\u092E\u0942\u0932\u092E\u094D": "sqrt",
  // vargamūlam — "square root"
  "\u0918\u0928\u092E\u0942\u0932\u092E\u094D": "cbrt",
  // ghanamūlam — "cube root"
  "\u0918\u093E\u0924\u0903": "pow",
  // ghātaḥ — "power" → pow(base, exp)
  "\u0928\u093F\u0930\u092A\u0947\u0915\u094D\u0937\u092E\u094D": "abs",
  // nirapekṣam — "absolute"
  "\u0905\u0927\u0903\u092A\u093E\u0924\u0903": "floor",
  // adhaḥpātaḥ — "falling down" → floor
  "\u090A\u0930\u094D\u0927\u094D\u0935\u092A\u093E\u0924\u0903": "ceil",
  // ūrdhvapātaḥ — "rising up" → ceil
  "\u0938\u0928\u094D\u0928\u093F\u0915\u0930\u094D\u0937\u0903": "round",
  // sannikarṣaḥ — "approximation" → round
  "\u091B\u0947\u0926\u0928\u092E\u094D": "trunc",
  // chedanam — "cutting" → trunc
  "\u0927\u0928\u0930\u094D\u0923\u091A\u093F\u0939\u094D\u0928\u092E\u094D": "sign",
  // dhanarṇacihnam — "sign of a number" → Math.sign
  "\u091C\u094D\u092F\u093E": "sin",
  // jyā — classical Sanskrit term for sine!
  "\u0915\u094B\u091F\u093F\u091C\u094D\u092F\u093E": "cos",
  // koṭijyā — classical term for cosine!
  "\u0938\u094D\u092A\u0930\u094D\u0936\u091C\u094D\u092F\u093E": "tan",
  // sparśajyā — "tangent"
  "\u0935\u093F\u0932\u094B\u092E\u091C\u094D\u092F\u093E": "asin",
  // vilomajyā — "inverse sine"
  "\u0935\u093F\u0932\u094B\u092E\u0915\u094B\u091F\u093F": "acos",
  // → acos
  "\u0935\u093F\u0932\u094B\u092E\u0938\u094D\u092A\u0930\u094D\u0936": "atan",
  // → atan
  "\u0926\u094D\u0935\u093F\u0915\u094B\u0923\u093E\u0930\u094D\u0915": "atan2",
  // → atan2(y, x)
  "\u0918\u093E\u0924\u0940\u092F\u092E\u094D": "exp",
  // ghātīyam — "exponential" → exp
  "\u0932\u0918\u0941\u0917\u0923\u0915\u0903": "log",
  // laghugaṇakaḥ — "logarithm" → log (natural)
  "\u0926\u0936\u0932\u0918\u0941\u0917\u0923\u0915\u0903": "log10",
  // → log10
  "\u0926\u094D\u0935\u093F\u0932\u0918\u0941\u0917\u0923\u0915\u0903": "log2",
  // → log2
  "\u0905\u0927\u093F\u0915\u0924\u092E\u0903": "max",
  // adhikatamaḥ — "greatest" → max(a, b, …)
  "\u0928\u094D\u092F\u0942\u0928\u0924\u092E\u0903": "min",
  // nyūnatamaḥ — "least" → min(a, b, …)
  "\u092F\u093E\u0926\u0943\u091A\u094D\u091B\u093F\u0915\u092E\u094D": "random",
  // yādṛcchikam — "random" → random()
  "\u0939\u093F\u091C\u094D\u092F\u093E": "sinh",
  // hijyā — hyperbolic sine
  "\u0915\u094B\u091F\u093F\u0939\u093F\u091C\u094D\u092F\u093E": "cosh",
  // → cosh
  "\u0938\u094D\u092A\u0930\u094D\u0936\u0939\u093F\u091C\u094D\u092F\u093E": "tanh",
  // → tanh
  "\u0935\u093F\u0932\u094B\u092E\u0939\u093F\u091C\u094D\u092F\u093E": "asinh",
  // → asinh
  "\u0918\u093E\u0924\u092E\u0942\u0932\u092E\u094D": "hypot"
  // ghātamūlam — "power-root" → hypot(a,b)
};
var MATH_CONSTANTS = {
  "\u092A\u093E\u0908": "PI",
  // pāī → Math.PI
  "\u092F\u0942\u0932\u0930\u093E\u0902\u0915\u0903": "E",
  // yūlarāṅkaḥ — "Euler's number" → Math.E
  "\u092E\u0942\u0932\u0926\u094D\u0935\u093F": "SQRT2",
  // mūladvi — "root two" → Math.SQRT2
  "\u0932\u0949\u0917\u0968\u0907": "LOG2E",
  // → Math.LOG2E
  "\u0932\u0949\u0917\u0967\u0966\u0907": "LOG10E"
  // → Math.LOG10E
};
var GLOBALS = {
  "\u0938\u0902\u0915\u0947\u0924\u093E\u0915\u094D\u0937\u0930": "String.fromCharCode",
  // saṅketākṣara — "code-letter"
  "\u0917\u0923\u093F\u0924": "Math",
  // gaṇita — "mathematics" → Math
  "\u0938\u093E\u0927\u093F\u0924\u092E\u094D": "__RT.ok",
  // sādhitam — "achieved" → Ok(value)
  "\u0935\u093F\u092B\u0932\u092E\u094D": "__RT.err",
  // viphalam — "failed" → Err(error)
  "\u0938\u091E\u094D\u091A\u093F\u0915\u093E": "__IO.file",
  // sañcikā — "file" → file I/O namespace
  "\u091C\u093E\u0932": "__IO.net",
  // jāla — "net/web" → network namespace
  "\u0938\u0919\u094D\u0917\u094D\u0930\u0939": "Object",
  // saṅgraha — "collection" → Object (keys/values/entries)
  "\u0915\u093E\u0932\u091A\u0915\u094D\u0930": "__DB.interval",
  // kālacakra — "wheel of time" → repeating timer
  "\u0915\u093E\u0932\u0928\u093E\u0936\u0903": "__DB.clearTimer",
  // kālanāśa — "end of time" → stop a timer
  "\u0915\u0941\u091E\u094D\u091C\u093F\u0936\u094D\u0930\u094B\u0924\u093E": "__DB.onKey",
  // kuñjiśrotā — "key-listener" → keyboard handler
  "\u0938\u094D\u0935\u0930\u0942\u092A\u092E\u094D": "__RT.typeOf",
  // svarūpam — "intrinsic form/type" → typeof (Sanskrit-named)
  "\u0938\u0942\u091A\u0940\u0935\u0924\u094D": "Array.isArray",
  // sūcīvat — "list-like" → Array.isArray
  "\u092A\u094D\u0930\u0926\u0924\u094D\u0924": "__RT.json",
  // pradatta — "data" → JSON parse/serialize (Result-returning)
  "\u0905\u0919\u094D\u0915\u092F": "__RT.toNumber",
  // aṅkaya — "to number" → parse string→number (Result)
  "\u092A\u094D\u0930\u092D\u093E\u0935": "__DB.effect",
  // prabhāva — "influence/effect" → fine-grained reactive effect
  "\u092C\u0928\u094D\u0927": "__DB.bindText",
  // bandha — "binding" → a text node bound to a reactive thunk
  "\u0906\u0935\u0932\u0940": "__DB.keyedList",
  // āvalī — "row/series" → keyed list reconciliation
  "\u0938\u092B\u093E\u0908": "__DB.onCleanup",
  // saphāī — "cleanup" → teardown hook inside an effect
  "\u0906\u0932\u0938\u094D\u092F\u091A\u093F\u0924\u094D\u0930\u092E\u094D": "__DB.lazyImage"
  // ālasya-citra — "lazy image" → load on scroll-into-view
};

// src/style.js
var STYLE_PROPS = {
  // color & background
  "\u0935\u0930\u094D\u0923\u0903": "color",
  // varṇa — "color"
  "\u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F\u0903": "backgroundColor",
  // pṛṣṭhabhūmi — "background"
  "\u0905\u092A\u093E\u0930\u0926\u0930\u094D\u0936\u093F\u0924\u093E": "opacity",
  // apāradarśitā — "opacity"
  // typography
  "\u0905\u0915\u094D\u0937\u0930\u092E\u093E\u0928\u092E\u094D": "fontSize",
  // akṣaramāna — "letter-size"
  "\u0905\u0915\u094D\u0937\u0930\u092D\u093E\u0930\u0903": "fontWeight",
  // akṣarabhāra — "letter-weight"
  "\u092A\u0919\u094D\u0915\u094D\u0924\u093F\u092E\u093E\u0928\u092E\u094D": "lineHeight",
  // paṅktimāna — "line-height"
  "\u0938\u0902\u0930\u0947\u0916\u0923\u092E\u094D": "textAlign",
  // saṃrekhaṇa — "alignment"
  "\u0905\u0915\u094D\u0937\u0930\u0915\u0941\u0932\u092E\u094D": "fontFamily",
  // akṣarakula — "font-family"
  "\u0905\u0932\u0919\u094D\u0915\u093E\u0930\u0903": "textDecoration",
  // alaṅkāra — "decoration"
  // box model
  "\u091A\u094C\u0921\u093E\u0908": "width",
  // — width
  "\u0905\u0927\u093F\u0915\u0924\u092E\u091A\u094C\u0921\u093E\u0908": "maxWidth",
  // adhikatama-cauḍāī — "maximum width" → max-width
  "\u0930\u0947\u0916\u094B\u091A\u094D\u091A\u0924\u093E": "lineHeight",
  // rekhocchatā — "line height" → line-height
  "\u092A\u093E\u0920\u0938\u0902\u0930\u0947\u0916\u0923\u092E\u094D": "textAlign",
  // pāṭha-saṃrekhaṇam — "text alignment" → text-align
  "\u0909\u091A\u094D\u091A\u0924\u093E": "height",
  // uccatā — "height"
  "\u0905\u0928\u094D\u0924\u0930\u093E\u0932\u0903": "padding",
  // antarāla — "inner gap" → padding
  "\u092C\u093E\u0939\u094D\u092F\u093E\u0928\u094D\u0924\u0930\u0903": "margin",
  // bāhyāntara — "outer gap" → margin
  "\u0938\u0940\u092E\u093E": "border",
  // sīmā — "border"
  "\u0915\u094B\u0923\u0935\u0943\u0924\u094D\u0924\u093F\u0903": "borderRadius",
  // koṇavṛtti — "corner-rounding"
  // layout
  "\u092A\u094D\u0930\u0926\u0930\u094D\u0936\u0928\u092E\u094D": "display",
  // pradarśana — "display"
  "\u0938\u094D\u0925\u093F\u0924\u093F\u0903": "position",
  // sthiti — "position"
  "\u0936\u0940\u0930\u094D\u0937\u093E\u0924\u094D": "top",
  // śīrṣāt — "from the top" → top
  "\u0905\u0927\u0938\u094D\u0924\u093E\u0924\u094D": "bottom",
  // adhastāt — "from below" → bottom
  "\u0935\u093E\u092E\u0924\u0903": "left",
  // vāmataḥ — "from the left" → left
  "\u0926\u0915\u094D\u0937\u093F\u0923\u0924\u0903": "right",
  // dakṣiṇataḥ — "from the right" → right
  "\u0938\u094D\u0924\u0930\u0903": "zIndex",
  // stara — "layer" → z-index
  "\u0926\u093F\u0915\u094D": "flexDirection",
  // dik — "direction"
  "\u0928\u094D\u092F\u093E\u092F\u0903": "justifyContent",
  // nyāya — "arrangement" → justify
  "\u092E\u0947\u0932\u0928\u092E\u094D": "alignItems",
  // melana — "alignment" → align-items
  "\u0905\u0928\u094D\u0924\u0930\u092E\u094D": "gap"
  // antara — "gap"
};
var STYLE_VALUES = {
  // colors (named)
  "\u0930\u0915\u094D\u0924\u0903": "crimson",
  // rakta — "red"
  "\u0928\u0940\u0932\u0903": "navy",
  // nīla — "blue"
  "\u0939\u0930\u093F\u0924\u0903": "green",
  // harita — "green"
  "\u092A\u0940\u0924\u0903": "gold",
  // pīta — "yellow/gold"
  "\u0936\u094D\u0935\u0947\u0924\u0903": "white",
  // śveta — "white"
  "\u0915\u0943\u0937\u094D\u0923\u0903": "black",
  // kṛṣṇa — "black"
  "\u0927\u0942\u0938\u0930\u0903": "gray",
  // dhūsara — "gray"
  "\u0915\u0947\u0938\u0930\u0903": "saffron",
  // kesara — "saffron" (→ #F4C430 via palette below)
  "\u0905\u0930\u0941\u0923\u0903": "tomato",
  // aruṇa — "reddish"
  "\u0936\u094D\u092F\u093E\u092E\u0903": "slategray",
  // śyāma — "dark"
  // display / layout keywords
  "\u092A\u094D\u0930\u0935\u093E\u0939\u0903": "flex",
  // pravāha — "flow" → flex
  "\u0916\u0923\u094D\u0921\u0903": "block",
  // khaṇḍa — "block"
  "\u0930\u0947\u0916\u093E": "inline",
  // rekhā — "line" → inline
  "\u0905\u0926\u0943\u0936\u094D\u092F\u092E\u094D": "none",
  // adṛśya — "invisible" → none
  "\u0915\u0947\u0928\u094D\u0926\u094D\u0930\u092E\u094D": "center",
  // kendra — "center"
  "\u0906\u0926\u093F\u0903": "flex-start",
  // ādi — "beginning"
  "\u0905\u0928\u094D\u0924\u0903": "flex-end",
  // anta — "end"
  "\u092E\u0927\u094D\u092F\u0947": "space-between",
  // madhye — "in between"
  "\u092A\u0919\u094D\u0915\u094D\u0924\u093F\u0903": "row",
  // paṅkti — "row"
  "\u0938\u094D\u0924\u092E\u094D\u092D\u0903": "column",
  // stambha — "column"
  // font weights / alignment
  "\u0917\u0941\u0930\u0941\u0903": "bold",
  // guru — "heavy" → bold
  "\u0932\u0918\u0941\u0903": "normal",
  // laghu — "light" → normal
  "\u0935\u093E\u092E\u092E\u094D": "left",
  // vāma — "left"
  "\u0926\u0915\u094D\u0937\u093F\u0923\u092E\u094D": "right",
  // dakṣiṇa — "right"
  "\u0930\u0947\u0916\u093E\u0919\u094D\u0915\u0928\u092E\u094D": "underline"
  // rekhāṅkana — "underline"
};
var COLOR_HEX = {
  saffron: "#F4C430"
};
function styleProp(name) {
  return STYLE_PROPS[name] || name;
}
function styleValue(word) {
  const v = STYLE_VALUES[word];
  if (v === void 0) return word;
  return COLOR_HEX[v] || v;
}
function isStyleWord(word) {
  return Object.prototype.hasOwnProperty.call(STYLE_VALUES, word);
}

// src/codegen.js
var PRELUDE = `// --- \u0926\u0947\u0935\u092D\u093E\u0937\u093E prelude (host-independent) ---
const __RT = {
  // \u092A\u0930\u093F\u0923\u093E\u092E (Result): explicit success/failure values for fallible operations.
  // keys are the raw Sanskrit field names, since member access (\u092B\u0932.\u0938\u092B\u0932) emits
  // the property name unchanged.
  ok(v)  { return { "\u0938\u092B\u0932": true,  "\u092E\u0942\u0932\u094D\u092F\u092E\u094D": v,    "\u0926\u094B\u0937\u0903": null }; },
  err(e) { return { "\u0938\u092B\u0932": false, "\u092E\u0942\u0932\u094D\u092F\u092E\u094D": null, "\u0926\u094B\u0937\u0903": e }; },
  // result \u0905\u0925\u0935\u093E fallback \u2014 the Result's value if \u0938\u092B\u0932, else the (lazy) fallback.
  // A non-Result value is returned as-is (so \u0905\u0925\u0935\u093E is also a null/Err guard).
  orElse(r, fb) {
    if (r && typeof r === "object" && "\u0938\u092B\u0932" in r) return r["\u0938\u092B\u0932"] ? r["\u092E\u0942\u0932\u094D\u092F\u092E\u094D"] : fb();
    return r == null ? fb() : r;
  },
  // \u092A\u094D\u0930\u0915\u093E\u0930\u0903 \u2014 a value's kind, named in Sanskrit (for reflection / tests).
  typeOf(v) {
    if (v === null || v === undefined) return "\u0930\u093F\u0915\u094D\u0924";       // null/undefined
    if (Array.isArray(v)) return "\u0938\u0942\u091A\u0940";                      // array
    const t = typeof v;
    if (t === "number") return "\u0905\u0919\u094D\u0915";                        // number
    if (t === "string") return "\u0935\u093E\u0915\u094D";                        // string
    if (t === "boolean") return "\u0938\u0924\u094D\u092F\u093E\u0938\u0924\u094D\u092F";                   // boolean
    if (t === "function") return "\u0915\u093E\u0930\u094D\u092F";                     // function
    return "\u0915\u094B\u0937";                                            // object/record
  },
  // \u092A\u094D\u0930\u0926\u0924\u094D\u0924 (data) \u2014 JSON parse/serialize, both returning \u092A\u0930\u093F\u0923\u093E\u092E since
  // JSON.parse throws and the language has no exceptions.
  json: {
    \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u092F(text) {           // parse
      try { return __RT.ok(JSON.parse(text)); }
      catch (e) { return __RT.err(String(e && e.message || e)); }
    },
    \u0938\u0942\u0924\u094D\u0930\u092F(v, pretty) {         // stringify (pretty by default)
      try { return __RT.ok(JSON.stringify(v, null, pretty === false ? undefined : 2)); }
      catch (e) { return __RT.err(String(e && e.message || e)); }
    },
  },
  // \u0905\u0919\u094D\u0915\u092F \u2014 parse a string to a number \u2192 \u092A\u0930\u093F\u0923\u093E\u092E (Err if not a number).
  toNumber(s) {
    const n = Number(s);
    return Number.isNaN(n) ? __RT.err("\u0905\u0919\u094D\u0915\u0903 \u0928 (not a number): " + s) : __RT.ok(n);
  },
};
`;
var RUNTIME = `// --- \u0926\u0947\u0935\u092D\u093E\u0937\u093E runtime ---
const __DB = {
  el(tag, ...rest) {
    const node = document.createElement(tag);
    for (const r of rest) {
      if (r == null) continue;
      if (typeof r === 'object' && !(r instanceof Node) && !Array.isArray(r)) {
        // props/attrs object
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith('on') && typeof v === 'function') {
            node.addEventListener(k.slice(2).toLowerCase(), v);
          } else if (k === 'style' && typeof v === 'object') {
            Object.assign(node.style, v);
          } else {
            node.setAttribute(k, v);
          }
        }
      } else if (Array.isArray(r)) {
        r.forEach(c => node.append(c instanceof Node ? c : document.createTextNode(String(c))));
      } else {
        node.append(r instanceof Node ? r : document.createTextNode(String(r)));
      }
    }
    return node;
  },
  mount(node, target) {
    const t = typeof target === 'string' ? document.querySelector(target) : (target || document.body);
    t.append(node);
    return node;
  },
  listen(node, event, handler) {
    node.addEventListener(event, handler);
    return node;
  },
  construct({ tag, content, contentBind, event, handler, parent, prop, source, children, style, styleBind }) {
    const node = document.createElement(tag);
    if (contentBind != null) {
      // fine-grained: a bound text node that updates in place on dep change
      node.append(__DB.bindText(contentBind));
    } else if (content != null && content.__isSutra) {
      // a \u0938\u0942\u0924\u094D\u0930 reactive reference passed as content \u2192 bind fine-grained
      node.append(__DB.bindText(content));
    } else if (content != null) {
      if (Array.isArray(content)) content.forEach(c => node.append(c instanceof Node ? c : document.createTextNode(String(c))));
      else node.append(content instanceof Node ? content : document.createTextNode(String(content)));
    }
    if (children) {
      // DOM append moves nodes, so nested child constructs are correctly
      // re-parented into this element (\u0938\u092E\u093E\u0938 composition). An array child is
      // flattened \u2014 this is what makes list rendering (.\u092A\u094D\u0930\u0924\u093F\u091A\u093F\u0924\u094D\u0930\u092F \u2192 nodes) work.
      const appendChild = c => {
        if (c == null) return;
        if (Array.isArray(c)) { c.forEach(appendChild); return; }
        node.append(c instanceof Node ? c : document.createTextNode(String(c)));
      };
      for (const c of children) appendChild(c);
    }
    if (style && typeof style === 'object') {
      Object.assign(node.style, style);
    }
    if (styleBind && typeof styleBind === 'object') {
      // each dynamic style property gets its own effect \u2192 only that property
      // updates when its dependencies change (fine-grained, no rebuild).
      for (const [k, thunk] of Object.entries(styleBind)) {
        __DB.effect(() => { node.style[k] = thunk(); });
      }
    }
    if (prop && typeof prop === 'object') {
      for (const [k, v] of Object.entries(prop)) node.setAttribute(k, v);
    }
    if (event && handler) node.addEventListener(event, handler);
    if (parent != null) {
      const t = typeof parent === 'string' ? document.querySelector(parent) : parent;
      (t || document.body).append(node);
    }
    return node;
  },

  // ----- reactivity -----
  // A subscriber stack: whatever is on top when a \u092D\u093E\u0935 cell is READ becomes a
  // dependency of that subscriber. Both the coarse \u0926\u0943\u0936\u094D\u092F (a whole-view render)
  // and a fine-grained \u092A\u094D\u0930\u092D\u093E\u0935 (effect) push themselves here. A subscriber is an
  // object { run, deps } where deps is the set of cells it currently reads.
  _subStack: [],
  _currentSub() { return __DB._subStack.length ? __DB._subStack[__DB._subStack.length - 1] : null; },
  state(initial) {
    let value = initial;
    const subs = new Set();             // subscribers depending on this cell
    const cell = (...args) => {
      if (args.length === 0) {            // read \u2014 track the current subscriber
        const sub = __DB._currentSub();
        if (sub) { subs.add(sub); if (sub.deps) sub.deps.add(cell); }
        return value;
      }
      const next = args[0];               // write
      // skip re-render only when an unchanged PRIMITIVE is written; object/
      // array state is usually mutated in place, so always re-render those.
      if (next === value && (next === null || typeof next !== 'object')) return value;
      value = next;
      // notify every subscriber (snapshot first \u2014 re-running mutates the set)
      for (const sub of Array.from(subs)) {
        if (typeof sub === 'function') sub();          // legacy view render
        else if (sub && sub.run) sub.run();            // effect / binding
      }
      return value;
    };
    cell.__isState = true;
    cell.__unsubscribe = (sub) => subs.delete(sub);
    return cell;
  },
  // \u092A\u094D\u0930\u092D\u093E\u0935 \u2014 a fine-grained effect. Runs fn now, tracking which \u092D\u093E\u0935 cells it
  // reads, and re-runs ONLY fn when any of those change. Before each re-run it
  // unsubscribes from its previous dependencies (so conditional reads don't
  // leave stale subscriptions) and re-tracks fresh ones.
  effect(fn) {
    const sub = {
      deps: new Set(),
      cleanups: [],
      run() {
        // run any registered cleanups from the previous run (teardown)
        for (const c of sub.cleanups) { try { c(); } catch (e) {} }
        sub.cleanups = [];
        // drop old subscriptions, then re-track on this run
        for (const cell of sub.deps) if (cell.__unsubscribe) cell.__unsubscribe(sub);
        sub.deps.clear();
        __DB._subStack.push(sub);
        const prevEffect = __DB._activeEffect; __DB._activeEffect = sub;
        try { fn(); } finally { __DB._activeEffect = prevEffect; __DB._subStack.pop(); }
      },
    };
    sub.run();
    return sub;
  },
  _activeEffect: null,
  // \u0938\u092B\u093E\u0908 \u2014 register a cleanup that runs before the current effect's next run
  // (and could run on disposal). The standard teardown hook for timers/listeners.
  onCleanup(fn) { if (__DB._activeEffect) __DB._activeEffect.cleanups.push(fn); },
  // \u0938\u0942\u0924\u094D\u0930 \u2014 tag a thunk as a reactive reference so content slots / \u092C\u0928\u094D\u0927 bind it.
  sutra(thunk) { thunk.__isSutra = true; return thunk; },
  // \u0906\u0932\u0938\u094D\u092F\u091A\u093F\u0924\u094D\u0930\u092E\u094D \u2014 a lazy-loaded image. Renders an img showing the placeholder
  // (or nothing) and swaps in the real src only once it scrolls into view, via
  // IntersectionObserver. opts: { alt, placeholder, rootMargin }. Falls back to
  // eager loading where IntersectionObserver is unavailable.
  lazyImage(src, opts) {
    opts = opts || {};
    const img = document.createElement('img');
    if (opts.alt != null) img.setAttribute('alt', opts.alt);
    if (opts.placeholder) img.setAttribute('src', opts.placeholder);
    img.setAttribute('data-src', src);
    img.setAttribute('loading', 'lazy');           // native hint where supported
    const load = () => { if (img.getAttribute('src') !== src) img.setAttribute('src', src); };
    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { load(); io.unobserve(img); }
        }
      }, { rootMargin: opts.rootMargin || '200px' });
      io.observe(img);
    } else {
      load();                                       // no observer \u2192 load now
    }
    return img;
  },
  // bindText \u2014 fine-grained: a text node whose content is produced by thunk();
  // only this node's text updates when the thunk's dependencies change.
  bindText(thunk) {
    const node = document.createTextNode('');
    __DB.effect(() => { node.textContent = String(thunk()); });
    return node;
  },
  // \u0906\u0935\u0932\u0940 \u2014 keyed list reconciliation. dataThunk() returns the current array;
  // keyFn(item, i) gives a STABLE identity; renderFn(item, i) builds a node for
  // a new key. Wrapped in an effect, so it re-runs when the data signal changes.
  // On each run it reuses the DOM nodes of surviving keys (preserving their
  // state/focus), creates nodes for new keys, removes vanished ones, and
  // reorders children to match the new sequence \u2014 without rebuilding everything.
  keyedList(dataThunk, keyFn, renderFn) {
    const host = document.createElement('div');
    host.style.display = 'contents';      // transparent wrapper, no layout box
    let prev = new Map();                  // key \u2192 node (from the last run)
    __DB.effect(() => {
      const items = dataThunk() || [];
      const next = new Map();
      const ordered = [];
      items.forEach((item, i) => {
        const k = String(keyFn(item, i));
        let node = prev.get(k);
        if (node === undefined) node = renderFn(item, i);   // new key \u2192 build
        next.set(k, node);
        ordered.push(node);
      });
      // remove nodes whose key vanished
      for (const [k, node] of prev) {
        if (!next.has(k) && node.parentNode === host) host.removeChild(node);
      }
      // place nodes in the new order (reusing/moving existing ones)
      let ref = null;                       // insert before the previous sibling
      for (let i = ordered.length - 1; i >= 0; i--) {
        const node = ordered[i];
        if (node.nextSibling !== ref || node.parentNode !== host) host.insertBefore(node, ref);
        ref = node;
      }
      prev = next;
    });
    return host;
  },
  view(container, viewFn) {
    const host = container ? (typeof container === 'string' ? document.querySelector(container) : container) : document.body;
    const render = () => {
      __DB._subStack.push(render);
      let out;
      try { out = viewFn(); } finally { __DB._subStack.pop(); }
      host.innerHTML = '';
      const append = c => {
        if (c == null) return;
        if (Array.isArray(c)) { c.forEach(append); return; }
        host.append(c instanceof Node ? c : document.createTextNode(String(c)));
      };
      append(out);
    };
    render();
    return host;
  },
  // ----- timing & input (for animation loops / games) -----
  interval(fn, ms) { return setInterval(fn, ms); },
  clearTimer(id) { clearInterval(id); },
  onKey(fn) {
    const h = (e) => fn(e.key);
    document.addEventListener('keydown', h);
    return h;
  }
};
`;
function generate(ast, { includeRuntime = true, withMeta = false, sourceMap = false } = {}) {
  let out = "";
  let outLine = 0;
  let outCol = 0;
  const emit = (s) => {
    out += s;
    let nl = -1, from = 0, count = 0, last = -1;
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) {
      count++;
      last = i;
    }
    if (count === 0) {
      outCol += s.length;
    } else {
      outLine += count;
      outCol = s.length - last - 1;
    }
  };
  const mappings = [];
  const recordMapping = (node) => {
    if (!sourceMap || !node || node.line == null) return;
    mappings.push({ genLine: outLine, genCol: outCol, srcLine: node.line, srcCol: node.col || 1 });
  };
  const stateNames = /* @__PURE__ */ new Set();
  let inView = false;
  function readsState(n) {
    if (!n || typeof n !== "object") return false;
    if (n.type === "Identifier") return stateNames.has(n.name);
    if (n.type === "FuncExpr" || n.type === "FuncDecl") return false;
    for (const k of Object.keys(n)) {
      if (k === "line" || k === "col" || k === "namePos" || k === "paramPos") continue;
      const v = n[k];
      if (Array.isArray(v)) {
        if (v.some(readsState)) return true;
      } else if (v && typeof v === "object" && v.type) {
        if (readsState(v)) return true;
      }
    }
    return false;
  }
  const exports2 = [];
  const imports = [];
  const namespaceAliases = /* @__PURE__ */ new Set();
  let asyncDepth = 0;
  let inStyleValue = false;
  function gen(node, indent = "") {
    switch (node.type) {
      case "Program":
        node.body.forEach((s) => {
          emit(indent);
          genStatement(s, indent);
          emit("\n");
        });
        break;
      default:
        genStatement(node, indent);
    }
  }
  function genStatement(node, indent) {
    recordMapping(node);
    switch (node.type) {
      case "VarDecl": {
        const kw = node.kind === "CONST" ? "const" : "let";
        emit(`${kw} ${id(node.name)}`);
        if (node.init) {
          emit(" = ");
          genExpr(node.init);
        }
        emit(";");
        break;
      }
      case "StyleDecl": {
        emit(`const ${id(node.name)} = `);
        emitStyleObject(node.pairs);
        emit(";");
        break;
      }
      case "StateDecl": {
        stateNames.add(node.name);
        emit(`const ${id(node.name)} = __DB.state(`);
        if (node.init) genExpr(node.init);
        else emit("undefined");
        emit(");");
        break;
      }
      case "View": {
        emit("__DB.view(");
        if (node.container) genExpr(node.container);
        else emit("null");
        emit(", () => ");
        const savedInView = inView;
        inView = true;
        genViewBody(node.body, indent);
        inView = savedInView;
        emit(");");
        break;
      }
      case "Export":
        exports2.push(node.name);
        genStatement(node.decl, indent);
        break;
      case "Import":
        imports.push(node);
        if (node.kind === "namespace") namespaceAliases.add(node.alias);
        break;
      case "FuncDecl": {
        emit(`${node.async ? "async " : ""}function ${id(node.name)}(${node.params.map(id).join(", ")}) `);
        const savedAD = asyncDepth;
        asyncDepth = node.async ? 1 : 0;
        genBlock(node.body, indent);
        asyncDepth = savedAD;
        break;
      }
      case "Return":
        emit("return");
        if (node.argument) {
          emit(" ");
          genExpr(node.argument);
        }
        emit(";");
        break;
      case "If":
        emit("if (");
        genExpr(node.test);
        emit(") ");
        genBlock(node.consequent, indent);
        if (node.alternate) {
          emit(" else ");
          if (node.alternate.type === "If") genStatement(node.alternate, indent);
          else genBlock(node.alternate, indent);
        }
        break;
      case "While":
        emit("while (");
        genExpr(node.test);
        emit(") ");
        genBlock(node.body, indent);
        break;
      case "ForOf":
        emit(`for (const ${id(node.item)} of `);
        genExpr(node.iterable);
        emit(") ");
        genBlock(node.body, indent);
        break;
      case "Break":
        emit("break;");
        break;
      case "Continue":
        emit("continue;");
        break;
      case "Print":
        emit("console.log(");
        node.args.forEach((a, i) => {
          if (i) emit(", ");
          genExpr(a);
        });
        emit(");");
        break;
      case "Block":
        genBlock(node, indent);
        break;
      case "ExpressionStatement":
        genExpr(node.expression);
        emit(";");
        break;
      default:
        throw new Error(`codegen: unknown statement ${node.type}`);
    }
  }
  function genBlock(block, indent) {
    const inner = indent + "  ";
    emit("{\n");
    block.body.forEach((s) => {
      emit(inner);
      genStatement(s, inner);
      emit("\n");
    });
    emit(indent + "}");
  }
  function genViewBody(block, indent) {
    const inner = indent + "  ";
    emit("{\n");
    block.body.forEach((s, i) => {
      const last = i === block.body.length - 1;
      emit(inner);
      if (last && s.type === "ExpressionStatement") {
        emit("return ");
        genExpr(s.expression);
        emit(";");
      } else {
        genStatement(s, inner);
      }
      emit("\n");
    });
    emit(indent + "}");
  }
  function partitionStylePairs(pairs) {
    const staticPairs = [], bindPairs = [];
    for (const p of pairs) {
      let dynamic = false;
      if (!inView) {
        if (p.value.kind === "word") {
          dynamic = stateNames.has(p.value.value) && !isStyleWord(p.value.value);
        } else {
          dynamic = readsState(p.value.value);
        }
      }
      (dynamic ? bindPairs : staticPairs).push(p);
    }
    return { staticPairs, bindPairs };
  }
  function emitStylePair(p) {
    emit(JSON.stringify(styleProp(p.key)));
    emit(": ");
    if (p.value.kind === "word") {
      if (isStyleWord(p.value.value)) emit(JSON.stringify(styleValue(p.value.value)));
      else emit(id(p.value.value));
    } else {
      const saved = inStyleValue;
      inStyleValue = true;
      genExpr(p.value.value);
      inStyleValue = saved;
    }
  }
  function emitStyleObject(pairs) {
    emit("{ ");
    pairs.forEach((p, i) => {
      if (i) emit(", ");
      emitStylePair(p);
    });
    emit(" }");
  }
  function emitStyleBindObject(pairs) {
    emit("{ ");
    pairs.forEach((p, i) => {
      if (i) emit(", ");
      emit(JSON.stringify(styleProp(p.key)));
      emit(": () => (");
      const saved = inStyleValue;
      inStyleValue = true;
      if (p.value.kind === "word") {
        if (isStyleWord(p.value.value) && !stateNames.has(p.value.value)) emit(JSON.stringify(styleValue(p.value.value)));
        else emit(id(p.value.value) + "()");
      } else {
        genExpr(p.value.value);
      }
      inStyleValue = saved;
      emit(")");
    });
    emit(" }");
  }
  function genExpr(node) {
    switch (node.type) {
      case "Number":
        emit(node.value);
        break;
      case "String":
        emit(JSON.stringify(unescapeStr(node.value)));
        break;
      case "Template": {
        const esc = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
        emit("`");
        emit(esc(unescapeStr(node.chunks[0])));
        node.parts.forEach((p, idx) => {
          emit("${");
          genExpr(p);
          emit("}");
          emit(esc(unescapeStr(node.chunks[idx + 1] ?? "")));
        });
        emit("`");
        break;
      }
      case "Boolean":
        emit(node.value ? "true" : "false");
        break;
      case "Null":
        emit("null");
        break;
      case "Identifier": {
        if (inStyleValue && isStyleWord(node.name) && !stateNames.has(node.name)) {
          emit(JSON.stringify(styleValue(node.name)));
          break;
        }
        if (stateNames.has(node.name)) {
          emit(id(node.name) + "()");
          break;
        }
        const g = GLOBALS[node.name];
        emit(g !== void 0 ? g : id(node.name));
        break;
      }
      case "FuncExpr": {
        emit(`${node.async ? "async " : ""}function (${node.params.map(id).join(", ")}) `);
        const savedAD = asyncDepth;
        asyncDepth = node.async ? 1 : 0;
        genBlock(node.body, "");
        asyncDepth = savedAD;
        break;
      }
      case "Await":
        if (asyncDepth === 0) {
          throw new DevabhashaError(
            "\u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E\u0926\u094B\u0937\u0903: \u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E (await) is only valid inside an \u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915 (async) function",
            { line: node.line, col: node.col, kind: "codegen" }
          );
        }
        emit("await ");
        genExpr(node.argument);
        break;
      case "Array":
        emit("[");
        node.elements.forEach((e, i) => {
          if (i) emit(", ");
          genExpr(e);
        });
        emit("]");
        break;
      case "Binary":
        emit("(");
        genExpr(node.left);
        emit(` ${node.op} `);
        genExpr(node.right);
        emit(")");
        break;
      case "Unary":
        emit(node.op);
        genExpr(node.argument);
        break;
      case "Assign":
        if (node.target.type === "Identifier" && stateNames.has(node.target.name)) {
          emit(id(node.target.name) + "(");
          genExpr(node.value);
          emit(")");
        } else {
          genExpr(node.target);
          emit(" = ");
          genExpr(node.value);
        }
        break;
      case "Ternary":
        emit("(");
        genExpr(node.test);
        emit(" ? ");
        genExpr(node.consequent);
        emit(" : ");
        genExpr(node.alternate);
        emit(")");
        break;
      case "OrElse":
        emit("__RT.orElse(");
        genExpr(node.value);
        emit(", () => (");
        genExpr(node.fallback);
        emit("))");
        break;
      case "Sutra":
        emit("__DB.sutra(() => (");
        genExpr(node.expr);
        emit("))");
        break;
      case "Update":
        if (node.target.type === "Identifier" && stateNames.has(node.target.name)) {
          const nm = id(node.target.name);
          emit(`${nm}(${nm}() ${node.op === "++" ? "+" : "-"} 1)`);
        } else {
          genExpr(node.target);
          emit(node.op);
        }
        break;
      case "Call":
        genExpr(node.callee);
        emit("(");
        node.args.forEach((a, i) => {
          if (i) emit(", ");
          genExpr(a);
        });
        emit(")");
        break;
      case "Member":
        if (!node.computed && node.object.type === "Identifier" && namespaceAliases.has(node.object.name)) {
          emit(id(node.object.name));
          emit(`[${JSON.stringify(id(node.property))}]`);
          break;
        }
        genExpr(node.object);
        if (node.computed) {
          emit("[");
          genExpr(node.property);
          emit("]");
        } else {
          const jsName = METHODS[node.property] || PROPERTIES[node.property] || MATH_CONSTANTS[node.property] || node.property;
          emit(`.${jsName}`);
        }
        break;
      case "ObjectLiteral":
        emit("{ ");
        node.props.forEach((p, i) => {
          if (i) emit(", ");
          emit(JSON.stringify(p.key.value));
          emit(": ");
          genExpr(p.value);
        });
        emit(" }");
        break;
      case "ElementExpr":
        emit("__DB.el(");
        node.args.forEach((a, i) => {
          if (i) emit(", ");
          genExpr(a);
        });
        emit(")");
        break;
      case "Construct": {
        const s = node.slots;
        emit("__DB.construct({ tag: ");
        genExpr(s.tag);
        if (s.content) {
          if (!inView && readsState(s.content)) {
            emit(", contentBind: () => (");
            genExpr(s.content);
            emit(")");
          } else {
            emit(", content: ");
            genExpr(s.content);
          }
        }
        if (s.event) {
          emit(", event: ");
          genExpr(s.event);
        }
        if (s.handler) {
          emit(", handler: ");
          genExpr(s.handler);
        }
        if (s.parent) {
          emit(", parent: ");
          genExpr(s.parent);
        }
        if (s.prop) {
          emit(", prop: ");
          genExpr(s.prop);
        }
        if (s.source) {
          emit(", source: ");
          genExpr(s.source);
        }
        if (node.style && (node.style.base || node.style.pairs && node.style.pairs.length)) {
          const { base, pairs } = node.style;
          const { staticPairs, bindPairs } = partitionStylePairs(pairs || []);
          if (base || staticPairs.length) {
            emit(", style: ");
            if (base) {
              emit("Object.assign({}, ");
              genExpr(base);
              if (staticPairs.length) {
                emit(", ");
                emitStyleObject(staticPairs);
              }
              emit(")");
            } else {
              emitStyleObject(staticPairs);
            }
          }
          if (bindPairs.length) {
            emit(", styleBind: ");
            emitStyleBindObject(bindPairs);
          }
        }
        if (node.children && node.children.length) {
          emit(", children: [");
          node.children.forEach((c, i) => {
            if (i) emit(", ");
            genExpr(c);
          });
          emit("]");
        }
        emit(" })");
        break;
      }
      case "Mount":
        emit("__DB.mount(");
        node.args.forEach((a, i) => {
          if (i) emit(", ");
          genExpr(a);
        });
        emit(")");
        break;
      case "Listen":
        emit("__DB.listen(");
        node.args.forEach((a, i) => {
          if (i) emit(", ");
          genExpr(a);
        });
        emit(")");
        break;
      default:
        throw new Error(`codegen: unknown expression ${node.type}`);
    }
  }
  if (includeRuntime) emit(PRELUDE + RUNTIME + "\n");
  gen(ast);
  if (sourceMap || withMeta) {
    const result = { code: out, exports: exports2, imports };
    if (sourceMap) result.map = buildSourceMap(mappings, out);
    return result;
  }
  return out;
}
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function vlqEncode(num) {
  let vlq = num < 0 ? -num << 1 | 1 : num << 1;
  let out = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    out += B64[digit];
  } while (vlq > 0);
  return out;
}
function buildSourceMap(mappings, code, { file = "out.js", source = "input.deva" } = {}) {
  const byLine = /* @__PURE__ */ new Map();
  for (const m of mappings) {
    if (!byLine.has(m.genLine)) byLine.set(m.genLine, []);
    byLine.get(m.genLine).push(m);
  }
  const totalLines = code.split("\n").length;
  let prevGenCol = 0, prevSrcLine = 0, prevSrcCol = 0;
  const lineStrings = [];
  for (let line = 0; line < totalLines; line++) {
    const segs = (byLine.get(line) || []).sort((a, b) => a.genCol - b.genCol);
    prevGenCol = 0;
    const parts = [];
    for (const m of segs) {
      const seg = vlqEncode(m.genCol - prevGenCol) + vlqEncode(0) + // single source, index 0
      vlqEncode(m.srcLine - 1 - prevSrcLine) + vlqEncode(m.srcCol - 1 - prevSrcCol);
      prevGenCol = m.genCol;
      prevSrcLine = m.srcLine - 1;
      prevSrcCol = m.srcCol - 1;
      parts.push(seg);
    }
    lineStrings.push(parts.join(","));
  }
  return {
    version: 3,
    file,
    sources: [source],
    names: [],
    mappings: lineStrings.join(";")
  };
}
var TRANSLIT = {
  // independent vowels
  "\u0905": "a",
  "\u0906": "aa",
  "\u0907": "i",
  "\u0908": "ii",
  "\u0909": "u",
  "\u090A": "uu",
  "\u090B": "ri",
  "\u0960": "rii",
  "\u090C": "li",
  "\u090F": "e",
  "\u0910": "ai",
  "\u0913": "o",
  "\u0914": "au",
  // consonants (inherent 'a')
  "\u0915": "ka",
  "\u0916": "kha",
  "\u0917": "ga",
  "\u0918": "gha",
  "\u0919": "nga",
  "\u091A": "ca",
  "\u091B": "cha",
  "\u091C": "ja",
  "\u091D": "jha",
  "\u091E": "nya",
  "\u091F": "tta",
  "\u0920": "ttha",
  "\u0921": "dda",
  "\u0922": "ddha",
  "\u0923": "nna",
  "\u0924": "ta",
  "\u0925": "tha",
  "\u0926": "da",
  "\u0927": "dha",
  "\u0928": "na",
  "\u092A": "pa",
  "\u092B": "pha",
  "\u092C": "ba",
  "\u092D": "bha",
  "\u092E": "ma",
  "\u092F": "ya",
  "\u0930": "ra",
  "\u0932": "la",
  "\u0935": "va",
  "\u0936": "sha",
  "\u0937": "ssa",
  "\u0938": "sa",
  "\u0939": "ha",
  "\u0933": "lla",
  // dependent vowel signs (matras) — replace the inherent 'a'
  "\u093E": "aa",
  "\u093F": "i",
  "\u0940": "ii",
  "\u0941": "u",
  "\u0942": "uu",
  "\u0943": "ri",
  "\u0947": "e",
  "\u0948": "ai",
  "\u094B": "o",
  "\u094C": "au",
  // anusvara / visarga / chandrabindu
  "\u0902": "m",
  "\u0903": "h",
  "\u0901": "n"
};
var VIRAMA = "\u094D";
function id(name) {
  let result = "";
  const chars = [...name];
  for (let k = 0; k < chars.length; k++) {
    const ch = chars[k];
    if (/[A-Za-z0-9_$]/.test(ch)) {
      result += ch;
      continue;
    }
    if (ch === VIRAMA) {
      if (result.endsWith("a")) result = result.slice(0, -1);
      continue;
    }
    const next = chars[k + 1];
    const map = TRANSLIT[ch];
    if (map !== void 0) {
      if (/[\u093E-\u094C]/.test(ch) && result.endsWith("a")) {
        result = result.slice(0, -1) + map;
      } else {
        result += map;
      }
    } else {
      result += "_u" + ch.codePointAt(0).toString(16);
    }
  }
  if (/^[0-9]/.test(result)) result = "_" + result;
  if (JS_RESERVED.has(result)) result = result + "_";
  return result || "_";
}
var JS_RESERVED = /* @__PURE__ */ new Set([
  "do",
  "if",
  "in",
  "for",
  "new",
  "var",
  "let",
  "try",
  "case",
  "else",
  "enum",
  "eval",
  "null",
  "this",
  "true",
  "void",
  "with",
  "break",
  "catch",
  "class",
  "const",
  "false",
  "super",
  "throw",
  "while",
  "yield",
  "delete",
  "export",
  "import",
  "return",
  "switch",
  "typeof",
  "default",
  "extends",
  "finally",
  "continue",
  "debugger",
  "function",
  "arguments",
  "await",
  "async",
  "instanceof"
]);
function unescapeStr(s) {
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "	").replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}

// src/symbols.js
function makeScope(parent) {
  return { parent, names: /* @__PURE__ */ new Map() };
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
function buildSymbols(source) {
  let ast;
  try {
    ast = parse(tokenize(source));
  } catch {
    return { bindings: [], references: [], ok: false };
  }
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
  function walkExpr(node, scope) {
    if (!node || typeof node !== "object") return;
    switch (node.type) {
      case "Identifier":
        addRef(node.name, { line: node.line, col: node.col }, scope);
        return;
      case "FuncExpr": {
        const fscope = makeScope(scope);
        (node.params || []).forEach((p, i) => addBinding(p, node.params.__pos && node.params.__pos[i], fscope));
        walkBlock(node.body, fscope);
        return;
      }
      case "Member":
        walkExpr(node.object, scope);
        if (node.computed) walkExpr(node.property, scope);
        return;
      default:
        for (const k of Object.keys(node)) {
          if (k === "line" || k === "col" || k === "namePos" || k === "paramPos") continue;
          const v = node[k];
          if (Array.isArray(v)) v.forEach((c) => walkExpr(c, scope));
          else if (v && typeof v === "object" && v.type) walkExpr(v, scope);
        }
    }
  }
  function walkBlock(block, scope) {
    const body = Array.isArray(block) ? block : block && block.body || [];
    for (const s of body) walkStmt(s, scope);
  }
  function walkStmt(node, scope) {
    if (!node || typeof node !== "object") return;
    switch (node.type) {
      case "VarDecl":
        if (node.init) walkExpr(node.init, scope);
        addBinding(node.name, node.namePos, scope);
        return;
      case "StateDecl":
        if (node.init) walkExpr(node.init, scope);
        addBinding(node.name, node.namePos, scope);
        return;
      case "StyleDecl":
        addBinding(node.name, node.namePos, scope);
        (node.pairs || []).forEach((p) => p.value && p.value.kind === "expr" && walkExpr(p.value.value, scope));
        return;
      case "FuncDecl": {
        addBinding(node.name, node.namePos, scope);
        const fscope = makeScope(scope);
        (node.params || []).forEach((p, i) => addBinding(p, node.paramPos && node.paramPos[i], fscope));
        walkBlock(node.body, fscope);
        return;
      }
      case "ForOf": {
        walkExpr(node.iterable, scope);
        const lscope = makeScope(scope);
        addBinding(node.item, node.namePos, lscope);
        walkBlock(node.body, lscope);
        return;
      }
      case "Block":
        walkBlock(node.body, makeScope(scope));
        return;
      case "If":
        walkExpr(node.test, scope);
        node.consequent && walkBlock(node.consequent.body || node.consequent, makeScope(scope));
        node.alternate && walkBlock(node.alternate.body || node.alternate, makeScope(scope));
        return;
      case "While":
        walkExpr(node.test, scope);
        node.body && walkBlock(node.body.body || node.body, makeScope(scope));
        return;
      case "Export":
        walkStmt(node.decl, scope);
        return;
      case "View":
        node.container && walkExpr(node.container, scope);
        node.body && walkBlock(node.body.body || node.body, makeScope(scope));
        return;
      case "ExpressionStatement":
        walkExpr(node.expression, scope);
        return;
      default:
        for (const k of Object.keys(node)) {
          if (k === "line" || k === "col" || k === "namePos" || k === "paramPos") continue;
          const v = node[k];
          if (Array.isArray(v)) v.forEach((c) => c && c.type && walkExpr(c, scope));
          else if (v && typeof v === "object" && v.type) walkExpr(v, scope);
        }
    }
  }
  const top = makeScope(null);
  walkBlock(ast, top);
  const seen = /* @__PURE__ */ new Set();
  const deduped = references.filter((r) => {
    const key = r.name + "@" + r.line + ":" + r.col;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { bindings, references: deduped, ok: true };
}
function definitionAt(source, line, col) {
  const { bindings, references } = buildSymbols(source);
  const ref = references.find((r) => r.line === line && col >= r.col && col < r.col + r.name.length);
  if (ref) return ref.binding || null;
  const b = bindings.find((b2) => b2.line === line && col >= b2.col && col < b2.col + b2.name.length);
  return b || null;
}
function occurrencesAt(source, line, col) {
  const { bindings, references } = buildSymbols(source);
  let target = null;
  const ref = references.find((r) => r.line === line && col >= r.col && col < r.col + r.name.length);
  if (ref) target = ref.binding;
  if (!target) target = bindings.find((b) => b.line === line && col >= b.col && col < b.col + b.name.length);
  if (!target) return [];
  const out = [{ line: target.line, col: target.col, name: target.name }];
  for (const r of references) {
    if (r.binding && r.binding.id === target.id) out.push({ line: r.line, col: r.col, name: r.name });
  }
  return out;
}

// src/analyzer.js
function diagnostics(source) {
  try {
    generate(parse(tokenize(source)), { includeRuntime: false });
    return [];
  } catch (e) {
    if (e instanceof DevabhashaError) {
      const line = e.line || 1;
      const col = e.col || 1;
      return [{
        line,
        col,
        endCol: col + 1,
        message: e.message,
        kind: e.kind || "parse",
        severity: 1
        // Error
      }];
    }
    return [{ line: 1, col: 1, endCol: 2, message: String(e.message || e), kind: "internal", severity: 1 }];
  }
}
function buildVocabulary() {
  const items = [];
  const add = (label, kind, detail, doc) => items.push({ label, kind, detail, doc });
  const KW_DOC = {
    "\u091A\u0930": "let \u2014 mutable variable",
    "\u0928\u093F\u092F\u0924": "const \u2014 constant",
    "\u0915\u093E\u0930\u094D\u092F": "function",
    "\u092B\u0932\u092E\u094D": "return",
    "\u092F\u0926\u093F": "if",
    "\u0905\u0928\u094D\u092F\u0925\u093E": "else",
    "\u092F\u093E\u0935\u0924\u094D": "while",
    "\u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915\u092E\u094D": "for-of loop",
    "\u092D\u0919\u094D\u0917": "break",
    "\u0905\u0928\u0941\u0935\u0943\u0924\u094D\u0924\u092E\u094D": "continue",
    "\u0938\u0924\u094D\u092F\u092E\u094D": "true",
    "\u0905\u0938\u0924\u094D\u092F\u092E\u094D": "false",
    "\u0936\u0942\u0928\u094D\u092F\u092E\u094D": "null",
    "\u0926\u0930\u094D\u0936\u092F": "print / console.log",
    "\u0915\u094B\u0937": "object literal",
    "\u0930\u091A\u092F": "construct a DOM element",
    "\u092F\u094B\u091C\u092F": "mount / append",
    "\u0930\u0942\u092A": "style block (CSS)",
    "\u0930\u0942\u092A\u0928\u093E\u092E": "named reusable style",
    "\u092D\u093E\u0935": "reactive state cell",
    "\u0926\u0943\u0936\u094D\u092F": "reactive view region",
    "\u0928\u093F\u0930\u094D\u092F\u093E\u0924": "export",
    "\u0906\u092F\u093E\u0924": "import",
    "\u0906": "from (module source)",
    "\u0905\u0938\u092E\u0915\u093E\u0932\u093F\u0915": "async function",
    "\u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E": "await",
    "\u0905\u0925\u0935\u093E": "Result value-or-fallback (or-else)"
  };
  for (const k of Object.keys(KEYWORDS)) add(k, "keyword", KW_DOC[k] || "keyword", KW_DOC[k] || "");
  for (const [k, v] of Object.entries(METHODS)) add(k, "method", `.${v}()`, `method \u2192 ${v}`);
  for (const [k, v] of Object.entries(PROPERTIES)) add(k, "property", `.${v}`, `property \u2192 ${v}`);
  for (const [k, v] of Object.entries(MATH_CONSTANTS)) add(k, "constant", `\u0917\u0923\u093F\u0924.${v}`, `Math.${v}`);
  for (const [k, v] of Object.entries(GLOBALS)) add(k, "function", v, `builtin \u2192 ${v}`);
  for (const [k, v] of Object.entries(STYLE_PROPS)) add(k, "field", `${v}:`, `CSS property \u2192 ${v}`);
  for (const [k, v] of Object.entries(STYLE_VALUES)) add(k, "value", v, `CSS value \u2192 ${v}`);
  for (const [k, v] of Object.entries(TAG_STEMS)) add(k, "tag", `<${v}>`, `element \u2192 <${v}>`);
  for (const [k, v] of Object.entries(EVENT_STEMS)) add(k, "event", v, `event \u2192 ${v}`);
  return items;
}
var VOCAB = buildVocabulary();
var VOCAB_BY_LABEL = /* @__PURE__ */ new Map();
for (const it of VOCAB) if (!VOCAB_BY_LABEL.has(it.label)) VOCAB_BY_LABEL.set(it.label, it);
function completions(prefix = "") {
  if (!prefix) return VOCAB.slice();
  return VOCAB.filter((it) => it.label.startsWith(prefix));
}
function wordAt(lineText, charIndex) {
  const isWordChar2 = (ch) => /[\u0900-\u097F_a-zA-Z0-9]/.test(ch);
  let start = charIndex, end = charIndex;
  while (start > 0 && isWordChar2(lineText[start - 1])) start--;
  while (end < lineText.length && isWordChar2(lineText[end])) end++;
  return { word: lineText.slice(start, end), start, end };
}
function hover(word) {
  const it = VOCAB_BY_LABEL.get(word);
  if (!it) return null;
  return { label: word, detail: it.detail, doc: it.doc, kind: it.kind };
}
function definition(source, line, col) {
  const b = definitionAt(source, line, col);
  return b ? { line: b.line, col: b.col, name: b.name } : null;
}
function renameOccurrences(source, line, col) {
  return occurrencesAt(source, line, col);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VOCAB,
  completions,
  definition,
  diagnostics,
  hover,
  renameOccurrences,
  wordAt
});
