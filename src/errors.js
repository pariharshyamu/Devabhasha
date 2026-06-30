// errors.js — structured compiler errors with source-context formatting.
//
// A good error shows WHERE the problem is, in the source, with a caret.
// DevabhashaError carries the position; formatError renders the offending
// line and points at the column:
//
//   दोषः (parse error): expected ')' but found ';'
//     line 3, column 12
//
//     ३ | दर्शय(अ + ब;
//       |           ^
//
// kind is a short tag ('lex' | 'parse' | 'codegen') used for the heading.

export class DevabhashaError extends Error {
  constructor(message, { line = null, col = null, kind = 'parse' } = {}) {
    super(message);
    this.name = 'DevabhashaError';
    this.line = line;
    this.col = col;
    this.kind = kind;
  }
}

const KIND_LABEL = {
  lex: 'अक्षरदोषः (lex error)',
  parse: 'पाठदोषः (parse error)',
  codegen: 'कूटदोषः (codegen error)',
  runtime: 'क्रियादोषः (runtime error)',
};

// Convert a Devanagari/ASCII digit line number into Devanagari for display.
const DEVA_DIGITS = '०१२३४५६७८९';
function toDeva(n) {
  return String(n).split('').map(d => /[0-9]/.test(d) ? DEVA_DIGITS[+d] : d).join('');
}

// Render an error with source context. `source` is the original program text.
export function formatError(err, source) {
  const label = KIND_LABEL[err.kind] || 'दोषः (error)';
  let out = `${label}: ${err.message}`;

  if (err.line == null) return out;

  out += `\n  line ${err.line}, column ${err.col ?? '?'}`;

  if (source != null) {
    const lines = source.split('\n');
    const srcLine = lines[err.line - 1];
    if (srcLine !== undefined) {
      const gutter = toDeva(err.line);
      const pad = ' '.repeat(gutter.length);
      out += `\n\n  ${gutter} | ${srcLine}`;
      if (err.col != null) {
        // caret: account for the gutter and the column (1-based)
        const caretPad = ' '.repeat(Math.max(0, err.col - 1));
        out += `\n  ${pad} | ${caretPad}^`;
      }
    }
  }
  return out;
}

// Helper used by the lexer/parser to raise a positioned error.
export function raise(message, pos, kind = 'parse') {
  throw new DevabhashaError(message, {
    line: pos && pos.line,
    col: pos && pos.col,
    kind,
  });
}
