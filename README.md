# देवभाषा · Devabhāṣā

A small **Sanskrit programming language that transpiles to JavaScript**, with a
web/DOM layer and a zero-build browser playground. Source is written in
Devanagari; output is readable JavaScript.

```
कार्य अभिवादनम् (नाम) {       function abhivaadanam(naama) {
    फलम् "नमस्ते, " + नाम।    →     return ("namaste, " + naama);
}                             }
```

## Quick start

```bash
node src/cli.js run   examples/namaste.deva     # compile + execute (Node)
node src/cli.js build examples/ganaka.deva       # → examples/ganaka.js
node build-playground.js                         # → playground/index.html
node test/test.js                                # run the test suite
```

Open `playground/index.html` in any browser — no server needed.

## Language reference

| Sanskrit | Meaning | Compiles to |
|----------|---------|-------------|
| `चर` / `नियत` | varies / fixed | `let` / `const` |
| `कार्य` | work to be done | `function` (statement **or** expression) |
| `फलम्` | fruit / result | `return` |
| `यदि` / `अन्यथा` | if / otherwise | `if` / `else` |
| `यावत्` | as long as | `while` |
| `प्रत्येकम् (x : समूह)` | for each | `for (const x of …)` |
| `विकल्प` / `स्थिति` | alternative / case | `switch` / `case` (no fall-through) |
| `भङ्ग` / `अनुवृत्तम्` | break / continue | `break` / `continue` |
| `सत्यम्` / `असत्यम्` / `शून्यम्` | true / false / void | `true` / `false` / `null` |
| `दर्शय(…)` | cause to show | `console.log(…)` |
| `अङ्गम्(tag, …)` | limb / part | `document.createElement` + children |
| `योजय(node[, target])` | join / attach | append to DOM |
| `श्रोता(node, ev, fn)` | listener | `addEventListener` |

- Statements end with the **danda** `।` or `;` (both optional before `}`/EOF).
- Comments begin with `#`.
- Numbers may use Devanagari digits (`०१२…`) or ASCII.
- Identifiers may be Devanagari; they're transliterated to stable ASCII in the
  output (`गणना` → `gannanaa`), so the JS is portable and debuggable.

## कारक — Pāṇinian case-role construction

The signature feature. Sanskrit marks a word's grammatical role with its
**vibhakti (case ending)**, not its position. Devabhāṣā uses this for
**order-free DOM construction** via the verb `रचय` (racaya, "construct").

```
रचय  पटः  वाक्यम् "वर्धय"  स्पर्शाय  करणेन वर्धक।
     │     │              │          │
     │     │              │          └ करण/instrumental → handler
     │     │              └ सम्प्रदान/dative → event ("click")
     │     └ कर्म/accusative → content
     └ कर्तृ/nominative → tag (<button>)
```

Each argument's **role comes from its ending**, so the arguments may be
written in **any order** and compile to identical JavaScript:

```
__DB.construct({ tag: "button", content: "वर्धय", event: "click", handler: वर्धक })
```

The seven recognized cases and their kāraka roles:

| Case (vibhakti) | Kāraka | DOM slot |
|-----------------|--------|----------|
| प्रथमा nominative `-ः` | कर्तृ agent | element tag |
| द्वितीया accusative `-म्` | कर्म patient | content |
| तृतीया instrumental `-ेन` | करण instrument | handler |
| चतुर्थी dative `-ाय` | सम्प्रदान recipient | event |
| पञ्चमी ablative `-ात्` | अपादान source | data source |
| षष्ठी genitive `-स्य` | सम्बन्ध relation | attribute |
| सप्तमी locative `-े` | अधिकरण locus | mount parent |

### वचन — number (singular · dual · plural)

The case engine (`src/vibhakti.js`) parses all three **वचन (numbers)** across
the seven विभक्ति, not just the singular. The role (kāraka) is number-invariant
— `पटः`, `पटौ`, `पटाः` are all कर्तृ (the element tag) — but the parse records
which वचन you wrote:

| वचन | nominative | accusative | instrumental | genitive |
|-----|-----------|-----------|--------------|----------|
| एकवचन singular | `पटः` | `पटम्` | `पटेन` | `पटस्य` |
| द्विवचन dual | `पटौ` | `पटौ` | `पटाभ्याम्` | `पटयोः` |
| बहुवचन plural | `पटाः` | `पटान्` | `पटैः` | `पटानाम्` |

`analyze(word)` returns `{ stem, case, karaka, number, vibhakti, cls }`, and
`describe(word)` gives a full gloss — e.g. `describe('पटैः')` →
*"तृतीया बहुवचन — instrumental plural (करण-कारक)"*. The editor surfaces this
on hover for any inflected form of the construction vocabulary (`पटैः` hovers
as *instrumental plural, `<button>` element*).

#### बहुवचन / द्विवचन → element groups

Number is not just recorded — a **plural कर्तृ (nominative tag) builds a group**.
The tag *distributes* over the समास children: one element per child, each child
as that element's content, all sharing the remaining kāraka slots (style,
handler, event, attributes). Singular builds one element; plural builds many:

```
रचय पटः वाक्यम् "क्लिक्"।        # singular → one <button>क्लिक्</button>

रचय पटाः रूप { वर्णः: नीलः } {    # plural → a GROUP of <button>s,
    "एक"                          #   each blue, one per child:
    "द्वि"                        #   <button style=…>एक</button>
    "त्रि"                        #   <button style=…>द्वि</button>
}                                 #   <button style=…>त्रि</button>
```

A group is an array of nodes that flattens into any parent, so it composes
exactly like a single element — a plural inside a container just yields
siblings:

```
रचय मूलः { रचय वाक्याः { "x" "y" } }   →   <div><p>x</p><p>y</p></div>
```

It compiles to `__DB.constructGroup({ tag, children, … })`. **अकारान्त
(consonant-final)** tags take the generic plural marker directly — `पटाः`,
`मूलाः`, `वाक्याः`, `शीर्षाः` (button/div/p/h1). **Vowel-final** tags decline
by their true class instead, so the classic list works with real Sanskrit
plurals:

```
रचय सूचीः { रचय पङ्क्तयः { "क" "ख" "ग" } }   →   <ul><li>क</li><li>ख</li><li>ग</li></ul>
```

Here `पङ्क्ति` (इकारान्त, li) pluralizes to `पङ्क्तयः`, `सूची` (ईकारान्त, ul)
to `सूच्यः`, `सेतु` (उकारान्त, a) to `सेतवः`. For *data-driven* lists (items
from state) use the reactive `सूची-दत्तांश` / `.प्रतिचित्रय` map rendering;
plural groups are the concise form for *static* homogeneous element groups.

A **द्विवचन कर्तृ is a PAIR** — the same group builder, but the grammar means
*exactly two*. It distributes over its two समास children like a plural:

```
रचय पटौ { "हाँ" "नहीं" }   →   <button>हाँ</button><button>नहीं</button>
```

Because the dual asserts two-ness, the semantic pass emits a **वचनभेदः**
warning if the pair doesn't hold exactly two children (`रचय पटौ { "a" "b" "c" }`
→ *expected two समास children, got 3*). Plural (`पटाः`) is a group of any size
and is never count-checked; only the singular (`पटः`) builds a lone element.

**Scope (honest):** beyond the generic अकारान्त-style role markers (which the
append-a-marker convention lets serve *every* stem for the common cases), the
engine also recognises the genuinely class-specific **आकारान्त feminine**
obliques (`मालायै`, `मालायाम्`, `मालया` …) and the **णत्व** retroflex
instrumental (`रामेण` alongside `पटेन`), so hand-written classical Sanskrit is
understood too. Syncretic endings (Sanskrit reuses one form for several cells)
resolve to the most construction-useful reading — documented on each row in
`vibhakti.js`.

**Vowel-final stems** (इकारान्त / ईकारान्त / उकारान्त) can't be declined from
the bare surface — `सूच्यः` and `वाक्यः` share an ending but belong to
different classes — because declension class is *lexical*, a property of the
प्रातिपदिक. So each vowel-final construction stem is tagged with its class
(`VOWEL_STEMS` in `vibhakti.js`) and its **full class-specific paradigm** — the
नदी (`सूची`), मति (`पङ्क्ति`), and शत्रु (`सेतु`) declensions — is *generated*
from that class and indexed for exact-match lookup, ahead of the generic
matcher. That covers not just the nominative dual/plural but the whole oblique
range across all three वचन, so classical forms parse with the right stem *and*
kāraka:

| | instrumental sg | dative sg | genitive sg | locative pl |
|---|---|---|---|---|
| `सूची` (नदी) | `सूच्या` | `सूच्यै` | `सूच्याः` | `सूचीषु` |
| `पङ्क्ति` (मति) | `पङ्क्त्या` | `पङ्क्तये` | `पङ्क्तेः` | `पङ्क्तिषु` |
| `सेतु` (शत्रु) | `सेतुना` | `सेतवे` | `सेतोः` | `सेतुषु` |

The प्रथमा/द्वितीया singular (`सूचीः`, `सूचीम्`) stay with the generic matcher —
the append-a-marker convention already yields the right surface there. Adding
another vowel-final tag is one row; other stems still flow through the generic
paradigm. ASCII words and uninflected stems are correctly *not* treated as
case-marked, which is what keeps free word order parseable.

Tag and event vocabulary lives in `src/karaka-web.js` (`पट`→button,
`शीर्ष`→h1, `स्पर्श`→click, …).

## समास — compound composition (nested DOM trees)

Where kāraka handles *one* element's roles, **समास (samāsa, "compound")**
handles how elements **nest** — the structural counterpart. A block form

```
रचय <tag-nominative> { ...children... }
```

is a **तत्पुरुष** (container) whose body is a **द्वन्द्व** (sibling list).
It composes recursively, so DOM trees of any depth are just nested `रचय`
blocks. Container tags use the nominative (`मूलः`=div, `सूचीः`=ul); content
uses the accusative marker `वाक्यम्`:

```
चर पृष्ठम् = रचय मूलः {
    रचय शीर्षः वाक्यम् "देवभाषा"।
    रचय वाक्यः वाक्यम् "संस्कृतेन रचितम्।"।
    रचय सूचीः {
        रचय पङ्क्तिः वाक्यम् "प्रथमम्"।
        रचय पङ्क्तिः वाक्यम् "द्वितीयम्"।
    }
}।
योजय(पृष्ठम्)।
```

compiles to nested `__DB.construct({ tag, children: [...] })` and renders:

```html
<div><h1>देवभाषा</h1><p>संस्कृतेन रचितम्।</p>
  <ul><li>प्रथमम्</li><li>द्वितीयम्</li></ul></div>
```

kāraka and समās compose: a child element can carry its own case-marked
slots (an event handler, attributes) while sitting in the tree. Children
attach by DOM `append`, which *moves* nodes, so the model stays correct
whether or not a child was auto-mounted.

## रूप — CSS-in-Sanskrit styling

`रूप` (rūpa, "form/appearance") attaches styles to an element, with **both
property names and value words in Sanskrit**:

```
रचय पटः वाक्यम् "स्पृश" रूप {
    वर्णः: श्वेतः,            # color: white
    पृष्ठभूमिः: रक्तः,        # backgroundColor: crimson
    अन्तरालः: "10px 20px",   # padding (quoted CSS passes through)
    कोणवृत्तिः: "6px",        # borderRadius
    सीमा: अदृश्यम्            # border: none
}।
```

The vocabulary (`src/style.js`) covers color (`वर्णः`), background
(`पृष्ठभूमिः`), typography (`अक्षरमानम्`/font-size, `अक्षरभारः`/font-weight,
`संरेखणम्`/text-align), the box model (`अन्तरालः`/padding,
`बाह्यान्तरः`/margin, `कोणवृत्तिः`/border-radius), and fl/layout
(`प्रदर्शनम्`/display, `दिक्`/flex-direction, `न्यायः`/justify). Value words
include colors (`रक्तः`→crimson, `नीलः`→navy, `केसरः`→#F4C430) and keywords
(`केन्द्रम्`→center, `प्रवाहः`→flex, `गुरुः`→bold).

Resolution rules: a **known Sanskrit value word** becomes a CSS literal; a
**bare variable** stays a reference (`वर्णः: मुख्यवर्णः` reads the variable);
a **quoted string** (`"18px"`) and an **unknown CSS property** (`cursor`)
pass through unchanged; an **expression** (`अक्षरमानम्: n + "px"`) is
emitted as-is. रूप composes with समās — whole styled trees are nested `रचय`
blocks each carrying their own `रूप`.

## सूची-दत्तांशः — data rendering & named styles

**List rendering.** A समās child can be any expression that yields DOM
nodes, and array children are flattened — so mapping a data array with
`.प्रतिचित्रय` (map) renders a list:

```
ग्रन्थाः.प्रतिचित्रय(कार्य(ग) {
    फलम् रचय पङ्क्तिः वाक्यम् ग.नाम।   # one <li> per data item
})
```

placed inside a `रचय सूचीः { … }` produces a `<ul>` of `<li>`s, one per row.

**Named styles (रूपनाम).** Declare a reusable style once and apply it by
name, with optional per-element overrides:

```
रूपनाम कार्डः = रूप { पृष्ठभूमिः: श्वेतः, अन्तरालः: "12px", कोणवृत्तिः: "8px" }।

रचय मूलः रूप कार्डः { … }                     # apply the named style
रचय मूलः रूप कार्डः { पृष्ठभूमिः: नीलः } { … } # named base + override
```

`रूपनाम X = रूप {…}` compiles to `const X = {…CSS…}`; a reference compiles
to `Object.assign({}, X)`, and a base-plus-override to
`Object.assign({}, X, {…})` so overrides win. A subtle parser point: after a
named reference, `{` is disambiguated by lookahead — `{ word: … }` is a
style override, anything else is a समās children block.

Together these make real data-driven UIs (`examples/suchi.deva`): a styled
container whose children are a heading plus a mapped list of styled cards.

## भाव — reactive state

`भाव` (bhāva, "state/condition") declares a reactive state cell, and
`दृश्य` (dṛśya, "view") declares a region that **re-renders automatically**
when any state it reads changes. The model is subscribe-on-read /
re-run-on-write: a view subscribes to every `भाव` it reads while rendering,
and a later write re-runs just that view.

```
भाव गणकः = ०।                            # a reactive counter cell

दृश्य {                                    # a self-updating view
    रचय मूलः {
        रचय शीर्षः वाक्यम् "गणना: " + गणकः।   # reads गणकः → subscribes
        रचय पटः वाक्यम् "वर्धय"
            स्पर्शाय करणेन कार्य(){ गणकः++। }।   # writes गणकः → re-renders
    }
}
```

The syntax is transparent: a `भाव` name reads as its value and assigns
normally — under the hood `गणकः` compiles to `गणकः()` (read), `गणकः = v`
to `गणकः(v)` (write), and `गणकः++` / `गणकः += n` desugar through the cell.
`दृश्य { … }` mounts to the page root by default, or `दृश्य (container) { … }`
to a chosen element. A view's final expression is what gets rendered.

Because a view is just a समās tree, reactivity composes with everything:
styled, data-mapped, event-wired trees that rebuild on state change.
`examples/todo.deva` is a complete reactive todo app — `भाव` task list,
`.प्रतिचित्रय` rendering each task, buttons that add/remove and re-render.

### प्रभाव — fine-grained reactivity

`दृश्य` is *coarse*: when any cell it read changes, it re-runs and rebuilds
its whole subtree. That's simple and fine for small views, but it's not how
modern frontend frameworks (Solid, Svelte) achieve speed — they update only
the exact DOM bound to the changed value. Devabhāṣā now has that model too, as
a layer alongside `दृश्य`:

- `प्रभाव(कार्य(){ … })` (prabhāva, "influence/effect") runs the function once,
  **tracks exactly which `भाव` cells it reads**, and re-runs *only that
  function* when one of those cells changes — nothing else.
- `बन्ध(कार्य(){ … })` (bandha, "binding") returns a text node whose content
  is kept in sync by an effect; when its dependencies change, **only that one
  node's text updates** — no rebuild, no lost focus or scroll.

```
भाव गणकः = ०।
चर नोड = बन्ध(कार्य(){ फलम् पाठ"गणना: {गणकः}"। })।   # a live text node
गणकः = गणकः + १।   # ONLY नोड's text updates — the surrounding DOM is untouched
```

The engine is a real signal/effect system: a subscriber stack tracks the
current effect, each cell records its subscribers, and an effect cleans up its
old dependencies before every re-run — so conditional reads (`यदि (ध्वजः) {
… ब … }`) correctly drop a dependency when the branch stops taking it (the
classic stale-subscription bug, handled). `दृश्य` and `प्रभाव` coexist: the
coarse view is still there for simple cases, fine-grained for performance.

**Fine-grained is also automatic.** A `रचय` whose content is *dynamic* (reads
a `भाव` cell) and is used **outside** a `दृश्य` compiles straight to a bound
text node — no `बन्ध` call needed:

```
भाव गणकः = ०।
चर शीर्षम् = रचय शीर्षः वाक्यम् पाठ"गणना: {गणकः}"।   # dynamic content
गणकः = गणकः + १।   # ONLY this node's text updates, in place
```

The compiler detects the `भाव` read and emits a fine-grained binding; static
content (no `भाव` read) stays a plain value with zero overhead, and content
*inside* a `दृश्य` stays coarse so the two models never double-update. So you
get fine-grained performance by default, just by writing dynamic content.

### घटकाः — components & props

A **component** is just a `कार्य` that takes props and returns a `रचय` tree —
no new syntax, because functions and `रचय` already compose. You call it like
any function and reuse it freely:

```
कार्य पत्रम् (शीर्षकम्, मूल्यम्) {
    फलम् रचय मूलः { रचय शीर्षः वाक्यम् शीर्षकम्। रचय वाक्यः वाक्यम् मूल्यम्। }।
}
चर अ = पत्रम्("नाम", "रामः")।   # reuse with different props
चर ब = पत्रम्("वयः", "तिंशत्")।
```

The one thing that needs care is **reactive props** — a prop that should stay
*live* across the call boundary. Passing a `भाव` cell normally reads its value
at the call site (a dead snapshot). Instead, wrap it in `सूत्र(…)` (sūtra,
"thread"), which passes a *reactive reference* — the component renders it and
it updates fine-grained when the cell changes, while only *that* node updates:

```
भाव गणकः = ०।
चर कार्डः = आँकडापत्रम्("क्लिक्", सूत्र(गणकः), "navy")।   # live reactive prop
गणकः = गणकः + १।   # the card's value updates in place; siblings untouched
```

`सूत्र` is **explicit on purpose** — reactivity crossing a boundary is visible
at the call site rather than implicit, matching the language's preference for
predictable over clever. Static props (plain values) and callback props
(passing a `कार्य` for, e.g., a click handler) work as ordinary arguments.
`examples/घटकाः.deva` composes a reusable stat-card component (used three
times) with reactive, static, and callback props.

### आवली — keyed list rendering

Rendering a list with `.प्रतिचित्रय` inside a `दृश्य` rebuilds *every* row when
the data changes — losing each row's DOM state (focus, scroll, input values).
`आवली` (āvalī, "row/series") is **keyed reconciliation**: it identifies rows by
a stable key and, on each change, **reuses** the DOM nodes of surviving keys
(moving them if reordered), **builds** only genuinely new keys, and **removes**
vanished ones — the model Solid and Svelte use.

```
भाव वस्तूनि = [कोष{ कुं: १, … }, कोष{ कुं: २, … }, …]।
चर पटः = आवली(
    सूत्र(वस्तूनि),                    # the reactive data
    कार्य(व){ फलम् व.कुं। },           # key — a stable identity per item
    कार्य(व){ फलम् रचय वाक्यः वाक्यम् व.नाम।  }   # render one row
)।
```

Because nodes are reused by key, **a row's DOM state moves with it** across a
reorder — the defining benefit of keyed rendering. The reconciler runs inside
an effect, so it re-runs only when the data signal changes, and it touches the
DOM minimally (no rebuild of unchanged rows). `examples/आवली.deva` is a
shuffling colored list where each row keeps its identity through reordering.

### Reactive styles & cleanup

Fine-grained binding extends to **style properties**: a `रूप { }` value that
reads a `भाव` cell (outside a `दृश्य`) updates *just that one CSS property* in
place when the cell changes — no rebuild, the rest of the element untouched.

```
भाव वर्णः = "tomato"।
चर पटः = रचय मूलः रूप { पृष्ठभूमिः: वर्णः, अन्तरालः: "40px" }।   # bg is reactive
वर्णः = "steelblue"।   # ONLY background-color updates
```

Each dynamic property gets its own effect; static properties (and styles inside
a `दृश्य`) stay plain with zero overhead. The same applies to a `सक्रियः ?
रक्तः : धूसरः` ternary — the property re-evaluates fine-grained.

For teardown, `सफाई(कार्य(){ … })` (saphāī, "cleanup") registers a hook inside
a `प्रभाव` that runs **before the effect's next re-run** — the place to clear a
timer, remove a listener, or cancel a subscription so reactive code doesn't
leak:

```
प्रभाव(कार्य(){
    चर घटी = कालचक्र(कार्य(){ … }, १०००)।
    सफाई(कार्य(){ कालनाशः(घटी)। })।   # tear down the old timer before re-running
})।
```

Refs need no special form — `रचय` already returns the DOM node (`चर न = रचय
…`), so you hold the handle directly and can read or mutate it.

### आलस्यचित्रम् — lazy-loaded images

`आलस्यचित्रम्(src, opts)` (ālasya-citra, "lazy image") builds an `img` that
loads its real source only when it scrolls into view, via `IntersectionObserver`
— the standard technique for fast image-heavy pages. It shows `opts.placeholder`
(or nothing) until then, keeps the real URL in `data-src`, sets the native
`loading="lazy"` hint, and falls back to eager loading where the observer is
unavailable:

```
चर चित्रम् = आलस्यचित्रम्(लेख.चित्रम्, कोष{
    alt: लेख.शीर्षकम्,
    placeholder: "data:image/svg+xml,…"   # a tiny inline placeholder
})।
```

`examples/ब्लॉग.deva` is a complete **blog website**: a post list whose cards are
components with lazy-loaded cover images, reactive view-switching between the
list and a full-post view (a `प्रभाव` effect rebuilding the content area when
the selected post changes), and a back button — composing components, effects,
and lazy images into a real app.

`examples/vyaya.deva` goes further — a reactive **expense tracker** with a
live computed total, category filter buttons (whose active colour comes from
a `सक्रियः ? रक्तः : धूसरः` ternary, color words resolved in-expression),
`.गालय` filtering, and add-entry interaction: several `भाव` cells and derived
views composing into one app.

`examples/flappy.deva` (विहगः) is a real-time **Flappy-Bird-style game** — a
different stress test entirely: an animation loop, continuous state mutation,
collision detection, and keyboard input. It uses three general-purpose host
bindings added for interactive programs: `कालचक्र(fn, ms)` (kālacakra, "wheel
of time" → a repeating timer / game loop), `कालनाशः(id)` (stop a timer), and
`कुञ्जिश्रोता(fn)` (kuñjiśrotā, "key-listener" → a keyboard handler receiving
the pressed key). The whole game state lives in one `भाव` cell that the loop
mutates ~30×/sec; absolute positioning uses the `शीर्षात्`/`वामतः`/`अधस्तात्`/
`दक्षिणतः` (top/left/bottom/right) and `स्तरः` (z-index) style properties.

Building it surfaced a real fix to the reactive model: a `भाव` cell skipped
re-rendering when written the same *reference* — fine for immutable updates,
but a game mutates its state object in place, so the view never refreshed. The
guard now skips only unchanged **primitives**; object/array state always
re-renders, which is the behavior mutable game loops (and most reactive code)
expect.

## गणित — the math module

A comprehensive mathematics layer. Elementary and transcendental functions
come from a native bridge to JavaScript's `Math` (exact, full precision);
the statistics and number-theory layer (`examples/ganita.deva`) is written
*in Devabhāṣā* on top of them — the self-hosting payoff applied to a
standard library.

**Native bridge** — `गणित.<fn>(…)`:
`वर्गमूलम्` (sqrt), `घनमूलम्` (cbrt), `घातः` (pow), `निरपेक्षम्` (abs),
`अधःपातः`/`ऊर्ध्वपातः` (floor/ceil), `सन्निकर्षः` (round), `धनर्णचिह्नम्` (sign),
`ज्या`/`कोटिज्या`/`स्पर्शज्या` (sin/cos/tan), `विलोमज्या` etc. (asin…),
`घातीयम्` (exp), `लघुगणकः` (log), `अधिकतमः`/`न्यूनतमः` (max/min),
`यादृच्छिकम्` (random). Constants: `गणित.पाई` (π), `गणित.यूलरांकः` (e),
`गणित.मूलद्वि` (√2).

A nice piece of history: **ज्या (jyā) and कोटिज्या (koṭijyā) are the actual
classical Sanskrit names for sine and cosine** — the words that, via Arabic
*jiba → jayb*, became the Latin *sinus* and our "sine."

**Statistics & number theory** (written in Devabhāṣā, `examples/ganita.deva`):
`माध्यम्` (mean), `मध्यमा` (median), `बहुलकः` (mode), `शतमक` (percentile),
`प्रसरणम्`/`मानविचलनम्` (variance/stddev), `न्यूनतमम्`/`अधिकतमम्`/`परिसरः`
(min/max/range), `योगफलम्`/`गुणनफलम्` (sum/product), `क्रमणम्` (sort),
`महत्तमसमापवर्तकः`/`लघुत्तमसमापवर्त्यः` (gcd/lcm), `क्रमगुणितम्` (factorial),
`अभाज्यः` (is-prime), plus angle conversion (`अंशेभ्यःरेडियनम्`), `सीमन`
(clamp), `रैखिकान्तर्वेशनम्` (lerp), and `परिवृत्तिः` (round to N places).
Verified against Python's `statistics`/`numpy` to full precision.

**Transcendentals from first principles.** To show the language isn't merely
forwarding to `Math`, `घातीयश्रेणी` (exp) and `ज्याश्रेणी` (sin) are computed
in pure Devabhāṣā via their Taylor series — and agree with the native bridge
to ~15 digits.

```
चर दत्तांशः = [४, ८, १५, १६, २३, ४२]।
दर्शय("माध्यम्:", माध्यम्(दत्तांशः))।         # 18
दर्शय("मानविचलनम्:", मानविचलनम्(दत्तांशः))।   # 12.3153…
दर्शय("e via Taylor:", घातीयश्रेणी(१))।       # 2.71828… (no Math used)
दर्शय("ज्या(π/६):", गणित.ज्या(गणित.पाई / ६))। # 0.5
```

## अन्तर्न्यासः — string interpolation

`पाठ"…"` (pāṭha, "text") marks an interpolated string: any `{expr}` inside is
evaluated and spliced in, compiling to a JS template literal.

```
दर्शय(पाठ"{नाम} वर्षाणि {वयः}")।              # variables
रचय वाक्यः वाक्यम् पाठ"योगः: {योगम्(व्ययाः)} रूप्यकाणि"।   # any expression
दर्शय(पाठ"\{ब्रेस\} रक्षितम्")।                # \{ \} for literal braces
```

It is **opt-in via the पाठ marker** for a deliberate reason: making every
`"…"` interpolate would mis-read the literal braces in existing strings —
including the JS that the self-hosted compiler emits as string literals — so
plain `"…"` stays completely literal, and only `पाठ"…"` interpolates. The
marker must touch the quote, so `पाठ` remains usable as an ordinary
identifier. Interpolation holds full expressions (calls, member access,
arithmetic, even nested strings), and is the idiomatic way to build labels
and views — `examples/vyaya.deva` uses it throughout.

## मधुरचिह्नानि — operator sugar

Convenience operators that desugar to the core language:

- **compound assignment** — `x += y`, `-=`, `*=`, `/=`, `%=` (works on
  variables, object fields, and array elements); `x += y` becomes `x = x + y`
- **ternary** — `परीक्षा ? तदा : अन्यथा`, chainable for `else-if` ladders
- **null-coalescing** — `a ?? b` (yields `b` only when `a` is null/undefined)
- **increment / decrement** — `i++`, `i--`

```
चर कुल = ०।
प्रत्येकम् (x : [१, २, ३, ४]) {
    कुल += x > २ ? x : ०।      # add x only when x > 2
}
दर्शय(कुल)।                     # 7

चर नाम = दत्त ?? "अज्ञातः"।       # default when दत्त is null
```

These live in the JavaScript-hosted compiler; the self-hosted bootstrap
sources deliberately don't use them, so the fixpoint is unaffected.

## विकल्प — multi-way branch (switch / match)

`विकल्प` (vikalpa, "alternative") chooses a branch by value. Each `स्थिति`
(sthiti, "case") is **self-contained — implicit break, no C-style
fall-through** — so it reads like a `match`. Comma-separated values share a
branch; `अन्यथा` is the default:

```
कार्य वारनाम (क) {
    विकल्प (क) {
        स्थिति १: फलम् "सोमवासरः"।         # a single case
        स्थिति ६, ७: फलम् "सप्ताहान्तः"।    # 6 or 7 → one branch
        अन्यथा: फलम् "अन्यः दिनः"।          # default
    }
}
```

compiles to a JavaScript `switch` where every branch is a block scope with an
implicit `break` (so `चर`/`नियत` in one case can't leak into another, and
execution never falls through).

### Pattern matching — object & array shapes

A `स्थिति` may test a **structural pattern** instead of a value: an object
shape `कोष { … }` or an array `[ … ]`. Inside a pattern, a field written
`key: value` is a **constraint** (the discriminant's field must `===` it,
usually a literal); a **bare** `key` (or a positional array identifier) is a
**binding**, bound in that branch:

```
विकल्प (नोड) {
    स्थिति कोष { प्रकार: "यदि", देहः }:  फलम् देहः।       # प्रकार==="यदि"; देहः bound
    स्थिति कोष { प्रकार: "पाश" }:          फलम् "पाश"।      # constraint only
    स्थिति [शीर्ष, पुच्छ]:                  फलम् शीर्ष + पुच्छ।  # array of exactly 2
    अन्यथा:                                 फलम् "अज्ञातम्"।
}
```

Patterns compose three more ways:

```
स्थिति कोष { मूलम्: शीर्षकम् }:              # aliased binding — bind मूलम् as शीर्षकम्
स्थिति कोष { स्थानम्: कोष { x: ० } }:        # nested pattern — स्थानम् must itself match
स्थिति [प्रथम, ...शेषम्]:                     # array rest — bind the head, collect the tail
```

An identifier after `key:` binds (under that name); a `कोष`/`[` nests; anything
else is a constraint. `...name` binds the remaining array elements (a `.slice`),
relaxing the length test from `===` to `>=`.

The moment any `स्थिति` uses a pattern, the whole `विकल्प` lowers to an
`if / else if` chain instead of a `switch`: the discriminant is evaluated once
into a block-scoped temp, object patterns test `typeof`/key presence/constraints
and read bindings by their **raw Sanskrit key**, array patterns test
`Array.isArray` and exact length. The `अन्यथा` default becomes the trailing
`else`, and first match wins (still no fall-through). **Value-only `विकल्प`
keeps compiling to the exact same JS `switch`**, so nothing about existing
switches — or the bootstrap fixpoint — changes. Pattern bindings are real
scoped names: the semantic pass sees them, and go-to-definition / rename resolve
them like any other binding.

## विभाजन — destructuring

`चर` / `नियत` can bind straight out of an array or object:

```
नियत [प्रथमम्, द्वितीयम्] = निर्देशाङ्काः।   # const [a, b] = coords
नियत { नाम, वयः } = व्यक्तिः।                 # const { नाम: …, वयः: … }
नियत { नाम: नामधेयम् } = व्यक्तिः।            # key : alias — bind under a new name
```

Array patterns bind positionally; object patterns bind by field name
(shorthand `{ नाम }` or renamed `{ key: alias }`). Because `कोष` stores keys
as raw Sanskrit strings, object patterns extract by the raw key and bind the
transliterated local — so `नियत { नाम } = व` becomes `const { "नाम": naama } = v`.

Both constructs are understood by the semantic pass (destructured names are
real bindings; each विकल्प branch is its own scope) and, like the sugar above,
are absent from the bootstrap sources, so the self-hosting fixpoint is
unaffected.

## प्रकार — gradual, erasable types

Optional type annotations on parameters, return values, and variables. They are
**erased by the codegen** — the emitted JS is byte-identical with or without
them — so they never change runtime behaviour; they only drive analyzer
warnings. The base types draw from Sanskrit quantitative/grammatical vocabulary:

| प्रकार | type | | प्रकार | type |
|--------|------|---|--------|------|
| `सङ्ख्या` | number | | `गण` | array |
| `अक्षर` | string | | `रिक्त` | void (returns nothing) |
| `तथ्य` | boolean | | `किमपि` | any (the gradual escape) |
| `वस्तु` | object | | | |

```
कार्य योग (अ: सङ्ख्या, ब: सङ्ख्या): सङ्ख्या {
    फलम् अ + ब।
}
नियत आधारः: सङ्ख्या = योग(१०, ५)।     # ok
```

The checker is **gradual**: `किमपि` is compatible with everything, and an
un-annotated binding *is* `किमपि`, so a mismatch is reported **only when both
sides have a concrete, known type**. Unannotated code is never warned about, and
annotations can be added one at a time. It reports:

- **argument mismatch** — `योग("पञ्च", १)` → *argument 1 expects सङ्ख्या, got अक्षर*;
- **return mismatch** — a `फलम्` whose value's type disagrees with the declared
  return (and `रिक्त` returning a value, or a non-`रिक्त` function with a bare
  `फलम्`);
- **variable mismatch** — `चर क: सङ्ख्या = "x"`;
- **unknown type** — a misspelt annotation like `: संख्या`.

Types are inferred through literals, string concatenation (`+`), arithmetic,
comparisons, and the return type of typed calls — so `चर न: सङ्ख्या = ५` lets
`न` be checked as a number wherever it flows. Being absent from the bootstrap
sources, the type layer leaves the self-hosting fixpoint untouched.

### Composite arrays — `गण<सङ्ख्या>`

`गण` takes an **element type**: `गण<सङ्ख्या>` is an array of numbers. A bare
`गण` is `गण<किमपि>`, so it stays gradual and fits any element type. Array
literals infer their element type when the elements agree (`[१,२,३]` is
`गण<सङ्ख्या>`; a mixed or empty literal stays `गण<किमपि>`), and the element type
**flows** wherever the array is taken apart:

```
नियत अङ्काः: गण<सङ्ख्या> = [१, २, ३]।
प्रत्येकम् (क : अङ्काः) { दर्शय(योग(क, १))। }   # क is known सङ्ख्या
नियत [प्रथम, द्वितीय] = अङ्काः।                # both सङ्ख्या
# नियत ल: गण<अक्षर> = अङ्काः।                  # प्रकारभेदः: गण<अक्षर> ← गण<सङ्ख्या>
```

Array compatibility is structural on the element type, and a misplaced parameter
on a non-container type (`सङ्ख्या<अक्षर>`) is flagged. Like the rest of the
annotation, `<…>` is erased — the emitted JS is identical.

### Object shapes — `{ नाम: अक्षर, वयः: सङ्ख्या }`

`वस्तु` can be given a **structural shape** — a record of field types. An object
literal infers its shape (`कोष { नाम: "र", वयः: ३० }` is `{ नाम: अक्षर, वयः: सङ्ख्या }`),
field access flows the field's type, and assignment is checked field-by-field:

```
नियत व्यक्तिः: { नाम: अक्षर, वयः: सङ्ख्या } = कोष { नाम: "सीता", वयः: ३० }।
योग(व्यक्तिः.वयः, १०)।                    # व्यक्तिः.वयः is known सङ्ख्या
# नियत ख: { नाम: अक्षर } = कोष { वयः: ५ }।  # प्रकारभेदः: missing field नाम
```

Shapes are **structural with width subtyping**: an actual object may carry extra
fields, but every field the expected shape names must be present and compatible.
Shapes nest (`{ प: { x: सङ्ख्या } }`) and compose with arrays (`गण<{ id: सङ्ख्या }>`).
A bare `वस्तु` carries no known fields, so it stays gradual — any object fits it.

### Function types — `कार्य(सङ्ख्या): तथ्य`

A function type reuses the `कार्य` keyword, so no new syntax is introduced. It
types callbacks and higher-order functions — calls made *through* a
function-typed parameter are checked, and passing an incompatible function is
flagged:

```
कार्य द्विगुणीकृ (सूचिः: गण<सङ्ख्या>, रूपान्तर: कार्य(सङ्ख्या): सङ्ख्या): गण<सङ्ख्या> {
    फलम् सूचिः.प्रतिचित्रय(रूपान्तर)।              # रूपान्तर(x) is checked against सङ्ख्या
}
```

Function types are compatible on matching arity with compatible parameters and
return, compose inside shapes and arrays, and (like every annotation) are erased.

### Type narrowing from `विकल्प` patterns

A matched pattern refines its branch. Pattern **bindings inherit the
discriminant's field/element types** (not just `किमपि`), and a plain-identifier
discriminant is **narrowed** to the matched shape inside the branch:

```
कार्य वृद्धिः (नोड: { प्रकार: अक्षर, मान: सङ्ख्या }): सङ्ख्या {
    विकल्प (नोड) {
        स्थिति कोष { प्रकार: "अङ्क", मान }: फलम् योग(मान, १)।   # मान is known सङ्ख्या
        अन्यथा: फलम् ०।
    }
}
```

Here `मान` is `सङ्ख्या` (from the discriminant's shape), so `योग(मान, १)` checks;
using it where an `अक्षर` is expected would be flagged. Array patterns flow the
element type to positional binds and the array type to the rest. Narrowing only
ever *refines* — an untyped discriminant leaves bindings gradual, so it never
manufactures a false mismatch.

### Type-aware hover

Hovering an annotated binding — or any reference to one — reports its declared
type in the editor: `आधारः` shows *सङ्ख्या (number)*, a `गण<अक्षर>` variable
shows *array of string*, and a typed function shows a signature
*(सङ्ख्या, सङ्ख्या) → सङ्ख्या*. It resolves the binding through the symbol table,
so a usage far from the declaration still reports the right type; unannotated
bindings simply add nothing to the word's ordinary hover.

## आयात / निर्यात — the module system

Modules use **compile-time resolution and linking** (the Rust/Python
lineage, not C-style textual inclusion): each `.deva` file is compiled
independently, exports are explicit, and a bundler resolves the import graph
and links everything into one self-contained program.

**Exporting** — prefix any declaration with `निर्यात` (niryāta, "sending
out"). Anything not marked is private to its module:

```
# गणितागारम्.deva
निर्यात नियत पाई = ३।
निर्यात कार्य द्वि (न) { फलम् न * २। }
कार्य गुप्तम् () { … }          # private — not importable
```

**Importing** — `आयात` (āyāta, "incoming") with `आ` (ā, "from") as the
source preposition, in three forms:

```
आयात { द्वि, पाई } आ "गणितागारम्"।    # named — bind specific exports
आयात * रूपेण ग आ "गणितागारम्"।         # namespace — ग.द्वि, ग.पाई
आयात "उपस्करः"।                        # side-effect — just run the module
```

`devabhasha build entry.deva` (or `run`) resolves every `आयात` relative to
the importing file (appending `.deva`) — except a `std/…` source, which
resolves to the shipped standard library from anywhere — compiles each module once, orders
them dependency-first (topological sort), and links them: each module
becomes an IIFE returning its export object, named imports destructure it,
namespace imports bind the whole object. Diamond dependencies compile the
shared module a single time; missing modules and exports of non-declarations
are compile-time errors. See `examples/modules/` for a math library split
into a module and consumed by a main file.

The bundler lives in `src/bundler.js`; `compileModule(src)` returns
`{ code, exports, imports }` for tooling.

**Cross-module type checking.** `devabhasha check entry.deva` type-checks the
whole program across `आयात` edges. Each module's *exported signatures* (a
`कार्य`'s parameter/return types, a typed `नियत`'s type) are resolved from the
exporting module and seeded into the importer's checker — so a call to an
imported function is argument-checked, an imported constant carries its declared
type, and a namespace import (`आयात * रूपेण ग`) is modelled as an object shape so
`ग.द्विगुण("x")` is checked through member access:

```
# गणित2.deva
निर्यात कार्य द्विगुण (न: सङ्ख्या): सङ्ख्या { फलम् न + न। }
# मुख्य.deva
आयात { द्विगुण } आ "गणित2"।
द्विगुण("तार")।          # प्रकारभेदः: argument 1 expects सङ्ख्या, got अक्षर
```

Because signatures come from annotations, no dependency ordering is needed;
unannotated exports stay `किमपि`, so untyped modules impose nothing (gradual).

`check` also verifies **import existence**: a named import of a symbol the
target module does not `निर्यात` binds `undefined` at runtime — a silent bug —
so it is flagged, pointed precisely at the offending name. (Namespace and
side-effect imports name nothing, so they are never flagged.)

```
आयात { द्विगुण, नास्ति } आ "गणित2"।   # आयातदोषः: 'नास्ति' is not exported by "गणित2"
```

`check` exits non-zero when it finds issues, making it a CI gate. The core is
`checkProgram(entry)` in the bundler; `moduleExportTypes(src)` in `src/types.js`
extracts a module's export types.

## आदर्शकोशः — the standard library (written in Devabhāṣā)

The standard library is itself written **in Devabhāṣā**, as `.deva` modules
under `examples/stdlib/` — the clearest proof the module system earns its
keep, and the "move features to libraries" principle in practice. Each is
plain Devabhāṣā built on the array/string/object primitives, with zero
compiler support. The data-structure modules (सूची / पाठ / कोष) are also
**typed** — signatures carry प्रकार annotations wherever the type is genuinely
concrete (`योगः` wants `गण<सङ्ख्या>`, `आवर्तय` an `अक्षर` and a `सङ्ख्या`
count, a predicate a `कार्य(किमपि): तथ्य`). Element-polymorphic helpers keep a
bare `गण`/`किमपि`, since the type layer has no generics and an honest `किमपि`
beats a false `गण<सङ्ख्या>`. The annotations are erased, so runtime is
unchanged — but `devabhasha check` now argument-checks calls *through* a `std/`
import (e.g. `आवर्तय(५, "x")` is flagged across the boundary):

- **सूची** (list): `योगः` (sum), `गुणनफलम्` (product), `न्यूनीकरणम्` (fold),
  `अन्वेषय` (find), `सन्ति`/`सर्वे` (any/all), `न्यूनतमम्`/`महत्तमम्`
  (min/max), `अद्वितीयम्` (unique), `आदिमानि`/`शेषाणि` (take/drop),
  `समतलीकृ` (flatten), `परिसरः` (range), `क्रमय` (sort by comparator — a
  **stable merge sort written in Devabhāṣā**, no `.sort` primitive),
  `क्रमयाङ्कैः` (numeric sort), `गणय` (count matching), `युग्मय` (zip),
  `खण्डशः` (chunk).
- **कोष** (object): `कुञ्जयः`/`मूल्यानि`/`प्रविष्टयः` (keys/values/entries),
  `अस्ति` (has-key), `सङ्ख्या` (count), `विलयः` (merge),
  `प्रतिचित्रयमूल्यानि` (map-values), `गालयकुञ्जीभिः` (pick),
  `त्यजकुञ्जीभिः` (omit), `विपर्यासय` (invert keys/values). Built on the
  `सङ्ग्रह` (Object) global.
- **पाठ** (string): `आवर्तय` (repeat), `वामपूरणम्`/`दक्षिणपूरणम्`
  (pad-left/right), `प्रथमाक्षरोच्च` (capitalize), `पदानि` (words),
  `पङ्क्तयः` (lines), `व्युत्क्रमः` (reverse), `परिवर्तय_सर्वम्` (replace-all),
  `आवृत्तिः` (count occurrences), `रिक्तः` (is-blank).
- **परीक्षा** (test framework): `परीक्षा(नाम, fn)` registers and runs a test,
  `अपेक्ष(actual)` returns an asserter (`.समम्`/equal, `.असमम्`/not-equal,
  `.सत्यम्ता`/truthy, `.असत्यम्ता`/falsy), `समम्(अ, ब)` is a standalone deep
  structural equality, and `सारः()` prints the `N पास, M फेल` tally. Staying
  true to the no-exceptions design, assertions **record** their outcome into a
  collector rather than throwing.

Use them by their **canonical `std/` name** from anywhere — the compiler ships
the library, so no copying beside your program is needed. `std/X` resolves to
the shipped module regardless of the importing file's location:

```
आयात { परिसरः, योगः } आ "std/सूची"।
आयात { आवर्तय } आ "std/पाठ"।
दर्शय(योगः(परिसरः(१, ५)))।            # 10
दर्शय(आवर्तय("=", योगः([१,२])))।       # "==="
```

Everything else works through `std/` too: namespace imports (`आयात * रूपेण सू आ
"std/सूची"`), `devabhasha run`/`build`, and `devabhasha check` (cross-module
type checking resolves `std/` like any other edge). A plain relative import
(`आ "./mymod"`) still resolves next to the importing file; only the `std/`
prefix reaches into the shipped library (currently `examples/stdlib/`).

With `परीक्षा`, the language tests itself: Devabhāṣā programs (including the
standard library above) can be tested *in Devabhāṣā*, completing the
self-hosting story that already covers the compiler. `examples/परीक्षा-उदाहरणम्.deva`
tests the `सूची` module using `परीक्षा` — both written in the language:

```
आयात { परीक्षा, अपेक्ष, सारः } आ "stdlib/परीक्षा"।
आयात { योगः, अद्वितीयम् } आ "stdlib/सूची"।
परीक्षा("अद्वितीयम्", कार्य(){ अपेक्ष(अद्वितीयम्([१,२,२,३])).समम्([१,२,३])। })।
सारः()।                              # → "1 पास, 0 फेल"
```

Reflection helpers underpin it: `स्वरूपम्(v)` gives a value's type as a
Sanskrit name (`अङ्क`, `वाक्`, `सूची`, `कोष`, `सत्यासत्य`, `रिक्त`), and
`सूचीवत्(v)` tests for a list — enabling the framework's deep equality.

## उपकरणानि — tooling (VS Code extension, dev server, source maps & LSP)

**VS Code extension.** `devabhasha-1.0.0.vsix` is an installable VS Code
extension (Extensions panel → "Install from VSIX…", or
`code --install-extension devabhasha-1.0.0.vsix`). It gives `.deva` files
syntax highlighting (a TextMate grammar), completion, hover, go-to-definition,
rename, and live diagnostics, plus a "Run current file" command. Rather than
spawning the stdio language server, the extension wires the **same
dependency-free analyzer core** (`src/analyzer.js`) directly to VS Code's
provider APIs in-process — so the server and the extension are two frontends
over one analyzer, with no bundled language-client and no child process. The
analyzer graph is bundled to CommonJS for the extension with `node
build-extension.js` (esbuild is a build-time tool only; nothing extra ships in
the `.vsix`).

**Dev server with live reload.** `devabhasha serve file.deva [--port N]` starts
a zero-dependency dev server (Node's built-in `http` + `fs.watch`, live reload
over Server-Sent Events — no packages) that:

- serves an HTML page running your compiled web program, mounted at `#मूलम्`,
- watches the source (and its `आयात` imports) and **recompiles + reloads the
  browser automatically** when you save, and
- shows compile *and* runtime errors on the page instead of a blank screen,
  staying up so you can fix and re-save.

So the loop is: edit `.deva`, save, see it update in the browser — the modern
front-end dev experience, for a Sanskrit language.

**Source maps.** `devabhasha build file.deva --sourcemap` emits the JS plus a
standard **Source Map v3** (`.js.map`, with `sourcesContent` and a
`//# sourceMappingURL` comment), so browser dev-tools and Node stack traces
point back at the original Devanagari source. Mapping is at statement
granularity — each statement node carries its source line/col, and the
codegen tracks output position as it emits. The maps are VLQ-encoded and
validated against the standard `source-map` library. The API is
`compileWithMap(source) → { code, map }`.

**Language server (LSP).** `src/server.js` is an editor-agnostic Language
Server speaking the Language Server Protocol over stdio — any LSP client
(VS Code, Neovim, Helix…) can connect by running `node src/server.js`. It
provides:

- **diagnostics** — compile errors with precise ranges, live as you type
  (cleared automatically when the code becomes valid);
- **completion** — the full vocabulary (keywords, stdlib methods, गणित
  constants, रूप properties and color words, element tags, events), filtered
  by the prefix being typed;
- **hover** — what a Sanskrit word means and what it translates to
  (`वर्णः` → color, `रक्तः` → crimson, `वर्गमूलम्` → Math.sqrt);
- **go-to-definition** — jump from any use of a name to where it is bound;
- **rename** — rename a binding and every reference that resolves to it,
  atomically, as one workspace edit.

Go-to-definition and rename are backed by a **scope-aware symbol table**
(`src/symbols.js`) that walks the AST tracking lexical scopes — `चर`/`नियत`,
`कार्य` names and parameters, `भाव`/`रूपनाम` declarations, and `प्रत्येकम्`
loop variables. It respects **shadowing**: a renamed inner parameter never
touches an outer variable of the same name, and vice versa. (This is why
identifiers and declaration names carry source positions — JS-side metadata,
stripped before the self-hosted parser comparison, so the bootstrap is
unaffected.)

The analysis is pure functions in `src/analyzer.js` (`diagnostics`,
`completions`, `hover`, `definition`, `renameOccurrences`, `wordAt`);
`server.js` is a thin JSON-RPC wrapper, so the same engine can power other
front-ends.

**Semantic analysis.** Beyond syntax, `src/semantics.js` runs a meaning-level
pass and folds its findings into `diagnostics()` as **warnings** — a syntax
error is still reported alone (the AST is unusable), but a *clean parse* yields
the semantic warnings:

- **undefined names** — a reference bound nowhere in scope (and not a known
  Sanskrit global or style word). Scopes hoist, so forward references and
  mutual recursion don't false-positive;
- **unreachable code** — statements after `फलम्`/`भङ्ग`/`अनुवृत्तम्`;
- **arity mismatch** — a call to a fixed-arity local function (a `कार्य`
  declaration or a `नियत` function) with the wrong argument count;
- **duplicate कारक** — two arguments in one `रचय` whose vibhakti maps to the
  same slot (e.g. two nominatives, or two `वाक्यम्` contents). Since word order
  is free, position can't disambiguate them, so the earlier value is silently
  overwritten — almost always a mistake. The warning names the कारक and the
  overriding word.

The pass is fail-safe (never throws) and validated to produce **zero false
positives across every example** — it is in fact what surfaced (and led to the
fix of) a latent indent bug in the self-hosted `codegen.deva`.

## सञ्चिका / जाल — file & network I/O

I/O is **layered**: a program calls the Sanskrit surface (`सञ्चिका` for
files, `जाल` for the network), which the codegen lowers to a runtime
interface `__IO`, which a host-injected **backend** implements. The program
is bound to the *interface*, never to Node — so the same code runs against
the Node backend (CLI), a browser backend, or an in-memory test backend
(this is exactly how the test suite proves it, running one program against
two backends).

Every operation is **async and returns a `परिणाम` (Result)** — composing the
two foundations above. You `प्रतीक्षा` (await) the call and inspect the
Result; a failure is a value, never a thrown exception, so a missing file
can't crash the program:

```
असमकालिक कार्य मुख्यम् () {
    प्रतीक्षा सञ्चिका.लिख("संदेशः.txt", "नमस्ते")।       # write
    चर र = प्रतीक्षा सञ्चिका.पठ("संदेशः.txt")।            # read
    यदि (र.सफल) { दर्शय(र.मूल्यम्)। } अन्यथा { दर्शय(र.दोषः)। }

    चर जालम् = प्रतीक्षा जाल.आनय("https://api.example.com")। # fetch
    यदि (जालम्.सफल) { दर्शय(जालम्.मूल्यम्.स्थितिः)। }        # → HTTP status
}
मुख्यम्()।
```

**File ops** (`सञ्चिका`): `पठ` (read), `लिख` (write), `विद्यते` (exists),
`निष्कासय` (remove), `सूचीकृ` (list a directory). **Network** (`जाल`):
`आनय` (fetch), whose Result value carries `स्थितिः` (status), `पाठः` (body
text), and `सफलम्` (ok). The Node backend lives in `src/io-node.js`;
`devabhasha run` injects it, and `devabhasha build` inlines it so the
produced `.js` is self-contained under Node. See `examples/io.deva`.

## सेवक — HTTP server (backend)

Because Devabhāṣā compiles to JavaScript and runs on Node, it can be a
*backend* language too. `सेवक(handler, port)` (sevaka, "server") starts an HTTP
server — the same host-bridge pattern as `सञ्चिका`/`जाल`, lowered to a `__SRV`
runtime the Node backend implements (`src/server-node.js`; `run` injects it,
`build` inlines it). The handler receives a **request** and **response**, both
keyed in Devanagari:

```
सेवक(असमकालिक कार्य(अनुरोधः, प्रत्युत्तरम्){
    यदि (अनुरोधः.मार्गः == "/जनाः") {                      # route by path
        यदि (अनुरोधः.रीतिः == "GET") {                    # branch by method
            प्रत्युत्तरम्.प्रेषय_जेसन(सूची)।                  # JSON response
        } अन्यथा {
            चर परि = प्रतीक्षा अनुरोधः.देहम्_जेसन()।          # parse JSON body → परिणाम
            यदि (परि.सफल) {
                सूची.योजय(परि.मूल्यम्)।
                प्रत्युत्तरम्.स्थिति(२०१).प्रेषय_जेसन(परि.मूल्यम्)।
            } अन्यथा {
                प्रत्युत्तरम्.स्थिति(४००).प्रेषय_जेसन(कोष{ दोषः: "bad" })।
            }
        }
    } अन्यथा {
        प्रत्युत्तरम्.स्थिति(४०४).लेखय("न प्राप्तम्")।
    }
}, ८०८०)।
```

The **request** (`अनुरोधः`) exposes `मार्गः` (decoded path), `रीतिः` (method),
`शीर्षाणि` (headers), `प्रश्नाः` (query params), and async body readers `देहम्()`
(text) and `देहम्_जेसन()` (→ `परिणाम`, so a malformed body is a value, never a
crash). The **response** (`प्रत्युत्तरम्`) is chainable: `स्थिति(code)`,
`शीर्षम्(k, v)`, `लेखय(text)`, `प्रेषय_जेसन(value)`. The handler may be
`असमकालिक` (async); if it throws, the server returns 500 and stays up.

This is a deliberately minimal HTTP primitive — enough to write a real JSON API
or static server (`examples/सेवकः.deva` is a small books API), not a
production framework like Express. Its value is the same as the rest of the
language: an honest, teachable surface — and, paired with the reactive frontend,
the rare ability to write *both ends of a web app in one Sanskrit source*. A
routing/middleware library written in Devabhāṣā on top of `सेवक` (the
"framework" proper, like `परीक्षा` is for testing) is the natural next layer.

`examples/पूर्णस्तर/` is a **full-stack app**: a reactive Sanskrit frontend
(`अग्रिम.deva`) fetching from a Sanskrit HTTP/JSON backend (`पश्चिम.deva`) over
real HTTP, sharing the language, the Result error model, and the JSON shapes.
Run it with `node चालय.mjs` and open `http://localhost:8100`.

### मार्गकः — a routing library (written in Devabhāṣā)

`सेवक` is the bare primitive; `मार्गकः` (mārgaka, "router") is the *framework*
layer on top — and, like `परीक्षा` the test framework, it's **written in
Devabhāṣā itself** (`examples/stdlib/मार्गकः.deva`), not baked into the runtime.
Import it and register routes by method and path:

```
आयात { मार्गकः } आ "मार्गकः"।
चर ऐप = मार्गकः()।
ऐप.उपयुज्(असमकालिक कार्य(अ, प्र, अग्रे){ दर्शय(अ.मार्गः)। प्रतीक्षा अग्रे()। })।  # middleware
ऐप.प्राप्("/ग्रन्थाः", कार्य(अ, प्र){ प्र.प्रेषय_जेसन(सूची)। })।               # GET
ऐप.प्राप्("/ग्रन्थाः/:अंकः", कार्य(अ, प्र){ ... अ.प्राचलाः["अंकः"] ... })।      # path param
ऐप.स्थापय("/ग्रन्थाः", असमकालिक कार्य(अ, प्र){ ... })।                       # POST
ऐप.चालय(८०८०)।
```

The API: `प्राप्` (GET), `स्थापय` (POST), `परिवर्तय` (PUT), `निष्कासय` (DELETE),
`उपयुज्` (middleware), `चालय` (listen). Path parameters (`:अंकः`) are captured
into `अनुरोधः.प्राचलाः`. Middleware follows the Koa contract — `असमकालिक`, and
`प्रतीक्षा अग्रे()` to pass control downstream — which is what lets the server
await the whole chain before ending the response.

**On "optimum":** each route's path is **compiled once at registration** into a
segment list (static segments + `:param` markers), and routes are **grouped by
method**, so a request does only a segment-by-segment compare against the routes
of its own method — no regex, no re-parsing per request. A radix tree would win
at very large route counts; at app scale this segment-compare is effectively
optimal and far simpler, an honest tradeoff stated in the source.
`examples/stdlib/मार्गक-उदाहरणम्.deva` is a books API built on it.

**JSON & structured data.** `प्रदत्त` (pradatta, "data") parses and serializes
JSON, both returning a `परिणाम` (since `JSON.parse` throws and the language
has none): `प्रदत्त.विश्लेषय(पाठः)` (parse) and `प्रदत्त.सूत्रय(मूल्यम्)`
(serialize). `अङ्कय(पाठः)` parses a string to a number, also as a Result. The
I/O layer adds JSON convenience ops so a config or API response becomes usable
data in one step: `सञ्चिका.पठप्रदत्त`/`लिखप्रदत्त` (read/write JSON files) and
`जाल.आनयप्रदत्त` (fetch + parse, value carries `प्रदत्तम्`). These compose with
`प्रतीक्षा` and `अथवा`:

```
चर विन्यासः = (प्रतीक्षा सञ्चिका.पठप्रदत्त("config.json")) अथवा कोष{ }।  # parsed config, or {}
चर सङ्ख्या = अङ्कय(आदानम्) अथवा ०।                                      # parsed number, or 0
```

## असमकालिक — async & await

For operations that complete later (timers, and the upcoming I/O layer),
Devabhāṣā has real `async`/`await` — the model JS, Python, and Rust all
converged on, and a near-direct map to JS since the target is JS.

- `असमकालिक कार्य …` (asamakālika, "asynchronous") marks an async function;
  it returns a promise (`आश्वासन`).
- `प्रतीक्षा <expr>` (pratīkṣā, "waiting") awaits a promise, valid only
  inside an `असमकालिक` function — the compiler enforces this (a top-level or
  nested-sync `प्रतीक्षा` is a compile error, matching JS's coloring rule).
- promises chain with `.ततः` (then), `.दोषे` (catch), `.अन्ततः` (finally).

```
असमकालिक कार्य मुख्यम् () {
    चर परि = प्रतीक्षा आनय(कोषः)।        # await a promise
    यदि (परि.सफल) { दर्शय(परि.मूल्यम्)। }  # …of a परिणाम (Result)
    अन्यथा       { दर्शय(परि.दोषः)। }
}
मुख्यम्()।
```

async composes with the Result model: a fallible async operation returns a
*promise of a* `परिणाम`, so `प्रतीक्षा` yields a Result the caller inspects —
honest async **and** honest errors, with no exceptions. Event handlers can be
async too (`स्पर्शाय करणेन असमकालिक कार्य(){ … प्रतीक्षा … }`), the usual
shape for I/O-on-click.

## परिणाम — the error model (Result values)

Devabhāṣā handles fallible operations with **explicit Result values**, not
exceptions — keeping with the language's preference for visible over hidden
control flow (and avoiding a new non-local jump in the self-hosted compiler).
A fallible function returns a `परिणाम` (pariṇāma, "result/outcome"), built
with one of two constructors:

- `साधितम्(मूल्यम्)` (sādhitam, "achieved") — success, carrying a value
- `विफलम्(दोषः)` (viphalam, "failed") — failure, carrying an error

A `परिणाम` has three fields: `सफल` (ok?), `मूल्यम्` (the value), `दोषः`
(the error). The caller inspects it with ordinary `यदि`:

```
कार्य भाग (अंशः, हरः) {
    यदि (हरः == ०) { फलम् विफलम्("शून्येन भागः")। }   # Err
    फलम् साधितम्(अंशः / हरः)।                          # Ok
}

चर फल = भाग(१०, २)।
यदि (फल.सफल) { दर्शय("ok:", फल.मूल्यम्)। }
अन्यथा       { दर्शय("दोष:", फल.दोषः)। }
```

Results compose: a function can map an `Ok` value and pass an `Err` through
unchanged, which is how fallible steps chain without exceptions. The
constructors live in a host-independent prelude (`__RT`), so Result works in
any environment — including the I/O layer, where operations return `परिणाम`
rather than throwing.

**`अथवा` — value-or-fallback.** The common "use the value, or a default if it
failed" pattern would otherwise be a four-line `यदि/अन्यथा` block. `अथवा`
(athavā, "or else") collapses it to an expression: it yields the Result's
`मूल्यम्` when `सफल`, else a fallback that is **evaluated lazily** (only on
failure). It's pure expression sugar — no hidden control flow — and composes
with `await`, which is exactly the I/O case:

```
चर सामग्री = (प्रतीक्षा सञ्चिका.पठ("config.txt")) अथवा "रिक्तम्"।  # default on read failure
चर सङ्ख्या = संख्यांकय(आदानम्) अथवा ०।                              # default on parse failure
```

`अथवा` chains right-associatively (`अ अथवा ब अथवा ग` tries each in turn,
first `Ok` wins) and also guards plain `null`/non-Result values, so it
doubles as a nullish fallback.

## दोषनिरूपणम् — error reporting

Compiler errors are structured (`DevabhashaError` with `line`, `col`, and a
`kind` of lex/parse/codegen) and render with source context and a caret:

```
अक्षरदोषः (lex error): अज्ञातं चिह्नम् (unknown character) '@'
  line 2, column 9

  २ | दर्शय(a @ b)।
    |         ^
```

Line numbers display in Devanagari numerals. The same formatting appears in
the CLI (`devabhasha run`) and live in the playground as you type. Use
`formatError(err, source)` to render any caught `DevabhashaError`.

## मानकपुस्तकालय — standard library (strings, objects, arrays)

The machinery a compiler is made of. These are what make self-hosting
possible: a lexer needs to index strings, accumulate substrings, push
records onto arrays, and read object fields.

**Strings** — `.दीर्घता` (length), `.अक्षरः(i)` (charAt), `.सङ्केतः(i)`
(charCodeAt), `.खण्ड(a,b)` (slice), `.अस्ति(x)` (includes), `.विभज(s)`
(split), `.उच्च`/`.नीच` (upper/lower), `.आरभते`/`.समाप्यते` (starts/ends).

**Arrays** — `.योजय(x)` (push), `.अपनय()` (pop), `.दीर्घता` (length),
`.प्रतिचित्रय(fn)` (map), `.गालय(fn)` (filter), `.सम्मील(s)` (join),
`.अनुक्रमणिका(x)` (indexOf), indexing via `सूची[i]`.

**Builtins** — `संकेताक्षर(code)` (saṅketākṣara, "code-letter") →
`String.fromCharCode`, e.g. `संकेताक्षर(९२)` yields a backslash. This is
what lets the self-hosted codegen build escape characters without writing
escape literals.

**Objects** — the `कोष` (kośa, "dictionary") literal:

```
चर व्यक्तिः = कोष { नाम: "राम", आयुः: ३० }।
दर्शय(व्यक्तिः.नाम)।          # field access
व्यक्तिः.आयुः = ३१।           # field assignment
```

Property names live in their own namespace, so a word that's a keyword
elsewhere (`योजय` = DOM mount) is still usable as a method name
(`सूची.योजय` = array push). The stdlib name→JS mapping lives in
`src/stdlib.js`.

### Self-hosting milestone

With strings, objects, and arrays in place, compiler machinery can now be
written *in Devabhāṣā itself*.

**All three compiler stages are written in Devabhāṣā, and the bootstrap is
a closed fixpoint** — the compiler reproduces itself byte-for-byte.

- `examples/lexer.deva` — port of `src/lexer.js`. Character classes are
  built from codepoint arithmetic (no regex); keyword/operator tables are
  Devabhāṣā data.
- `examples/parser.deva` — port of `src/parser.js`: recursive descent +
  Pratt expression parsing. Since Devabhāṣā functions don't close over
  outer mutable state, the parser threads an explicit state object
  `अ = कोष { शब्दाः, स्थानम् }` through every function.
- `examples/codegen.deva` — port of `src/codegen.js`: the AST→JS emitter,
  the Devanagari→ASCII transliterator `आईडी`, and string quoting. The
  quoter builds every special character (backslash, quote, newline, tab)
  from its code point via the `संकेताक्षर` (String.fromCharCode) builtin,
  so the codegen source contains **no escape literals** — which is what
  lets it reproduce its own source exactly.

Verified by the standard compiler-bootstrap fixpoint check
(`test/fixpoint.test.js`):

1. the JS-hosted compiler compiles the three `.deva` sources → a
   Devabhāṣā-hosted compiler (stage 1);
2. that compiler recompiles all three sources (stage 2);
3. a compiler built from stage-2 output recompiles them again (stage 3);
4. **stage 2 === stage 3, byte-for-byte, for all three components** — the
   same criterion GCC/Rust/Go use to certify a self-hosting bootstrap.

The stage-3 compiler — built entirely from Devabhāṣā-generated JavaScript,
with no original toolchain involved — runs real programs (recursion,
objects, arrays) correctly. `node selfhost-demo.mjs` shows the full
self-hosted compiler compiling and running Fibonacci.

## Architecture
A textbook transpiler pipeline — each stage is one file, no dependencies:

```
source .deva
   │  src/lexer.js     tokenize Devanagari → token stream
   ▼
 tokens
   │  src/parser.js    recursive descent (statements) + Pratt (expressions) → AST
   ▼
  AST
   │  src/codegen.js   tree-walk → JavaScript text (+ optional DOM runtime)
   ▼
 JavaScript
```

- **`src/keywords.js`** — the *only* Sanskrit-aware file. Edit vocabulary here
  without touching the engine. The lexer maps each Devanagari keyword to a
  language-neutral token type, so the parser and codegen never see Sanskrit.
- **`src/index.js`** — `compile(source, { includeRuntime }) → string`.
- **`src/cli.js`** — `build` / `run` commands.
- **`build-playground.js`** — inlines the ES modules into one HTML file.

## Extending it

- **Add a keyword:** one line in `keywords.js`. If it needs new syntax, add a
  parse branch in `parser.js` and an emit case in `codegen.js`.
- **Add an operator:** add to `OPERATORS` (longest-first) and to `BINARY_PREC`.
- **Richer web layer:** the runtime in `codegen.js` (`__DB`) is intentionally
  tiny — extend `el` to support a JSX-like compound (`समास`) syntax, or add a
  reactivity primitive.

## Suggested roadmap from here

Much of the original roadmap is now in place: **source maps** (`--sourcemap`),
a **समास element syntax** (block-form `रचय` trees), **type annotations**
(`प्रकार`, above), **editor support** (TextMate grammar + VS Code extension +
LSP), and **Sanskrit diagnostics** (a full semantic pass — undefined names,
unreachable code, arity, duplicate कारक, वचन agreement — plus the gradual type
checker).

Open directions from here:

1. **Deeper types** — **done**: element-typed arrays (`गण<सङ्ख्या>`), **object
   shapes** (`{ नाम: अक्षर }`, structural with width subtyping and field-type
   flow), **function types** (`कार्य(सङ्ख्या): तथ्य`, checked through higher-order
   calls), **type narrowing from `विकल्प` patterns** (bindings inherit the
   discriminant's field/element types; the discriminant is narrowed to the
   matched shape), and **type-aware hover**.
2. **Vibhakti breadth** — the oblique cases of the इ/ई/उ vowel-final stems (the
   नदी / मति / शत्रु paradigms) are **now in place**. Still open: further stem
   classes (ऋकारान्त, consonant-final) and gendered variants, extending
   `vibhakti.js` (`PARADIGM_TABLE` / `VOWEL_STEMS` / `NOMINAL_DECLENSION`).
3. **वचन semantics for द्विवचन** — **now in place**: a dual कर्तृ builds a pair
   (a group of exactly two, count-checked with a वचनभेदः diagnostic), matching
   the बहुवचन group semantic.
4. **Pattern matching** — **done**: `विकल्प` accepts structural object and array
   patterns (`स्थिति कोष { प्रकार: "If", देहः }: …`) with constraints, shorthand
   and aliased bindings, nested patterns, and array rest (`...शेषम्`), lowering
   to an if-chain (see *Pattern matching* above).

## License

MIT.
