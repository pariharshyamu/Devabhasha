// karaka-web.js — maps kāraka roles to web/DOM construction semantics,
// and defines which stems name which DOM concepts.
//
// The signature verb रचय (racaya, "construct") takes a BAG of case-marked
// arguments in ANY ORDER and assembles a DOM element. Each kāraka fills a
// distinct slot, so order is irrelevant — exactly the Pāṇinian promise.

import { KARAKA } from './vibhakti.js';

// kāraka → which slot of a DOM construction it fills.
export const KARAKA_TO_SLOT = {
  [KARAKA.KARTR]:      'tag',     // कर्तृ  (nom)  — what the element IS (div, button…)
  [KARAKA.KARMAN]:     'content', // कर्म   (acc)  — content placed into it
  [KARAKA.KARANA]:     'handler', // करण   (instr)— the handler function (instrument)
  [KARAKA.SAMPRADANA]: 'event',   // सम्प्रदान (dat) — event it responds to
  [KARAKA.ADHIKARANA]: 'parent',  // अधिकरण (loc) — where it mounts (locus)
  [KARAKA.APADANA]:    'source',  // अपादान (abl) — data source it derives from
  [KARAKA.SAMBANDHA]:  'prop',    // सम्बन्ध (gen) — attribute/property relation
};

// Stem vocabulary: nominative-case stems that name HTML tags.
// The user writes these inflected (पटः, मूलकम्…); the engine reads the
// ending for the role and this table for the tag name.
export const TAG_STEMS = {
  'पट':    'button',   // paṭa — "cloth/panel" → button
  'मूल':   'div',      // mūla — "root/base"   → div (generic container)
  'शीर्ष': 'h1',       // śīrṣa — "head"       → heading
  'वाक्य': 'p',        // vākya — "sentence"   → paragraph
  'सूची':  'ul',       // sūcī — "list"        → list
  'पङ्क्ति':'li',      // paṅkti — "row/line"  → list item
  'पीठ':   'input',    // pīṭha — "seat/field" → input
  'चित्र': 'img',      // citra — "picture"    → image
  'सेतु':  'a',        // setu — "bridge/link" → anchor
  'क्षेत्र':'span',     // kṣetra — "field/area"→ span
};

// Event stems (used in सम्प्रदान / dative position).
export const EVENT_STEMS = {
  'स्पर्श': 'click',     // sparśa — "touch"   → click
  'परिवर्तन':'change',   // parivartana        → change
  'निवेश': 'input',      // niveśa — "entry"   → input
  'प्रेषण': 'submit',    // preṣaṇa — "sending"→ submit
};

// Construction / action verbs.
export const KARAKA_VERBS = {
  'रचय':  'CONSTRUCT',  // racaya — "construct" → build DOM element from kārakas
  'योजय': 'ATTACH',     // yojaya — "join"      → mount (also legacy keyword)
};
