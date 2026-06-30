// vibhakti.js — the kāraka/case engine.
//
// Given an inflected Devanagari noun, detect its vibhakti (case ending),
// recover the stem, and map the case to a kāraka (semantic role).
//
// SCOPE (honest): full Sanskrit declension is stem-class- and gender-
// dependent and very large. We implement the अकारान्त पुंल्लिङ्ग/नपुंसकलिङ्ग
// (a-stem masc/neut) singular paradigm robustly — this covers the great
// majority of coined technical vocabulary — plus a particle-style escape
// hatch. Extending to other stems = adding rows to PARADIGMS.

// The six kārakas + two non-kāraka relations we also accept (sambandha =
// genitive "of", which is structurally useful for property access).
export const KARAKA = {
  KARTR:      'kartr',       // agent      — nominative   (प्रथमा)
  KARMAN:     'karman',      // patient    — accusative   (द्वितीया)
  KARANA:     'karana',      // instrument — instrumental (तृतीया)
  SAMPRADANA: 'sampradana',  // recipient  — dative       (चतुर्थी)
  APADANA:    'apadana',     // source     — ablative     (पञ्चमी)
  SAMBANDHA:  'sambandha',   // relation   — genitive     (षष्ठी)
  ADHIKARANA: 'adhikarana',  // locus      — locative     (सप्तमी)
};

// a-stem singular endings (after the stem, which ends in the inherent 'अ').
// We express each ending as the sequence that REPLACES the stem-final 'अ'.
// Written in Devanagari as the surface suffix on a consonant-final stem.
// Example stem: रक्त (rakta) → रक्तः (nom), रक्तम् (acc), रक्तेन (instr)…
//
// We store endings as the trailing string of the FULL word so the matcher
// can do longest-suffix matching. Order longest-first.
const A_STEM_SINGULAR = [
  // [ surface ending, case, kāraka,  stemEndsWith ]
  // The stem is recovered by removing `ending` and restoring final 'अ'
  // where the paradigm fuses it.
  { end: 'स्मिन्', case: 'locative',     karaka: KARAKA.ADHIKARANA, restore: 'अ' }, // rare pronominal; keep before others
  { end: 'ेषु',   case: 'locative_pl',  karaka: KARAKA.ADHIKARANA, restore: 'अ' },
  { end: 'ेन',    case: 'instrumental', karaka: KARAKA.KARANA,      restore: 'अ' }, // रक्तेन
  { end: 'ाय',    case: 'dative',       karaka: KARAKA.SAMPRADANA,  restore: 'अ' }, // रक्ताय
  { end: 'ात्',   case: 'ablative',     karaka: KARAKA.APADANA,     restore: 'अ' }, // रक्तात्
  { end: 'स्य',   case: 'genitive',     karaka: KARAKA.SAMBANDHA,   restore: 'अ' }, // रक्तस्य
  { end: 'े',     case: 'locative',     karaka: KARAKA.ADHIKARANA,  restore: 'अ' }, // रक्ते
  { end: 'म्',    case: 'accusative',   karaka: KARAKA.KARMAN,      restore: 'अ' }, // रक्तम्
  { end: 'ः',     case: 'nominative',   karaka: KARAKA.KARTR,       restore: 'अ' }, // रक्तः
];

// Virama / halant and the inherent vowel handling.
const VIRAMA = '\u094D';
const INHERENT = 'अ';

// Some words are written with an explicit final consonant+virama in the
// stem (e.g. अङ्गम् the keyword). For nominal arguments we expect the
// surface forms above.

// Detect: returns { stem, case, karaka } or null if no case ending found.
export function analyze(word) {
  for (const row of A_STEM_SINGULAR) {
    if (word.endsWith(row.end)) {
      let stem = word.slice(0, word.length - row.end.length);
      // The a-stem fuses the stem-final inherent 'अ' with the ending.
      // After stripping the ending, `stem` ends in a bare consonant
      // (no virama shown because the inherent vowel was consumed by the
      // ending). We restore the citation form by appending nothing —
      // the consonant already implies 'अ' in Devanagari. So `stem` IS
      // the dictionary stem in surface form.
      if (stem.length === 0) continue;
      return { stem, case: row.case, karaka: row.karaka, ending: row.end };
    }
  }
  return null;
}

// Map a kāraka role-name (used by codegen) from a detected analysis.
export function karakaOf(word) {
  const a = analyze(word);
  return a ? a.karaka : null;
}

// For diagnostics / REPL: pretty Sanskrit name of a kāraka.
export const KARAKA_NAME_SA = {
  [KARAKA.KARTR]:      'कर्तृ',
  [KARAKA.KARMAN]:     'कर्म',
  [KARAKA.KARANA]:     'करण',
  [KARAKA.SAMPRADANA]: 'सम्प्रदान',
  [KARAKA.APADANA]:    'अपादान',
  [KARAKA.SAMBANDHA]:  'सम्बन्ध',
  [KARAKA.ADHIKARANA]: 'अधिकरण',
};
