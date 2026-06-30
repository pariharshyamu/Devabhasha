// stdlib.js — the Sanskrit standard library surface.
//
// Maps Sanskrit method/property names to JavaScript operations on
// strings, arrays, and objects. These are the primitives a self-hosting
// compiler needs: index, slice, length, concat, push, field access.
//
// codegen consults these tables when emitting Member / Call nodes so that
// `पद.दीर्घता` → `pada.length`, `सूची.योजय(x)` → `arr.push(x)`, etc.

// Property accessors (no call): noun → JS property
export const PROPERTIES = {
  'दीर्घता':  'length',     // dīrghatā — "length"
  'मानानि':  'values',     // (used as a marker; handled specially if needed)
};

// Methods (called): Sanskrit name → JS method name.
// Works uniformly on strings and arrays where JS allows.
export const METHODS = {
  // --- string & array shared ---
  'खण्ड':     'slice',       // khaṇḍa — "segment" → slice(start, end)
  'अनुक्रमणिका':'indexOf',    // anukramaṇikā — "index" → indexOf(x)
  'अस्ति':    'includes',    // asti — "exists" → includes(x)
  'संयोजय':   'concat',      // saṃyojaya — "join together" → concat

  // --- string specific ---
  'अक्षरः':   'charAt',      // akṣaraḥ — "letter" → charAt(i)
  'सङ्केतः':  'charCodeAt',  // saṅketaḥ — "code" → charCodeAt(i)
  'विभज':     'split',       // vibhaja — "divide" → split(sep)
  'उच्च':     'toUpperCase', // ucca — "high" → toUpperCase
  'नीच':      'toLowerCase', // nīca — "low" → toLowerCase
  'छिन्द्धि':  'trim',        // chinddhi — "cut" → trim
  'आरभते':    'startsWith',  // ārabhate — "begins" → startsWith
  'समाप्यते':  'endsWith',    // samāpyate — "ends" → endsWith

  // --- array specific ---
  'योजय':     'push',        // yojaya — "join/attach" → push(x)
  'अपनय':     'pop',         // apanaya — "remove" → pop
  'प्रतिचित्रय':'map',         // praticitraya — "map across" → map(fn)
  'गालय':     'filter',      // gālaya — "filter" → filter(fn)
  'प्रत्येकस्मिन्':'forEach',  // pratyekasmin — "in each" → forEach(fn)
  'सम्मील':   'join',        // sammīla — "unite" → join(sep)  (array→string)
  'विपर्यय':   'reverse',     // viparyaya — "reverse" → reverse

  // --- promise (आश्वासन) methods for async chaining ---
  'ततः':      'then',         // tataḥ — "thereupon" → .then(fn)
  'दोषे':      'catch',        // doṣe — "on error" → .catch(fn)
  'अन्ततः':    'finally',      // antataḥ — "finally" → .finally(fn)

  // --- I/O methods (on सञ्चिका / जाल namespaces) ---
  'पठ':       'read',         // paṭha — "read" → file.read(path)
  'लिख':      'write',        // likha — "write" → file.write(path, data)
  'विद्यते':   'exists',       // vidyate — "exists" → file.exists(path)
  'निष्कासय':  'remove',       // niṣkāsaya — "remove" → file.remove(path)
  'सूचीकृ':    'list',         // sūcīkṛ — "enumerate" → file.list(dir)
  'आनय':      'fetch',        // ānaya — "bring/fetch" → net.fetch(url)
  'पठप्रदत्त':  'readJson',     // paṭha-pradatta — read + parse JSON → Result
  'लिखप्रदत्त': 'writeJson',    // likha-pradatta — serialize + write JSON
  'आनयप्रदत्त': 'fetchJson',    // ānaya-pradatta — fetch + parse JSON → Result

  // --- Object statics (on the सङ्ग्रह namespace) ---
  'कुञ्जयः':    'keys',         // kuñjayaḥ — "keys" → Object.keys(o)
  'मूल्यानि':   'values',       // mūlyāni — "values" → Object.values(o)
  'प्रविष्टयः': 'entries',      // praviṣṭayaḥ — "entries" → Object.entries(o)
  'समायोजय':   'assign',       // samāyojaya — "merge" → Object.assign(t, s)

  // --- गणित (Math) methods: used as गणित.<name>(...) ---
  // Mapped here so गणित.वर्गमूलम्(x) → Math.sqrt(x). These names are
  // distinctive enough not to collide with user object methods.
  'वर्गमूलम्':  'sqrt',       // vargamūlam — "square root"
  'घनमूलम्':   'cbrt',        // ghanamūlam — "cube root"
  'घातः':      'pow',         // ghātaḥ — "power" → pow(base, exp)
  'निरपेक्षम्': 'abs',        // nirapekṣam — "absolute"
  'अधःपातः':   'floor',       // adhaḥpātaḥ — "falling down" → floor
  'ऊर्ध्वपातः': 'ceil',       // ūrdhvapātaḥ — "rising up" → ceil
  'सन्निकर्षः': 'round',       // sannikarṣaḥ — "approximation" → round
  'छेदनम्':    'trunc',        // chedanam — "cutting" → trunc
  'धनर्णचिह्नम्':'sign',        // dhanarṇacihnam — "sign of a number" → Math.sign
  'ज्या':      'sin',          // jyā — classical Sanskrit term for sine!
  'कोटिज्या':  'cos',          // koṭijyā — classical term for cosine!
  'स्पर्शज्या': 'tan',         // sparśajyā — "tangent"
  'विलोमज्या': 'asin',         // vilomajyā — "inverse sine"
  'विलोमकोटि': 'acos',         // → acos
  'विलोमस्पर्श':'atan',         // → atan
  'द्विकोणार्क':'atan2',        // → atan2(y, x)
  'घातीयम्':   'exp',          // ghātīyam — "exponential" → exp
  'लघुगणकः':   'log',          // laghugaṇakaḥ — "logarithm" → log (natural)
  'दशलघुगणकः': 'log10',        // → log10
  'द्विलघुगणकः':'log2',        // → log2
  'अधिकतमः':   'max',          // adhikatamaḥ — "greatest" → max(a, b, …)
  'न्यूनतमः':   'min',          // nyūnatamaḥ — "least" → min(a, b, …)
  'यादृच्छिकम्':'random',       // yādṛcchikam — "random" → random()
  'हिज्या':     'sinh',         // hijyā — hyperbolic sine
  'कोटिहिज्या': 'cosh',         // → cosh
  'स्पर्शहिज्या':'tanh',         // → tanh
  'विलोमहिज्या':'asinh',        // → asinh
  'घातमूलम्':   'hypot',        // ghātamūlam — "power-root" → hypot(a,b)
};

// गणित (Math) constants: accessed as गणित.पाई → Math.PI
export const MATH_CONSTANTS = {
  'पाई':       'PI',          // pāī → Math.PI
  'यूलरांकः':   'E',           // yūlarāṅkaḥ — "Euler's number" → Math.E
  'मूलद्वि':    'SQRT2',       // mūladvi — "root two" → Math.SQRT2
  'लॉग२इ':     'LOG2E',       // → Math.LOG2E
  'लॉग१०इ':    'LOG10E',      // → Math.LOG10E
};

// Global / constructor-ish helpers. Sanskrit name → emitted JS. Looked up
// when an Identifier is emitted, so संकेताक्षर(९२) → String.fromCharCode(92).
// NOTE: only names unlikely to be used as ordinary variables belong here —
// common words like वस्तु ("thing") must NOT be globalized or they'd shadow
// user variables.
export const GLOBALS = {
  'संकेताक्षर':  'String.fromCharCode', // saṅketākṣara — "code-letter"
  'गणित':       'Math',                // gaṇita — "mathematics" → Math
  'साधितम्':     '__RT.ok',             // sādhitam — "achieved" → Ok(value)
  'विफलम्':      '__RT.err',            // viphalam — "failed" → Err(error)
  'सञ्चिका':     '__IO.file',           // sañcikā — "file" → file I/O namespace
  'जाल':        '__IO.net',            // jāla — "net/web" → network namespace
  'सेवक':       '__SRV.serve',         // sevaka — "server" → start an HTTP server
  'सङ्ग्रह':     'Object',              // saṅgraha — "collection" → Object (keys/values/entries)
  'कालचक्र':     '__DB.interval',       // kālacakra — "wheel of time" → repeating timer
  'कालनाशः':     '__DB.clearTimer',     // kālanāśa — "end of time" → stop a timer
  'कुञ्जिश्रोता': '__DB.onKey',          // kuñjiśrotā — "key-listener" → keyboard handler
  'स्वरूपम्':     '__RT.typeOf',         // svarūpam — "intrinsic form/type" → typeof (Sanskrit-named)
  'सूचीवत्':      'Array.isArray',       // sūcīvat — "list-like" → Array.isArray
  'प्रदत्त':      '__RT.json',           // pradatta — "data" → JSON parse/serialize (Result-returning)
  'अङ्कय':       '__RT.toNumber',       // aṅkaya — "to number" → parse string→number (Result)
  'प्रभाव':       '__DB.effect',         // prabhāva — "influence/effect" → fine-grained reactive effect
  'बन्ध':        '__DB.bindText',       // bandha — "binding" → a text node bound to a reactive thunk
  'आवली':        '__DB.keyedList',      // āvalī — "row/series" → keyed list reconciliation
  'सफाई':        '__DB.onCleanup',      // saphāī — "cleanup" → teardown hook inside an effect
  'आलस्यचित्रम्': '__DB.lazyImage',      // ālasya-citra — "lazy image" → load on scroll-into-view
};

// Object-construction keyword handled in parser: कोष (kośa, "treasury/dictionary")
// produces an object literal:  कोष { कुञ्जी: मूल्यम्, ... }
