// style.js — रूप: the Sanskrit→CSS vocabulary.
//
// Translates Sanskrit style-property names → CSS properties (camelCase, for
// the JS `style` object) and Sanskrit value words → CSS values. Built up
// step by step; this is the isolated styling surface (cf. karaka-web.js).

// --- property names: Sanskrit → CSS (camelCase) ---
export const STYLE_PROPS = {
  // color & background
  'वर्णः':        'color',           // varṇa — "color"
  'पृष्ठभूमिः':   'backgroundColor', // pṛṣṭhabhūmi — "background"
  'अपारदर्शिता':  'opacity',         // apāradarśitā — "opacity"

  // typography
  'अक्षरमानम्':   'fontSize',        // akṣaramāna — "letter-size"
  'अक्षरभारः':    'fontWeight',      // akṣarabhāra — "letter-weight"
  'पङ्क्तिमानम्': 'lineHeight',      // paṅktimāna — "line-height"
  'संरेखणम्':     'textAlign',       // saṃrekhaṇa — "alignment"
  'अक्षरकुलम्':   'fontFamily',      // akṣarakula — "font-family"
  'अलङ्कारः':     'textDecoration',  // alaṅkāra — "decoration"

  // box model
  'चौडाई':        'width',           // — width
  'अधिकतमचौडाई':   'maxWidth',        // adhikatama-cauḍāī — "maximum width" → max-width
  'रेखोच्चता':     'lineHeight',      // rekhocchatā — "line height" → line-height
  'पाठसंरेखणम्':   'textAlign',       // pāṭha-saṃrekhaṇam — "text alignment" → text-align
  'उच्चता':       'height',          // uccatā — "height"
  'अन्तरालः':     'padding',         // antarāla — "inner gap" → padding
  'बाह्यान्तरः':  'margin',          // bāhyāntara — "outer gap" → margin
  'सीमा':         'border',          // sīmā — "border"
  'कोणवृत्तिः':   'borderRadius',    // koṇavṛtti — "corner-rounding"

  // layout
  'प्रदर्शनम्':    'display',         // pradarśana — "display"
  'स्थितिः':      'position',        // sthiti — "position"
  'शीर्षात्':      'top',             // śīrṣāt — "from the top" → top
  'अधस्तात्':      'bottom',          // adhastāt — "from below" → bottom
  'वामतः':        'left',            // vāmataḥ — "from the left" → left
  'दक्षिणतः':      'right',           // dakṣiṇataḥ — "from the right" → right
  'स्तरः':        'zIndex',          // stara — "layer" → z-index
  'दिक्':         'flexDirection',   // dik — "direction"
  'न्यायः':       'justifyContent',  // nyāya — "arrangement" → justify
  'मेलनम्':       'alignItems',      // melana — "alignment" → align-items
  'अन्तरम्':      'gap',             // antara — "gap"
};

// --- value words: Sanskrit → CSS value ---
export const STYLE_VALUES = {
  // colors (named)
  'रक्तः':    'crimson',     // rakta — "red"
  'नीलः':     'navy',        // nīla — "blue"
  'हरितः':    'green',       // harita — "green"
  'पीतः':     'gold',        // pīta — "yellow/gold"
  'श्वेतः':   'white',       // śveta — "white"
  'कृष्णः':   'black',       // kṛṣṇa — "black"
  'धूसरः':    'gray',        // dhūsara — "gray"
  'केसरः':    'saffron',     // kesara — "saffron" (→ #F4C430 via palette below)
  'अरुणः':    'tomato',      // aruṇa — "reddish"
  'श्यामः':   'slategray',   // śyāma — "dark"

  // display / layout keywords
  'प्रवाहः':   'flex',        // pravāha — "flow" → flex
  'खण्डः':     'block',       // khaṇḍa — "block"
  'रेखा':      'inline',      // rekhā — "line" → inline
  'अदृश्यम्':  'none',        // adṛśya — "invisible" → none
  'केन्द्रम्':  'center',      // kendra — "center"
  'आदिः':     'flex-start',   // ādi — "beginning"
  'अन्तः':     'flex-end',    // anta — "end"
  'मध्ये':     'space-between',// madhye — "in between"
  'पङ्क्तिः':  'row',         // paṅkti — "row"
  'स्तम्भः':   'column',      // stambha — "column"

  // font weights / alignment
  'गुरुः':     'bold',        // guru — "heavy" → bold
  'लघुः':      'normal',      // laghu — "light" → normal
  'वामम्':     'left',        // vāma — "left"
  'दक्षिणम्':   'right',       // dakṣiṇa — "right"
  'रेखाङ्कनम्': 'underline',   // rekhāṅkana — "underline"
};

// A few named colors that aren't standard CSS keywords get hex values.
const COLOR_HEX = {
  saffron: '#F4C430',
};

// Translate one property name. Unknown names pass through unchanged
// (so raw CSS like 'cursor' still works).
export function styleProp(name) {
  return STYLE_PROPS[name] || name;
}

// Translate one value WORD. Unknown words pass through unchanged.
export function styleValue(word) {
  const v = STYLE_VALUES[word];
  if (v === undefined) return word;
  return COLOR_HEX[v] || v;
}

// Is this bare word a known Sanskrit style value? (If not, codegen treats
// it as a variable reference rather than a CSS literal.)
export function isStyleWord(word) {
  return Object.prototype.hasOwnProperty.call(STYLE_VALUES, word);
}
