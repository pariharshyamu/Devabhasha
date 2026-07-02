// keywords.js — the Sanskrit-language surface layer.
// Edit vocabulary here without touching the lexer/parser/codegen.
//
// Each keyword maps a Devanagari word -> an internal token type.
// The internal token types are language-neutral so the rest of the
// compiler never sees Sanskrit directly.

export const KEYWORDS = {
  // declarations
  'चर':      'LET',        // cara — "it varies" → mutable binding
  'नियत':    'CONST',      // niyata — "fixed" → constant
  'कार्य':    'FUNC',       // kārya — "work to be done" → function
  'फलम्':     'RETURN',     // phalam — "fruit/result" → return

  // control flow
  'यदि':      'IF',         // yadi — if
  'अन्यथा':   'ELSE',       // anyathā — otherwise
  'यावत्':    'WHILE',      // yāvat — "as long as" → while
  'प्रत्येकम्': 'FOR',        // pratyekam — "for each" → for-of
  'विकल्प':    'SWITCH',     // vikalpa — "option/alternative" → switch
  'स्थिति':    'CASE',       // sthiti — "situation/case" → case (a विकल्प branch)
  'भङ्ग':     'BREAK',      // bhaṅga — "breaking" → break
  'अनुवृत्तम्': 'CONTINUE',   // anuvṛttam — "continuing" → continue

  // literals
  'सत्यम्':    'TRUE',       // satyam — true
  'असत्यम्':   'FALSE',      // asatyam — false
  'शून्यम्':   'NULL',       // śūnyam — "void/zero" → null

  // web / DOM layer
  'दर्शय':     'PRINT',      // darśaya — "cause to show" → console.log
  'अङ्गम्':    'ELEMENT',    // aṅgam — "limb/part" → createElement
  'योजय':     'MOUNT',      // yojaya — "join/attach" → append to DOM
  'श्रोता':    'LISTEN',     // śrotā — "listener" → addEventListener
  'रचय':      'CONSTRUCT',  // racaya — "construct" → kāraka-based DOM builder
  'कोष':      'OBJECT',     // kośa — "treasury/dictionary" → object literal
  'रूप':      'STYLE',      // rūpa — "form/appearance" → style block
  'रूपनाम':   'STYLENAME',  // rūpanāma — "form-name" → named reusable style
  'भाव':      'STATE',      // bhāva — "state/condition" → reactive state cell
  'दृश्य':     'VIEW',       // dṛśya — "view/visible" → reactive view region
  'निर्यात':   'EXPORT',     // niryāta — "sending out" → export
  'आयात':     'IMPORT',     // āyāta — "incoming" → import
  'आ':        'FROM',       // ā — "from" → module source preposition
  'असमकालिक': 'ASYNC',      // asamakālika — "asynchronous" → async function
  'प्रतीक्षा':  'AWAIT',      // pratīkṣā — "waiting" → await
  'अथवा':      'ORELSE',     // athavā — "or else" → Result value-or-fallback
  'सूत्र':      'SUTRA',      // sūtra — "thread" → a reactive reference (lazy, live)
};

// Reverse map for error messages / pretty-printing.
export const TOKEN_TO_WORD = Object.fromEntries(
  Object.entries(KEYWORDS).map(([word, tok]) => [tok, word])
);

// Multi-character operators must be listed longest-first so the lexer
// matches '==' before '=', '+=' before '+', etc.
export const OPERATORS = [
  '===', '!==', '??', '...',
  '==', '!=', '<=', '>=', '&&', '||',
  '+=', '-=', '*=', '/=', '%=', '++', '--',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '?',
  '(', ')', '{', '}', '[', ']', ',', ';', '.', ':',
];

// Devanagari danda (।) is accepted as a statement terminator, like ';'.
export const DANDA = '।';
