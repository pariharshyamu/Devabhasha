// vibhakti.js — the kāraka/case engine.
//
// Given an inflected Devanagari noun, detect its विभक्ति (case ending) and
// वचन (number), recover the प्रातिपदिक (stem), and map the case to a कारक
// (semantic role). This is the morphological core behind रचय's free word
// order: a word's role comes from its ending, not its position.
//
// DESIGN. Devabhāṣā's surface convention is Pāṇinian but pragmatic: a
// role-marker (the सुप् ending) is appended to the प्रातिपदिक — पट + ः → पटः,
// सूची + ः → सूचीः — rather than running full class-specific सन्धि. That single
// convention lets one paradigm serve every stem for the common cases. On top
// of it we also recognise the genuinely class-specific oblique forms (the
// आकारान्त feminine singular, the णत्व instrumental) so hand-written classical
// Sanskrit is understood too.
//
// SCOPE. All three वचन (एक/द्वि/बहु — singular/dual/plural) across the seven
// विभक्ति, for the generic अकारान्त-style paradigm, plus आकारान्त feminine
// obliques and णत्व. Syncretic forms (Sanskrit reuses one ending for several
// cells) resolve to the most construction-useful reading; see SYNCRETISM
// notes on the rows. Extending further = adding rows to PARADIGM_TABLE.

// The six kārakas + two non-kāraka relations we also accept (sambandha =
// genitive "of", structurally useful for property access).
export const KARAKA = {
  KARTR:      'kartr',       // agent      — nominative   (प्रथमा)
  KARMAN:     'karman',      // patient    — accusative   (द्वितीया)
  KARANA:     'karana',      // instrument — instrumental (तृतीया)
  SAMPRADANA: 'sampradana',  // recipient  — dative       (चतुर्थी)
  APADANA:    'apadana',     // source     — ablative     (पञ्चमी)
  SAMBANDHA:  'sambandha',   // relation   — genitive     (षष्ठी)
  ADHIKARANA: 'adhikarana',  // locus      — locative     (सप्तमी)
};

// वचन — grammatical number.
export const VACANA = {
  EKA:  'ekavacana',   // एकवचन  — singular
  DVI:  'dvivacana',   // द्विवचन — dual
  BAHU: 'bahuvacana',  // बहुवचन — plural
};

export const VACANA_NAME_SA = {
  [VACANA.EKA]:  'एकवचन',
  [VACANA.DVI]:  'द्विवचन',
  [VACANA.BAHU]: 'बहुवचन',
};

// The seven declensional विभक्ति, each tied to its kāraka. (सम्बोधन/vocative
// is an आमन्त्रण, not a kāraka, and its singular is the bare stem — which we
// deliberately do NOT treat as case-marked — so it is not listed here.)
export const VIBHAKTI = {
  prathama: { n: 1, sa: 'प्रथमा',  en: 'nominative',   karaka: KARAKA.KARTR },
  dvitiya:  { n: 2, sa: 'द्वितीया', en: 'accusative',   karaka: KARAKA.KARMAN },
  trtiya:   { n: 3, sa: 'तृतीया',   en: 'instrumental', karaka: KARAKA.KARANA },
  caturthi: { n: 4, sa: 'चतुर्थी',  en: 'dative',       karaka: KARAKA.SAMPRADANA },
  panchami: { n: 5, sa: 'पञ्चमी',   en: 'ablative',     karaka: KARAKA.APADANA },
  shashthi: { n: 6, sa: 'षष्ठी',    en: 'genitive',     karaka: KARAKA.SAMBANDHA },
  saptami:  { n: 7, sa: 'सप्तमी',   en: 'locative',     karaka: KARAKA.ADHIKARANA },
};

// The paradigm table. Each row: [ ending, vibhaktiKey, vacana, stemClass ].
// `stemClass` is informational (which declension the surface form belongs to).
// Rows are flattened and sorted longest-ending-first so the matcher does
// unambiguous longest-suffix matching; where two cells share an ending
// (Sanskrit syncretism) the comment marks the chosen reading.
const PARADIGM_TABLE = [
  // ── generic (अकारान्त-style role markers), एकवचन — the original set ──────
  ['स्मिन्', 'saptami',  VACANA.EKA,  'pronominal'], // rare pronominal loc.; keep first
  ['ेन',    'trtiya',   VACANA.EKA,  'a'],          // पटेन
  ['ेण',    'trtiya',   VACANA.EKA,  'a'],          // रामेण — णत्व (retroflex) variant
  ['ाय',    'caturthi', VACANA.EKA,  'a'],          // पटाय
  ['ात्',   'panchami', VACANA.EKA,  'a'],          // पटात्
  ['स्य',   'shashthi', VACANA.EKA,  'a'],          // पटस्य
  ['े',     'saptami',  VACANA.EKA,  'a'],          // पटे
  ['म्',    'dvitiya',  VACANA.EKA,  'a'],          // पटम्
  ['ः',     'prathama', VACANA.EKA,  'any'],        // पटः / सूचीः / पङ्क्तिः

  // ── द्विवचन (dual) ──────────────────────────────────────────────────────
  ['ाभ्याम्','trtiya',   VACANA.DVI,  'a'],  // SYNCRETISM ins/dat/abl du → instrumental
  ['योः',   'shashthi', VACANA.DVI,  'a'],  // SYNCRETISM gen/loc du → genitive
  ['ौ',     'prathama', VACANA.DVI,  'a'],  // SYNCRETISM nom/acc du → nominative

  // ── बहुवचन (plural) ─────────────────────────────────────────────────────
  ['ानाम्', 'shashthi', VACANA.BAHU, 'a'],  // पटानाम्
  ['ेभ्यः', 'caturthi', VACANA.BAHU, 'a'],  // SYNCRETISM dat/abl pl → dative
  ['ेषु',   'saptami',  VACANA.BAHU, 'a'],  // पटेषु
  ['ैः',    'trtiya',   VACANA.BAHU, 'a'],  // पटैः
  ['ान्',   'dvitiya',  VACANA.BAHU, 'a'],  // पटान्
  ['ानि',   'prathama', VACANA.BAHU, 'a-n'],// तत्त्वानि — neuter nom/acc pl → nominative
  ['ाः',    'prathama', VACANA.BAHU, 'a'],  // पटाः — nom pl (also ā-stem nom/acc pl)

  // ── आकारान्त स्त्रीलिङ्ग (ā-stem feminine) obliques — classical forms ─────
  ['ायाम्', 'saptami',  VACANA.EKA,  'aa'], // मालायाम्
  ['ायाः',  'shashthi', VACANA.EKA,  'aa'], // SYNCRETISM abl/gen sg → genitive
  ['ायै',   'caturthi', VACANA.EKA,  'aa'], // मालायै
  ['ाभिः',  'trtiya',   VACANA.BAHU, 'aa'], // मालाभिः
  ['ाभ्यः', 'caturthi', VACANA.BAHU, 'aa'], // SYNCRETISM dat/abl pl → dative
  ['ासु',   'saptami',  VACANA.BAHU, 'aa'], // मालासु
  ['ाम्',   'dvitiya',  VACANA.EKA,  'aa'], // मालाम् — acc sg
  ['या',    'trtiya',   VACANA.EKA,  'aa'], // मालया — instr sg
];

// Flatten to matcher rows, resolving vibhakti→karaka, sorted longest-first.
const PARADIGMS = PARADIGM_TABLE
  .map(([end, vibhaktiKey, vacana, cls]) => {
    const v = VIBHAKTI[vibhaktiKey];
    return { end, vibhaktiKey, case: v.en, karaka: v.karaka, number: vacana, cls };
  })
  .sort((a, b) => b.end.length - a.end.length);

// Detect: returns { stem, case, karaka, number, ending, cls, vibhakti } or
// null if no case ending is found. `case` stays the English case name for
// backward compatibility; `karaka` is what codegen/parser consume.
export function analyze(word) {
  for (const row of PARADIGMS) {
    if (word.endsWith(row.end)) {
      const stem = word.slice(0, word.length - row.end.length);
      // A bare stem (nothing before the ending) is not a case-marked word;
      // neither is a lone ending. This is what keeps uninflected stems and
      // ASCII words correctly OUT of the kāraka machinery.
      if (stem.length === 0) continue;
      return {
        stem,
        case: row.case,
        karaka: row.karaka,
        number: row.number,
        ending: row.end,
        cls: row.cls,
        vibhakti: row.vibhaktiKey,
      };
    }
  }
  return null;
}

// Map a kāraka role-name (used by codegen) from a detected analysis.
export function karakaOf(word) {
  const a = analyze(word);
  return a ? a.karaka : null;
}

// For diagnostics / hover / REPL: a full grammatical parse of an inflected
// noun, or null. e.g. describe('पटैः') →
//   { word, stem:'पट', vibhakti:'तृतीया', case:'instrumental',
//     vacana:'बहुवचन', number:'bahuvacana', karaka:'karana',
//     karakaSa:'करण', gloss:'तृतीया बहुवचन — instrumental plural (करण-कारक)' }
export function describe(word) {
  const a = analyze(word);
  if (!a) return null;
  const v = VIBHAKTI[a.vibhakti];
  const vacanaSa = VACANA_NAME_SA[a.number];
  const numberEn = a.number === VACANA.EKA ? 'singular'
                 : a.number === VACANA.DVI ? 'dual' : 'plural';
  const karakaSa = KARAKA_NAME_SA[a.karaka];
  return {
    word,
    stem: a.stem,
    vibhakti: v.sa,
    case: v.en,
    vacana: vacanaSa,
    number: a.number,
    karaka: a.karaka,
    karakaSa,
    gloss: `${v.sa} ${vacanaSa} — ${v.en} ${numberEn} (${karakaSa}-कारक)`,
  };
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
