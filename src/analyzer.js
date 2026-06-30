// analyzer.js — the language-analysis core powering the language server.
//
// Pure functions over source text: diagnostics (compile errors with
// positions), completions (keywords, stdlib, style vocab, tags), and hover
// (what a Sanskrit word means/translates to). The LSP server (server.js)
// is a thin protocol wrapper around these.

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { generate } from './codegen.js';
import { DevabhashaError } from './errors.js';
import { KEYWORDS } from './keywords.js';
import { METHODS, PROPERTIES, MATH_CONSTANTS, GLOBALS } from './stdlib.js';
import { STYLE_PROPS, STYLE_VALUES } from './style.js';
import { TAG_STEMS, EVENT_STEMS } from './karaka-web.js';

// ---- diagnostics ----
// Returns an array of { line, col, endCol, message, severity } for a source.
// Empty array means the program compiles. Positions are 1-based.
export function diagnostics(source) {
  try {
    generate(parse(tokenize(source)), { includeRuntime: false });
    return [];
  } catch (e) {
    if (e instanceof DevabhashaError) {
      const line = e.line || 1;
      const col = e.col || 1;
      return [{
        line, col, endCol: col + 1,
        message: e.message,
        kind: e.kind || 'parse',
        severity: 1, // Error
      }];
    }
    // unknown error — still surface it
    return [{ line: 1, col: 1, endCol: 2, message: String(e.message || e), kind: 'internal', severity: 1 }];
  }
}

// ---- the vocabulary index (for completion + hover) ----
// Each entry: { label, kind, detail, doc }
function buildVocabulary() {
  const items = [];
  const add = (label, kind, detail, doc) => items.push({ label, kind, detail, doc });

  // keywords
  const KW_DOC = {
    'चर': 'let — mutable variable', 'नियत': 'const — constant',
    'कार्य': 'function', 'फलम्': 'return', 'यदि': 'if', 'अन्यथा': 'else',
    'यावत्': 'while', 'प्रत्येकम्': 'for-of loop', 'भङ्ग': 'break',
    'अनुवृत्तम्': 'continue', 'सत्यम्': 'true', 'असत्यम्': 'false',
    'शून्यम्': 'null', 'दर्शय': 'print / console.log', 'कोष': 'object literal',
    'रचय': 'construct a DOM element', 'योजय': 'mount / append',
    'रूप': 'style block (CSS)', 'रूपनाम': 'named reusable style',
    'भाव': 'reactive state cell', 'दृश्य': 'reactive view region',
    'निर्यात': 'export', 'आयात': 'import', 'आ': 'from (module source)',
    'असमकालिक': 'async function', 'प्रतीक्षा': 'await', 'अथवा': 'Result value-or-fallback (or-else)',
  };
  for (const k of Object.keys(KEYWORDS)) add(k, 'keyword', KW_DOC[k] || 'keyword', KW_DOC[k] || '');

  // stdlib methods, properties, math, globals
  for (const [k, v] of Object.entries(METHODS)) add(k, 'method', `.${v}()`, `method → ${v}`);
  for (const [k, v] of Object.entries(PROPERTIES)) add(k, 'property', `.${v}`, `property → ${v}`);
  for (const [k, v] of Object.entries(MATH_CONSTANTS)) add(k, 'constant', `गणित.${v}`, `Math.${v}`);
  for (const [k, v] of Object.entries(GLOBALS)) add(k, 'function', v, `builtin → ${v}`);

  // style vocabulary
  for (const [k, v] of Object.entries(STYLE_PROPS)) add(k, 'field', `${v}:`, `CSS property → ${v}`);
  for (const [k, v] of Object.entries(STYLE_VALUES)) add(k, 'value', v, `CSS value → ${v}`);

  // tags & events (the stem → element kind)
  for (const [k, v] of Object.entries(TAG_STEMS)) add(k, 'tag', `<${v}>`, `element → <${v}>`);
  for (const [k, v] of Object.entries(EVENT_STEMS)) add(k, 'event', v, `event → ${v}`);

  return items;
}
const VOCAB = buildVocabulary();

// fast lookup by exact label (last write wins is fine; most are unique)
const VOCAB_BY_LABEL = new Map();
for (const it of VOCAB) if (!VOCAB_BY_LABEL.has(it.label)) VOCAB_BY_LABEL.set(it.label, it);

// ---- completion ----
// Given a source and a partial word (the token being typed), return matching
// vocabulary entries. If prefix is empty, returns everything (the client
// usually filters further).
export function completions(prefix = '') {
  if (!prefix) return VOCAB.slice();
  return VOCAB.filter(it => it.label.startsWith(prefix));
}

// Extract the "word" (Devanagari run) at a 0-based character offset in a line.
export function wordAt(lineText, charIndex) {
  // Devanagari block + danda-free identifier chars
  const isWordChar = ch => /[\u0900-\u097F_a-zA-Z0-9]/.test(ch);
  let start = charIndex, end = charIndex;
  while (start > 0 && isWordChar(lineText[start - 1])) start--;
  while (end < lineText.length && isWordChar(lineText[end])) end++;
  return { word: lineText.slice(start, end), start, end };
}

// ---- hover ----
// Return a doc string for a Sanskrit word, or null if unknown.
export function hover(word) {
  const it = VOCAB_BY_LABEL.get(word);
  if (!it) return null;
  return { label: word, detail: it.detail, doc: it.doc, kind: it.kind };
}

export { VOCAB };

// ---- go-to-definition & rename (scope-aware, via the symbol table) ----
import { definitionAt, occurrencesAt } from './symbols.js';

// Where is the symbol at (line, col) defined? → { line, col, name } | null
export function definition(source, line, col) {
  const b = definitionAt(source, line, col);
  return b ? { line: b.line, col: b.col, name: b.name } : null;
}

// Every occurrence to rename for the symbol at (line, col).
// Returns [{ line, col, name }] (the binding plus all bound references).
export function renameOccurrences(source, line, col) {
  return occurrencesAt(source, line, col);
}
