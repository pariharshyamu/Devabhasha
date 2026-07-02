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
// obliques and णत्व. The इ/ई/उ vowel-final construction stems additionally
// carry their genuine class-specific paradigm (नदी / मति / शत्रु declensions) —
// not just the nominative dual/plural, but the full oblique singular, dual, and
// plural — so classical forms like सूच्यै, सेतोः, पङ्क्तिषु parse with the right
// stem AND kāraka. Syncretic forms (Sanskrit reuses one ending for several
// cells) resolve to the most construction-useful reading; see SYNCRETISM
// notes on the rows. Extending further = adding rows to PARADIGM_TABLE (generic
// stems) or to NOMINAL_DECLENSION (a vowel-final class's paradigm).

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

// ── vowel-final stems (इकारान्त / ईकारान्त / उकारान्त) ──────────────────────
//
// The generic append-a-marker convention works for अकारान्त (consonant-final)
// stems — पट + ाः → पटाः. It CANNOT produce the nominative dual/plural of a
// vowel-final stem: सूची's plural is सूच्यः (not सूची+ाः), पङ्क्ति's is
// पङ्क्तयः, सेतु's is सेतवः. And those surfaces are genuinely ambiguous by
// suffix alone — वाक्यः (अकारान्त nom sg of वाक्य) also ends in ्यः — so they
// cannot go in the generic suffix matcher without breaking अकारान्त words.
//
// The Pāṇinian resolution: declension class is LEXICAL — a property of the
// प्रातिपदिक, not recoverable from the bare surface. So we tag each vowel-final
// construction stem with its class, GENERATE its true nominative dual/plural
// from that class, and index those exact forms for lookup BEFORE the generic
// matcher. Only these specific stems' forms are indexed, so अकारान्त words are
// untouched. The generic singular (सूचीः, पङ्क्तिः, सेतुः — the established
// convention) keeps flowing through the generic matcher. Adding a vowel-final
// tag = one row here.
const VOWEL_STEMS = [
  ['सूची',    'ii-f'], // ईकारान्त स्त्रीलिङ्ग (नदी-type) → ul
  ['पङ्क्ति', 'i-f'],  // इकारान्त स्त्रीलिङ्ग  (मति-type) → li
  ['सेतु',    'u-m'],  // उकारान्त पुंल्लिङ्ग   (शत्रु-type) → a/anchor
];

// Per-class generators of the class-specific forms the generic अकारान्त matcher
// cannot recover correctly — the नदी / मति / शत्रु declensions. `base` is the
// stem minus its final vowel matra (सूची→सूच, पङ्क्ति→पङ्क्त, सेतु→सेत), left
// consonant-final. Each entry is [ surfaceForm, vacana, vibhaktiKey ].
//
// Coverage: the nominative dual/plural (which the generic matcher can't build),
// plus the full oblique paradigm — instrumental, dative, ablative, genitive,
// locative — across एक/द्वि/बहु. The प्रथमा एकवचन (सूचीः, पङ्क्तिः, सेतुः) and the
// द्वितीया एकवचन (सूचीम्, पङ्क्तिम्, सेतुम्) are deliberately LEFT to the generic
// matcher: the append-a-marker convention already yields the correct classical
// surface and stem for those two cells. Accusative plural is omitted — its ई/इ
// surface (सूचीः / नदीः) collides with the established प्रथमा एकवचन convention.
// Syncretic cells fold to the most construction-useful reading, matching the
// अकारान्त choices above (ins/dat/abl du → instrumental; gen/loc → genitive;
// dat/abl pl → dative; abl/gen sg → genitive).
const NOMINAL_DECLENSION = {
  // ईकारान्त स्त्रीलिङ्ग (नदी-type): सूची, base सूच.
  'ii-f': base => [
    [base + '्यः',    VACANA.BAHU, 'prathama'],  // सूच्यः    nom pl   (नद्यः)
    [base + '्यौ',    VACANA.DVI,  'prathama'],  // सूच्यौ    nom du   (नद्यौ)
    [base + '्या',    VACANA.EKA,  'trtiya'],    // सूच्या    ins sg   (नद्या)
    [base + '्यै',    VACANA.EKA,  'caturthi'],  // सूच्यै    dat sg   (नद्यै)
    [base + '्याः',   VACANA.EKA,  'shashthi'],  // सूच्याः   abl/gen sg → gen (नद्याः)
    [base + '्याम्',  VACANA.EKA,  'saptami'],   // सूच्याम्  loc sg   (नद्याम्)
    [base + 'ीभ्याम्', VACANA.DVI, 'trtiya'],    // सूचीभ्याम् ins/dat/abl du → ins
    [base + '्योः',   VACANA.DVI,  'shashthi'],  // सूच्योः   gen/loc du → gen (नद्योः)
    [base + 'ीभिः',   VACANA.BAHU, 'trtiya'],    // सूचीभिः   ins pl   (नदीभिः)
    [base + 'ीभ्यः',  VACANA.BAHU, 'caturthi'],  // सूचीभ्यः  dat/abl pl → dat (नदीभ्यः)
    [base + 'ीनाम्',  VACANA.BAHU, 'shashthi'],  // सूचीनाम्  gen pl   (नदीनाम्)
    [base + 'ीषु',    VACANA.BAHU, 'saptami'],   // सूचीषु    loc pl   (नदीषु)
  ],
  // इकारान्त स्त्रीलिङ्ग (मति-type): पङ्क्ति, base पङ्क्त.
  'i-f': base => [
    [base + 'यः',     VACANA.BAHU, 'prathama'],  // पङ्क्तयः  nom pl   (मतयः)
    [base + 'ी',      VACANA.DVI,  'prathama'],  // पङ्क्ती   nom du   (मती)
    [base + '्या',    VACANA.EKA,  'trtiya'],    // पङ्क्त्या ins sg   (मत्या)
    [base + 'ये',     VACANA.EKA,  'caturthi'],  // पङ्क्तये  dat sg   (मतये)
    [base + 'ेः',     VACANA.EKA,  'shashthi'],  // पङ्क्तेः  abl/gen sg → gen (मतेः)
    [base + 'ौ',      VACANA.EKA,  'saptami'],   // पङ्क्तौ   loc sg   (मतौ)
    [base + 'िभ्याम्',VACANA.DVI,  'trtiya'],    // पङ्क्तिभ्याम् ins/dat/abl du → ins
    [base + '्योः',   VACANA.DVI,  'shashthi'],  // पङ्क्त्योः gen/loc du → gen (मत्योः)
    [base + 'िभिः',   VACANA.BAHU, 'trtiya'],    // पङ्क्तिभिः ins pl   (मतिभिः)
    [base + 'िभ्यः',  VACANA.BAHU, 'caturthi'],  // पङ्क्तिभ्यः dat/abl pl → dat (मतिभ्यः)
    [base + 'ीनाम्',  VACANA.BAHU, 'shashthi'],  // पङ्क्तीनाम् gen pl   (मतीनाम्)
    [base + 'िषु',    VACANA.BAHU, 'saptami'],   // पङ्क्तिषु  loc pl   (मतिषु)
  ],
  // उकारान्त पुंल्लिङ्ग (शत्रु/भानु-type): सेतु, base सेत.
  'u-m': base => [
    [base + 'वः',     VACANA.BAHU, 'prathama'],  // सेतवः    nom pl   (गुण उ→अव, शत्रवः)
    [base + 'ू',      VACANA.DVI,  'prathama'],  // सेतू     nom du   (शत्रू)
    [base + 'ुना',    VACANA.EKA,  'trtiya'],    // सेतुना   ins sg   (भानुना)
    [base + 'वे',     VACANA.EKA,  'caturthi'],  // सेतवे    dat sg   (शत्रवे)
    [base + 'ोः',     VACANA.EKA,  'shashthi'],  // सेतोः    abl/gen sg → gen (शत्रोः)
    [base + 'ौ',      VACANA.EKA,  'saptami'],   // सेतौ     loc sg   (शत्रौ)
    [base + 'ुभ्याम्',VACANA.DVI,  'trtiya'],    // सेतुभ्याम् ins/dat/abl du → ins
    [base + '्वोः',   VACANA.DVI,  'shashthi'],  // सेत्वोः  gen/loc du → gen (शत्र्वोः)
    [base + 'ुभिः',   VACANA.BAHU, 'trtiya'],    // सेतुभिः  ins pl   (शत्रुभिः)
    [base + 'ुभ्यः',  VACANA.BAHU, 'caturthi'],  // सेतुभ्यः dat/abl pl → dat (शत्रुभ्यः)
    [base + 'ूनाम्',  VACANA.BAHU, 'shashthi'],  // सेतूनाम् gen pl   (शत्रूणाम्→सेतूनाम्)
    [base + 'ुषु',    VACANA.BAHU, 'saptami'],   // सेतुषु   loc pl   (शत्रुषु)
  ],
};

// surfaceForm → analysis, indexed for each vowel-final construction stem and
// checked before the generic matcher. वचन and विभक्ति both vary now (the older
// build hard-coded प्रथमा; the paradigm rows carry their own vibhaktiKey).
const VOWEL_FORMS = new Map();
for (const [stem, cls] of VOWEL_STEMS) {
  const base = stem.slice(0, -1);            // drop final vowel matra
  for (const [form, number, vibhaktiKey] of NOMINAL_DECLENSION[cls](base)) {
    const v = VIBHAKTI[vibhaktiKey];
    VOWEL_FORMS.set(form, {
      stem,
      case: v.en,
      karaka: v.karaka,
      number,
      ending: form.slice(base.length),       // the class-specific tail
      cls,
      vibhakti: vibhaktiKey,
    });
  }
}

// Detect: returns { stem, case, karaka, number, ending, cls, vibhakti } or
// null if no case ending is found. `case` stays the English case name for
// backward compatibility; `karaka` is what codegen/parser consume.
export function analyze(word) {
  // Exact vowel-final forms (सूच्यः, पङ्क्तयः …) win before the generic
  // suffix matcher, which would otherwise mis-slice them.
  const vowelHit = VOWEL_FORMS.get(word);
  if (vowelHit) return { ...vowelHit };

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
