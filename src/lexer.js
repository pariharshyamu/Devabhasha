// lexer.js — turns Devanagari source text into a flat token stream.

import { KEYWORDS, OPERATORS, DANDA } from './keywords.js';
import { DevabhashaError } from './errors.js';

// Devanagari block: U+0900–U+097F. We treat a "word" as a run of
// Devanagari letters, virama, matras, anusvara, etc. plus ASCII letters.
// We exclude Devanagari punctuation: danda । (U+0964) and double danda ॥
// (U+0965), which are statement terminators, not identifier characters.
const DEVA = /[\u0900-\u0963\u0966-\u097F]/;
const DEVA_DIGITS = '०१२३४५६७८९';

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

export function tokenize(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const push = (type, value) => tokens.push({ type, value, line, col });
  const advance = (n = 1) => { i += n; col += n; };

  while (i < src.length) {
    const ch = src[i];

    // whitespace
    if (ch === '\n') { line++; col = 1; i++; continue; }
    if (/\s/.test(ch)) { advance(); continue; }

    // comments:  # to end of line
    if (ch === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }

    // danda → statement terminator
    if (ch === DANDA) { push('SEMI', ';'); advance(); continue; }

    // strings: "..." with \ escapes (plain — no interpolation by default).
    // Interpolation is opt-in via the पाठ"…{expr}…" marker (handled below in
    // the word branch), so existing strings containing literal braces are safe.
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line, startCol = col;
      advance();
      let str = '';
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') { str += src[i] + src[i + 1]; advance(2); }
        else if (src[i] === '\n') { line++; col = 1; str += '\n'; i++; }
        else { str += src[i]; advance(); }
      }
      advance(); // closing quote
      tokens.push({ type: 'STRING', value: str, line: startLine, col: startCol });
      continue;
    }

    // numbers (Devanagari or ASCII digits; one decimal point; optional
    // exponent e.g. 1e3, 2.5E-4). A second '.' or a bare exponent is left
    // for the next token rather than silently folded into a malformed number,
    // so 1.2.3 becomes NUMBER(1.2) '.' NUMBER(3) and fails at parse time
    // instead of emitting invalid JS.
    if (isDigit(ch)) {
      let num = '';
      let seenDot = false, seenExp = false;
      while (i < src.length) {
        const c = src[i];
        if (isDigit(c)) { num += normalizeDigit(c); advance(); continue; }
        // decimal point: only once, only before any exponent, only if a
        // digit follows (so member access on a number stays a separate '.').
        if (c === '.' && !seenDot && !seenExp && isDigit(src[i + 1])) {
          seenDot = true; num += '.'; advance(); continue;
        }
        // exponent: e/E, optional sign, then at least one digit.
        if ((c === 'e' || c === 'E') && !seenExp) {
          const signLen = (src[i + 1] === '+' || src[i + 1] === '-') ? 1 : 0;
          if (isDigit(src[i + 1 + signLen])) {
            seenExp = true;
            num += 'e'; advance();
            if (signLen) { num += src[i]; advance(); }
            continue;
          }
        }
        break;
      }
      push('NUMBER', num);
      continue;
    }

    // words → keyword or identifier
    if (isWordChar(ch)) {
      const wStartLine = line, wStartCol = col;
      let word = '';
      while (i < src.length && (isWordChar(src[i]) || isDigit(src[i]))) {
        word += src[i];
        advance();
      }
      // पाठ"…{expr}…" — an interpolated string. Only when पाठ is immediately
      // followed by a quote (no space), so the plain identifier पाठ is unaffected.
      if (word === 'पाठ' && (src[i] === '"' || src[i] === "'")) {
        const quote = src[i];
        advance(); // opening quote
        const chunks = [''];
        const exprs = [];
        while (i < src.length && src[i] !== quote) {
          if (src[i] === '\\') {
            const nxt = src[i + 1];
            if (nxt === '{' || nxt === '}') { chunks[chunks.length - 1] += nxt; advance(2); }
            else { chunks[chunks.length - 1] += src[i] + nxt; advance(2); }
          } else if (src[i] === '{') {
            advance(); // {
            let depth = 1, expr = '';
            while (i < src.length && depth > 0) {
              if (src[i] === '{') depth++;
              else if (src[i] === '}') { depth--; if (depth === 0) break; }
              if (src[i] === '\n') { line++; col = 1; expr += '\n'; i++; }
              else { expr += src[i]; advance(); }
            }
            advance(); // }
            exprs.push(expr);
            chunks.push('');
          } else if (src[i] === '\n') { line++; col = 1; chunks[chunks.length - 1] += '\n'; i++; }
          else { chunks[chunks.length - 1] += src[i]; advance(); }
        }
        advance(); // closing quote
        tokens.push({ type: 'TEMPLATE', chunks, exprs, line: wStartLine, col: wStartCol });
        continue;
      }
      if (KEYWORDS[word]) push(KEYWORDS[word], word);
      else push('IDENT', word);
      continue;
    }

    // operators / punctuation
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    if (OPERATORS.includes(three)) { push('OP', three); advance(3); continue; }
    if (OPERATORS.includes(two)) {
      const t = two === ';' ? 'SEMI' : 'OP';
      push(t, two); advance(2); continue;
    }
    if (OPERATORS.includes(ch)) {
      const t = ch === ';' ? 'SEMI' : 'OP';
      push(t, ch); advance(); continue;
    }

    throw new DevabhashaError(`अज्ञातं चिह्नम् (unknown character) '${ch}'`, { line, col, kind: 'lex' });
  }

  push('EOF', null);
  return tokens;
}
