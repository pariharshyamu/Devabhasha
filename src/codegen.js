// codegen.js — walks the AST and emits JavaScript source text.

import { METHODS, PROPERTIES, GLOBALS, MATH_CONSTANTS } from './stdlib.js';
import { styleProp, styleValue, isStyleWord } from './style.js';
import { DevabhashaError } from './errors.js';

export const PRELUDE = `// --- देवभाषा prelude (host-independent) ---
const __RT = {
  // परिणाम (Result): explicit success/failure values for fallible operations.
  // keys are the raw Sanskrit field names, since member access (फल.सफल) emits
  // the property name unchanged.
  ok(v)  { return { "सफल": true,  "मूल्यम्": v,    "दोषः": null }; },
  err(e) { return { "सफल": false, "मूल्यम्": null, "दोषः": e }; },
  // result अथवा fallback — the Result's value if सफल, else the (lazy) fallback.
  // A non-Result value is returned as-is (so अथवा is also a null/Err guard).
  orElse(r, fb) {
    if (r && typeof r === "object" && "सफल" in r) return r["सफल"] ? r["मूल्यम्"] : fb();
    return r == null ? fb() : r;
  },
  // प्रकारः — a value's kind, named in Sanskrit (for reflection / tests).
  typeOf(v) {
    if (v === null || v === undefined) return "रिक्त";       // null/undefined
    if (Array.isArray(v)) return "सूची";                      // array
    const t = typeof v;
    if (t === "number") return "अङ्क";                        // number
    if (t === "string") return "वाक्";                        // string
    if (t === "boolean") return "सत्यासत्य";                   // boolean
    if (t === "function") return "कार्य";                     // function
    return "कोष";                                            // object/record
  },
  // प्रदत्त (data) — JSON parse/serialize, both returning परिणाम since
  // JSON.parse throws and the language has no exceptions.
  json: {
    विश्लेषय(text) {           // parse
      try { return __RT.ok(JSON.parse(text)); }
      catch (e) { return __RT.err(String(e && e.message || e)); }
    },
    सूत्रय(v, pretty) {         // stringify (pretty by default)
      try { return __RT.ok(JSON.stringify(v, null, pretty === false ? undefined : 2)); }
      catch (e) { return __RT.err(String(e && e.message || e)); }
    },
  },
  // अङ्कय — parse a string to a number → परिणाम (Err if not a number).
  toNumber(s) {
    const n = Number(s);
    return Number.isNaN(n) ? __RT.err("अङ्कः न (not a number): " + s) : __RT.ok(n);
  },
};
`;

const RUNTIME = `// --- देवभाषा runtime ---
const __DB = {
  el(tag, ...rest) {
    const node = document.createElement(tag);
    for (const r of rest) {
      if (r == null) continue;
      if (typeof r === 'object' && !(r instanceof Node) && !Array.isArray(r)) {
        // props/attrs object
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith('on') && typeof v === 'function') {
            node.addEventListener(k.slice(2).toLowerCase(), v);
          } else if (k === 'style' && typeof v === 'object') {
            Object.assign(node.style, v);
          } else {
            node.setAttribute(k, v);
          }
        }
      } else if (Array.isArray(r)) {
        r.forEach(c => node.append(c instanceof Node ? c : document.createTextNode(String(c))));
      } else {
        node.append(r instanceof Node ? r : document.createTextNode(String(r)));
      }
    }
    return node;
  },
  mount(node, target) {
    const t = typeof target === 'string' ? document.querySelector(target) : (target || document.body);
    // a बहुवचन group is an array of nodes → append each
    if (Array.isArray(node)) {
      node.forEach(n => t.append(n instanceof Node ? n : document.createTextNode(String(n))));
      return node;
    }
    t.append(node);
    return node;
  },
  listen(node, event, handler) {
    node.addEventListener(event, handler);
    return node;
  },
  construct({ tag, content, contentBind, event, handler, parent, prop, source, children, style, styleBind }) {
    const node = document.createElement(tag);
    if (contentBind != null) {
      // fine-grained: a bound text node that updates in place on dep change
      node.append(__DB.bindText(contentBind));
    } else if (content != null && content.__isSutra) {
      // a सूत्र reactive reference passed as content → bind fine-grained
      node.append(__DB.bindText(content));
    } else if (content != null) {
      if (Array.isArray(content)) content.forEach(c => node.append(c instanceof Node ? c : document.createTextNode(String(c))));
      else node.append(content instanceof Node ? content : document.createTextNode(String(content)));
    }
    if (children) {
      // DOM append moves nodes, so nested child constructs are correctly
      // re-parented into this element (समास composition). An array child is
      // flattened — this is what makes list rendering (.प्रतिचित्रय → nodes) work.
      const appendChild = c => {
        if (c == null) return;
        if (Array.isArray(c)) { c.forEach(appendChild); return; }
        node.append(c instanceof Node ? c : document.createTextNode(String(c)));
      };
      for (const c of children) appendChild(c);
    }
    if (style && typeof style === 'object') {
      Object.assign(node.style, style);
    }
    if (styleBind && typeof styleBind === 'object') {
      // each dynamic style property gets its own effect → only that property
      // updates when its dependencies change (fine-grained, no rebuild).
      for (const [k, thunk] of Object.entries(styleBind)) {
        __DB.effect(() => { node.style[k] = thunk(); });
      }
    }
    if (prop && typeof prop === 'object') {
      for (const [k, v] of Object.entries(prop)) node.setAttribute(k, v);
    }
    if (event && handler) node.addEventListener(event, handler);
    if (parent != null) {
      const t = typeof parent === 'string' ? document.querySelector(parent) : parent;
      (t || document.body).append(node);
    }
    return node;
  },

  // बहुवचन (plural) construction: distribute one element per समास child,
  // each child becoming that element's content, all sharing the remaining
  // kāraka slots (event/handler/prop/style). Returns an ARRAY of nodes — a
  // "group" that flattens into any parent (समास child arrays are flattened,
  // and mount/append handle arrays), so it composes exactly like a single
  // element. e.g.  रचय पटाः रूप { वर्णः: नील } { "एक" "द्वि" }  → two blue
  // <button>s labelled एक / द्वि.
  constructGroup(spec) {
    const { children, content, contentBind, ...shared } = spec;
    const items = [];
    const collect = c => {
      if (c == null) return;
      if (Array.isArray(c)) { c.forEach(collect); return; }
      items.push(c);
    };
    (children || []).forEach(collect);
    return items.map(child => __DB.construct({ ...shared, content: child }));
  },

  // ----- reactivity -----
  // A subscriber stack: whatever is on top when a भाव cell is READ becomes a
  // dependency of that subscriber. Both the coarse दृश्य (a whole-view render)
  // and a fine-grained प्रभाव (effect) push themselves here. A subscriber is an
  // object { run, deps } where deps is the set of cells it currently reads.
  _subStack: [],
  _currentSub() { return __DB._subStack.length ? __DB._subStack[__DB._subStack.length - 1] : null; },
  state(initial) {
    let value = initial;
    const subs = new Set();             // subscribers depending on this cell
    const cell = (...args) => {
      if (args.length === 0) {            // read — track the current subscriber
        const sub = __DB._currentSub();
        if (sub) { subs.add(sub); if (sub.deps) sub.deps.add(cell); }
        return value;
      }
      const next = args[0];               // write
      // skip re-render only when an unchanged PRIMITIVE is written; object/
      // array state is usually mutated in place, so always re-render those.
      if (next === value && (next === null || typeof next !== 'object')) return value;
      value = next;
      // notify every subscriber (snapshot first — re-running mutates the set)
      for (const sub of Array.from(subs)) {
        if (typeof sub === 'function') sub();          // legacy view render
        else if (sub && sub.run) sub.run();            // effect / binding
      }
      return value;
    };
    cell.__isState = true;
    cell.__unsubscribe = (sub) => subs.delete(sub);
    return cell;
  },
  // प्रभाव — a fine-grained effect. Runs fn now, tracking which भाव cells it
  // reads, and re-runs ONLY fn when any of those change. Before each re-run it
  // unsubscribes from its previous dependencies (so conditional reads don't
  // leave stale subscriptions) and re-tracks fresh ones.
  effect(fn) {
    const sub = {
      deps: new Set(),
      cleanups: [],
      run() {
        // run any registered cleanups from the previous run (teardown)
        for (const c of sub.cleanups) { try { c(); } catch (e) {} }
        sub.cleanups = [];
        // drop old subscriptions, then re-track on this run
        for (const cell of sub.deps) if (cell.__unsubscribe) cell.__unsubscribe(sub);
        sub.deps.clear();
        __DB._subStack.push(sub);
        const prevEffect = __DB._activeEffect; __DB._activeEffect = sub;
        try { fn(); } finally { __DB._activeEffect = prevEffect; __DB._subStack.pop(); }
      },
    };
    sub.run();
    return sub;
  },
  _activeEffect: null,
  // सफाई — register a cleanup that runs before the current effect's next run
  // (and could run on disposal). The standard teardown hook for timers/listeners.
  onCleanup(fn) { if (__DB._activeEffect) __DB._activeEffect.cleanups.push(fn); },
  // सूत्र — tag a thunk as a reactive reference so content slots / बन्ध bind it.
  sutra(thunk) { thunk.__isSutra = true; return thunk; },
  // आलस्यचित्रम् — a lazy-loaded image. Renders an img showing the placeholder
  // (or nothing) and swaps in the real src only once it scrolls into view, via
  // IntersectionObserver. opts: { alt, placeholder, rootMargin }. Falls back to
  // eager loading where IntersectionObserver is unavailable.
  lazyImage(src, opts) {
    opts = opts || {};
    const img = document.createElement('img');
    if (opts.alt != null) img.setAttribute('alt', opts.alt);
    if (opts.placeholder) img.setAttribute('src', opts.placeholder);
    img.setAttribute('data-src', src);
    img.setAttribute('loading', 'lazy');           // native hint where supported
    const load = () => { if (img.getAttribute('src') !== src) img.setAttribute('src', src); };
    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { load(); io.unobserve(img); }
        }
      }, { rootMargin: opts.rootMargin || '200px' });
      io.observe(img);
    } else {
      load();                                       // no observer → load now
    }
    return img;
  },
  // bindText — fine-grained: a text node whose content is produced by thunk();
  // only this node's text updates when the thunk's dependencies change.
  bindText(thunk) {
    const node = document.createTextNode('');
    __DB.effect(() => { node.textContent = String(thunk()); });
    return node;
  },
  // आवली — keyed list reconciliation. dataThunk() returns the current array;
  // keyFn(item, i) gives a STABLE identity; renderFn(item, i) builds a node for
  // a new key. Wrapped in an effect, so it re-runs when the data signal changes.
  // On each run it reuses the DOM nodes of surviving keys (preserving their
  // state/focus), creates nodes for new keys, removes vanished ones, and
  // reorders children to match the new sequence — without rebuilding everything.
  keyedList(dataThunk, keyFn, renderFn) {
    const host = document.createElement('div');
    host.style.display = 'contents';      // transparent wrapper, no layout box
    let prev = new Map();                  // key → node (from the last run)
    __DB.effect(() => {
      const items = dataThunk() || [];
      const next = new Map();
      const ordered = [];
      items.forEach((item, i) => {
        const k = String(keyFn(item, i));
        let node = prev.get(k);
        if (node === undefined) node = renderFn(item, i);   // new key → build
        next.set(k, node);
        ordered.push(node);
      });
      // remove nodes whose key vanished
      for (const [k, node] of prev) {
        if (!next.has(k) && node.parentNode === host) host.removeChild(node);
      }
      // place nodes in the new order (reusing/moving existing ones)
      let ref = null;                       // insert before the previous sibling
      for (let i = ordered.length - 1; i >= 0; i--) {
        const node = ordered[i];
        if (node.nextSibling !== ref || node.parentNode !== host) host.insertBefore(node, ref);
        ref = node;
      }
      prev = next;
    });
    return host;
  },
  view(container, viewFn) {
    const host = container ? (typeof container === 'string' ? document.querySelector(container) : container) : document.body;
    const render = () => {
      __DB._subStack.push(render);
      let out;
      try { out = viewFn(); } finally { __DB._subStack.pop(); }
      host.innerHTML = '';
      const append = c => {
        if (c == null) return;
        if (Array.isArray(c)) { c.forEach(append); return; }
        host.append(c instanceof Node ? c : document.createTextNode(String(c)));
      };
      append(out);
    };
    render();
    return host;
  },
  // ----- timing & input (for animation loops / games) -----
  interval(fn, ms) { return setInterval(fn, ms); },
  clearTimer(id) { clearInterval(id); },
  onKey(fn) {
    const h = (e) => fn(e.key);
    document.addEventListener('keydown', h);
    return h;
  }
};
`;

export function generate(ast, { includeRuntime = true, withMeta = false, sourceMap = false } = {}) {
  let out = '';
  // output position tracking (for source maps)
  let outLine = 0;   // 0-based
  let outCol = 0;    // 0-based
  const emit = (s) => {
    out += s;
    // advance the output cursor
    let nl = -1, from = 0, count = 0, last = -1;
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) { count++; last = i; }
    if (count === 0) { outCol += s.length; }
    else { outLine += count; outCol = s.length - last - 1; }
  };
  // collected mappings: { genLine, genCol, srcLine (1-based), srcCol (1-based) }
  const mappings = [];
  const recordMapping = (node) => {
    if (!sourceMap || !node || node.line == null) return;
    mappings.push({ genLine: outLine, genCol: outCol, srcLine: node.line, srcCol: node.col || 1 });
  };
  // names declared with भाव are reactive cells: reads → x(), writes → x(v)
  const stateNames = new Set();
  // true while generating a दृश्य body (coarse re-render owns updates there)
  let inView = false;
  // does an expression read any भाव cell? If so, a रचय content slot bound to it
  // is DYNAMIC and gets compiled to a fine-grained thunk (auto बन्ध) instead of
  // an eagerly-evaluated value. A function expression's body is its own scope —
  // we don't descend into it (an event handler reading state isn't a text dep).
  function readsState(n) {
    if (!n || typeof n !== 'object') return false;
    if (n.type === 'Identifier') return stateNames.has(n.name);
    if (n.type === 'FuncExpr' || n.type === 'FuncDecl') return false;
    for (const k of Object.keys(n)) {
      if (k === 'line' || k === 'col' || k === 'namePos' || k === 'paramPos') continue;
      const v = n[k];
      if (Array.isArray(v)) { if (v.some(readsState)) return true; }
      else if (v && typeof v === 'object' && v.type) { if (readsState(v)) return true; }
    }
    return false;
  }
  // module metadata collected during codegen
  const exports = [];
  const imports = [];
  // names bound to imported namespaces (आयात * रूपेण ग): member access on
  // these uses id(prop), not the stdlib method tables.
  const namespaceAliases = new Set();
  // async-context depth: प्रतीक्षा (await) is only valid when > 0
  let asyncDepth = 0;
  // unique temp counter for pattern-matching विकल्प (each holds the evaluated
  // discriminant in its own block-scoped const, so nested matches don't clash)
  let matchCounter = 0;
  // उद्धृ (Result-propagation): a unique temp per unwrap, and the current
  // function nesting depth — उद्धृ's early-return needs an enclosing कार्य.
  let uddhrCounter = 0;
  let funcDepth = 0;
  // inside a रूप style-value expression: bare color/style words → CSS literals
  let inStyleValue = false;

  // Collect the उद्धृ nodes inside ONE statement's own expression, in
  // post-order (inner unwraps first) — but NOT descending into a nested
  // function, whose उद्धृ propagates out of THAT function, not this one.
  function collectUddhr(node, out) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FuncExpr' || node.type === 'FuncDecl') return;
    if (node.type === 'Uddhr') { collectUddhr(node.argument, out); out.push(node); return; }
    for (const k of Object.keys(node)) {
      if (k === '_temp' || k === 'line' || k === 'col') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(x => collectUddhr(x, out));
      else if (v && typeof v === 'object') collectUddhr(v, out);
    }
  }

  // A statement's OWN expression fields — the ones that evaluate as part of
  // the statement itself, NOT the nested-statement bodies (an If's branches, a
  // loop body), which are separate statements that hoist their own उद्धृ.
  const OWN_EXPR_FIELDS = {
    VarDecl: ['init'], Return: ['argument'], ExpressionStatement: ['expression'],
    Print: ['args'], If: ['test'], While: ['test'], ForOf: ['iterable'], Switch: ['discriminant'],
  };

  // Before a statement that contains उद्धृ, emit its guards: evaluate each
  // परिणाम once into a temp and short-circuit-return the विफलम् — then the
  // उद्धृ expression itself compiles to that temp's मूल्यम् (see genExpr).
  function hoistStmtUddhr(node, indent) {
    const fields = OWN_EXPR_FIELDS[node.type];
    if (!fields) return;
    const ups = [];
    for (const f of fields) {
      const v = node[f];
      if (Array.isArray(v)) v.forEach(x => collectUddhr(x, ups));
      else if (v) collectUddhr(v, ups);
    }
    if (!ups.length) return;
    if (funcDepth === 0)
      throw new DevabhashaError('उद्धृदोषः: उद्धृ (Result-propagation) is only valid inside a कार्य (function)',
        { line: ups[0].line, col: ups[0].col, kind: 'codegen' });
    for (const u of ups) {
      u._temp = `__u${uddhrCounter++}`;
      emit(`const ${u._temp} = `); genExpr(u.argument); emit(`;\n${indent}`);
      emit(`if (!${u._temp} || ${u._temp}["सफल"] !== true) return ${u._temp};\n${indent}`);
    }
  }

  function gen(node, indent = '') {
    switch (node.type) {
      case 'Program':
        node.body.forEach(s => { emit(indent); genStatement(s, indent); emit('\n'); });
        break;
      default:
        genStatement(node, indent);
    }
  }

  function genStatement(node, indent) {
    recordMapping(node);
    hoistStmtUddhr(node, indent);   // Result-propagation guards, if any (else no-op)
    switch (node.type) {
      case 'VarDecl': {
        const kw = node.kind === 'CONST' ? 'const' : 'let';
        if (node.pattern) {
          // destructuring: [अ,ब] → [a, b] ; { कुञ्जी, अन्या: उपनाम } → { kuñjī: kuñjī, anyā: upanāma }
          if (node.pattern.kind === 'array') {
            emit(`${kw} [${node.pattern.names.map(n => id(n.name)).join(', ')}]`);
          } else {
            // object keys are stored raw (कोष emits { "नाम": … }), so extract
            // by the raw Sanskrit key and bind the transliterated local.
            const parts = node.pattern.props.map(p => `${JSON.stringify(p.key)}: ${id(p.alias)}`);
            emit(`${kw} { ${parts.join(', ')} }`);
          }
          emit(' = '); genExpr(node.init); emit(';');
          break;
        }
        emit(`${kw} ${id(node.name)}`);
        if (node.init) { emit(' = '); genExpr(node.init); }
        emit(';');
        break;
      }
      case 'StyleDecl': {
        // रूपनाम X = रूप {...}  →  const X = { ...translated style... };
        emit(`const ${id(node.name)} = `);
        emitStyleObject(node.pairs);
        emit(';');
        break;
      }
      case 'StateDecl': {
        // भाव x = init  →  const x = __DB.state(init);
        stateNames.add(node.name);
        emit(`const ${id(node.name)} = __DB.state(`);
        if (node.init) genExpr(node.init); else emit('undefined');
        emit(');');
        break;
      }
      case 'View': {
        // दृश्य (container) { body }  →  __DB.view(container, () => { … return last });
        // inside a दृश्य the coarse re-render owns updates, so content slots stay
        // eager (no fine-grained binding) to avoid double-updating.
        emit('__DB.view(');
        if (node.container) genExpr(node.container); else emit('null');
        emit(', () => ');
        const savedInView = inView; inView = true;
        genViewBody(node.body, indent);
        inView = savedInView;
        emit(');');
        break;
      }
      case 'Export':
        if (node.reexport) {
          // निर्यात { a, b रूपेण c } आ "म" — forward names from another module.
          // Desugar to (1) record the names as this module's exports, and
          // (2) a synthesized named import that binds them locally from the
          // source, so the existing import-linking + export-object machinery
          // does the rest. Emits nothing inline (like an import).
          for (const n of node.names) exports.push(n);
          imports.push({
            type: 'Import', kind: 'named',
            names: node.names, imported: node.sources, namePos: node.namePos,
            source: node.source, line: node.line, col: node.col,
          });
          break;
        }
        // emit the underlying declaration; the export is recorded as metadata
        exports.push(node.name);
        genStatement(node.decl, indent);
        break;
      case 'Import':
        // imports are resolved by the bundler; record metadata and emit
        // nothing inline (the bundler prepends linked module code).
        imports.push(node);
        if (node.kind === 'namespace') namespaceAliases.add(node.alias);
        break;
      case 'FuncDecl': {
        emit(`${node.async ? 'async ' : ''}function ${id(node.name)}(${node.params.map(id).join(', ')}) `);
        const savedAD = asyncDepth;
        asyncDepth = node.async ? 1 : 0;   // entering a function resets context
        funcDepth++;
        genBlock(node.body, indent);
        funcDepth--;
        asyncDepth = savedAD;
        break;
      }
      case 'Return':
        emit('return');
        if (node.argument) { emit(' '); genExpr(node.argument); }
        emit(';');
        break;
      case 'If':
        emit('if (');
        genExpr(node.test);
        emit(') ');
        genBlock(node.consequent, indent);
        if (node.alternate) {
          emit(' else ');
          if (node.alternate.type === 'If') genStatement(node.alternate, indent);
          else genBlock(node.alternate, indent);
        }
        break;
      case 'While':
        emit('while (');
        genExpr(node.test);
        emit(') ');
        genBlock(node.body, indent);
        break;
      case 'ForOf':
        emit(`for (const ${id(node.item)} of `);
        genExpr(node.iterable);
        emit(') ');
        genBlock(node.body, indent);
        break;
      case 'Switch': {
        // A विकल्प whose स्थिति tests are all plain VALUES compiles to a JS
        // switch (below). A विकल्प that uses any structural PATTERN (an object
        // shape or array) instead compiles to an if/else-if chain that shape-
        // tests the discriminant and binds names — see genMatchChain. Keeping
        // value-only switches on the switch path leaves their output (and the
        // bootstrap fixpoint) byte-for-byte unchanged.
        if (switchHasPattern(node)) { genMatchChain(node, indent); break; }
        // Each branch is self-contained: a block scope + implicit break, so
        // there is no C-style fall-through. Comma-separated tests stack as
        // consecutive `case` labels sharing one body.
        emit('switch (');
        genExpr(node.discriminant);
        emit(') {\n');
        const inner = indent + '  ';
        const bodyIndent = inner + '  ';
        for (const c of node.cases) {
          if (c.tests) {
            c.tests.forEach((t, i) => {
              emit(inner + 'case '); genExpr(t);
              emit(i === c.tests.length - 1 ? ': {\n' : ':\n');
            });
          } else {
            emit(inner + 'default: {\n');
          }
          c.body.forEach(s => { emit(bodyIndent); genStatement(s, bodyIndent); emit('\n'); });
          emit(bodyIndent + 'break;\n');
          emit(inner + '}\n');
        }
        emit(indent + '}');
        break;
      }
      case 'Break': emit('break;'); break;
      case 'Continue': emit('continue;'); break;
      case 'Print':
        emit('console.log(');
        node.args.forEach((a, i) => { if (i) emit(', '); genExpr(a); });
        emit(');');
        break;
      case 'Block':
        genBlock(node, indent);
        break;
      case 'ExpressionStatement':
        genExpr(node.expression);
        emit(';');
        break;
      default:
        throw new Error(`codegen: unknown statement ${node.type}`);
    }
  }

  function genBlock(block, indent) {
    const inner = indent + '  ';
    emit('{\n');
    block.body.forEach(s => { emit(inner); genStatement(s, inner); emit('\n'); });
    emit(indent + '}');
  }

  // ---- pattern-matching विकल्प ----
  const isMatchPattern = t => t && (t.type === 'MatchObject' || t.type === 'MatchArray');
  const switchHasPattern = node =>
    node.cases.some(c => (c.tests || []).some(isMatchPattern));

  // Emit the boolean shape-test for one स्थिति test against `access` (a JS
  // expression string for the value being matched — the discriminant temp at
  // top level, or an element/field accessor when recursing into a nested
  // pattern). A plain value test is a === comparison.
  function emitMatchTest(t, access) {
    if (t.type === 'MatchObject') {
      emit(`(${access} != null && typeof ${access} === "object"`);
      for (const p of t.props) {
        const field = `${access}[${JSON.stringify(p.key)}]`;
        if (p.kind === 'const') { emit(` && ${field} === `); genExpr(p.value); }
        else if (p.kind === 'nested') { emit(' && '); emitMatchTest(p.sub, field); }
        else emit(` && ${JSON.stringify(p.key)} in ${access}`);   // a binding requires the key
      }
      emit(')');
    } else if (t.type === 'MatchArray') {
      const cmp = t.rest ? '>=' : '===';
      emit(`(Array.isArray(${access}) && ${access}.length ${cmp} ${t.elements.length}`);
      t.elements.forEach((e, i) => {
        const at = `${access}[${i}]`;
        if (e.kind === 'const') { emit(` && ${at} === `); genExpr(e.value); }
        else if (e.kind === 'nested') { emit(' && '); emitMatchTest(e.sub, at); }
      });
      emit(')');
    } else {
      emit(`${access} === `); genExpr(t);
    }
  }

  // Emit `const <name> = <access>;` for every binding a pattern introduces,
  // recursing into nested patterns and honouring an array rest (a .slice of the
  // tail). `seen` dedupes names bound by more than one alternative in a case.
  function emitPatternBinds(pat, access, bodyIndent, seen) {
    if (pat.type === 'MatchObject') {
      for (const p of pat.props) {
        const field = `${access}[${JSON.stringify(p.key)}]`;
        if (p.kind === 'bind' && !seen.has(p.name)) {
          seen.add(p.name); emit(`${bodyIndent}const ${id(p.name)} = ${field};\n`);
        } else if (p.kind === 'nested') emitPatternBinds(p.sub, field, bodyIndent, seen);
      }
    } else if (pat.type === 'MatchArray') {
      pat.elements.forEach((e, i) => {
        const at = `${access}[${i}]`;
        if (e.kind === 'bind' && !seen.has(e.name)) {
          seen.add(e.name); emit(`${bodyIndent}const ${id(e.name)} = ${at};\n`);
        } else if (e.kind === 'nested') emitPatternBinds(e.sub, at, bodyIndent, seen);
      });
      if (pat.rest && !seen.has(pat.rest.name)) {
        seen.add(pat.rest.name);
        emit(`${bodyIndent}const ${id(pat.rest.name)} = ${access}.slice(${pat.elements.length});\n`);
      }
    }
  }

  function emitMatchBinds(tests, disc, bodyIndent) {
    const seen = new Set();
    for (const t of tests) if (isMatchPattern(t)) emitPatternBinds(t, disc, bodyIndent, seen);
  }

  // Compile a pattern-bearing विकल्प to an if/else-if chain. The discriminant is
  // evaluated once into a block-scoped temp; the अन्यथा (default) branch, wher-
  // ever it appears in source, becomes the trailing else. Branches stay self-
  // contained (first match wins), matching the value switch's no-fall-through.
  function genMatchChain(node, indent) {
    const inner = indent + '  ';
    const bodyIndent = inner + '  ';
    const disc = `__match${matchCounter++}`;
    emit('{\n');
    emit(`${inner}const ${disc} = `); genExpr(node.discriminant); emit(';\n');
    let started = false, def = null;
    for (const c of node.cases) {
      if (!c.tests) { def = c; continue; }          // hold the default for last
      emit(inner + (started ? 'else if (' : 'if ('));
      started = true;
      c.tests.forEach((t, i) => { if (i) emit(' || '); emitMatchTest(t, disc); });
      emit(') {\n');
      emitMatchBinds(c.tests, disc, bodyIndent);
      c.body.forEach(s => { emit(bodyIndent); genStatement(s, bodyIndent); emit('\n'); });
      emit(inner + '}\n');
    }
    if (def) {
      emit(inner + (started ? 'else {\n' : '{\n'));
      def.body.forEach(s => { emit(bodyIndent); genStatement(s, bodyIndent); emit('\n'); });
      emit(inner + '}\n');
    }
    emit(indent + '}');
  }

  // A view body: like a block, but the LAST statement, if it's an expression,
  // becomes the returned value (the thing to render).
  function genViewBody(block, indent) {
    const inner = indent + '  ';
    emit('{\n');
    block.body.forEach((s, i) => {
      const last = i === block.body.length - 1;
      emit(inner);
      if (last && s.type === 'ExpressionStatement') {
        emit('return ');
        genExpr(s.expression);
        emit(';');
      } else {
        genStatement(s, inner);
      }
      emit('\n');
    });
    emit(indent + '}');
  }

  // emit a { } object literal from रूप (key, value) pairs, translating
  // Sanskrit property names and known value words into CSS.
  // emit a style object for the given pairs. Static pairs go into a plain
  // object; pairs whose value reads a भाव cell (outside a view) are emitted
  // separately as styleBind thunks so the runtime updates just that property
  // fine-grained. Returns { hasStatic, hasBind } so the caller can wire slots.
  function partitionStylePairs(pairs) {
    const staticPairs = [], bindPairs = [];
    for (const p of pairs) {
      let dynamic = false;
      if (!inView) {
        if (p.value.kind === 'word') {
          // a bare identifier that is a भाव cell (and not a style keyword) is dynamic
          dynamic = stateNames.has(p.value.value) && !isStyleWord(p.value.value);
        } else {
          dynamic = readsState(p.value.value);
        }
      }
      (dynamic ? bindPairs : staticPairs).push(p);
    }
    return { staticPairs, bindPairs };
  }
  function emitStylePair(p) {
    emit(JSON.stringify(styleProp(p.key)));
    emit(': ');
    if (p.value.kind === 'word') {
      if (isStyleWord(p.value.value)) emit(JSON.stringify(styleValue(p.value.value)));
      else emit(id(p.value.value));
    } else {
      const saved = inStyleValue; inStyleValue = true;
      genExpr(p.value.value);
      inStyleValue = saved;
    }
  }
  function emitStyleObject(pairs) {
    emit('{ ');
    pairs.forEach((p, i) => { if (i) emit(', '); emitStylePair(p); });
    emit(' }');
  }
  // a styleBind object: { "prop": () => (value), ... } — each a reactive thunk
  function emitStyleBindObject(pairs) {
    emit('{ ');
    pairs.forEach((p, i) => {
      if (i) emit(', ');
      emit(JSON.stringify(styleProp(p.key)));
      emit(': () => (');
      const saved = inStyleValue; inStyleValue = true;
      if (p.value.kind === 'word') {
        // a bare state identifier → its reactive read (cell())
        if (isStyleWord(p.value.value) && !stateNames.has(p.value.value)) emit(JSON.stringify(styleValue(p.value.value)));
        else emit(id(p.value.value) + '()');
      } else {
        genExpr(p.value.value);
      }
      inStyleValue = saved;
      emit(')');
    });
    emit(' }');
  }

  function genExpr(node) {
    switch (node.type) {
      case 'Number': emit(node.value); break;
      case 'String': emit(JSON.stringify(unescapeStr(node.value))); break;
      case 'Template': {
        // string interpolation → a JS template literal
        const esc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
        emit('`');
        emit(esc(unescapeStr(node.chunks[0])));
        node.parts.forEach((p, idx) => {
          emit('${');
          genExpr(p);
          emit('}');
          emit(esc(unescapeStr(node.chunks[idx + 1] ?? '')));
        });
        emit('`');
        break;
      }
      case 'Boolean': emit(node.value ? 'true' : 'false'); break;
      case 'Null': emit('null'); break;
      case 'Identifier': {
        // inside a रूप style-value expression, a known color/style word is a
        // CSS literal (so ternaries like  सक्रियः ? रक्तः : धूसरः  work)
        if (inStyleValue && isStyleWord(node.name) && !stateNames.has(node.name)) {
          emit(JSON.stringify(styleValue(node.name)));
          break;
        }
        // a भाव state cell reads as x(); a Sanskrit global builtin
        // (संकेताक्षर → String.fromCharCode); else an ordinary identifier
        if (stateNames.has(node.name)) { emit(id(node.name) + '()'); break; }
        const g = GLOBALS[node.name];
        emit(g !== undefined ? g : id(node.name));
        break;
      }
      case 'FuncExpr': {
        emit(`${node.async ? 'async ' : ''}function (${node.params.map(id).join(', ')}) `);
        const savedAD = asyncDepth;
        asyncDepth = node.async ? 1 : 0;
        funcDepth++;
        genBlock(node.body, '');
        funcDepth--;
        asyncDepth = savedAD;
        break;
      }
      case 'Uddhr':
        // set by hoistStmtUddhr before this statement; the guard already ran.
        if (!node._temp)
          throw new DevabhashaError('उद्धृदोषः: उद्धृ (Result-propagation) cannot be used in this position',
            { line: node.line, col: node.col, kind: 'codegen' });
        emit(`${node._temp}["मूल्यम्"]`);
        break;
      case 'Await':
        if (asyncDepth === 0) {
          throw new DevabhashaError('प्रतीक्षादोषः: प्रतीक्षा (await) is only valid inside an असमकालिक (async) function',
            { line: node.line, col: node.col, kind: 'codegen' });
        }
        emit('await '); genExpr(node.argument);
        break;
      case 'Array':
        emit('[');
        node.elements.forEach((e, i) => { if (i) emit(', '); genExpr(e); });
        emit(']');
        break;
      case 'Binary':
        emit('('); genExpr(node.left); emit(` ${node.op} `); genExpr(node.right); emit(')');
        break;
      case 'Unary':
        emit(node.op); genExpr(node.argument);
        break;
      case 'Assign':
        // a भाव state cell write: x = v  →  x(v)
        if (node.target.type === 'Identifier' && stateNames.has(node.target.name)) {
          emit(id(node.target.name) + '('); genExpr(node.value); emit(')');
        } else {
          genExpr(node.target); emit(' = '); genExpr(node.value);
        }
        break;
      case 'Ternary':
        emit('('); genExpr(node.test); emit(' ? ');
        genExpr(node.consequent); emit(' : ');
        genExpr(node.alternate); emit(')');
        break;
      case 'OrElse':
        // result अथवा fallback → __RT.orElse(result, () => (fallback))
        // (lazy thunk; parens so an object-literal fallback isn't read as a block)
        emit('__RT.orElse(');
        genExpr(node.value);
        emit(', () => (');
        genExpr(node.fallback);
        emit('))');
        break;
      case 'Sutra':
        // सूत्र(expr) → a tagged reactive thunk; components bind it fine-grained
        emit('__DB.sutra(() => (');
        genExpr(node.expr);
        emit('))');
        break;
      case 'Update':
        // postfix ++/--; for a भाव cell: x++  →  x(x() + 1)
        if (node.target.type === 'Identifier' && stateNames.has(node.target.name)) {
          const nm = id(node.target.name);
          emit(`${nm}(${nm}() ${node.op === '++' ? '+' : '-'} 1)`);
        } else {
          genExpr(node.target); emit(node.op);
        }
        break;
      case 'Call':
        genExpr(node.callee);
        emit('(');
        node.args.forEach((a, i) => { if (i) emit(', '); genExpr(a); });
        emit(')');
        break;
      case 'Member':
        // namespace member (आयात * रूपेण ग → ग.पाई) uses the export key id(),
        // bypassing the stdlib method/constant tables.
        if (!node.computed && node.object.type === 'Identifier'
            && namespaceAliases.has(node.object.name)) {
          emit(id(node.object.name));
          emit(`[${JSON.stringify(id(node.property))}]`);
          break;
        }
        genExpr(node.object);
        if (node.computed) { emit('['); genExpr(node.property); emit(']'); }
        else {
          // translate Sanskrit stdlib names → JS; pass through otherwise
          const jsName = METHODS[node.property] || PROPERTIES[node.property]
            || MATH_CONSTANTS[node.property] || node.property;
          emit(`.${jsName}`);
        }
        break;
      case 'ObjectLiteral':
        emit('{ ');
        node.props.forEach((p, i) => {
          if (i) emit(', ');
          emit(JSON.stringify(p.key.value)); emit(': '); genExpr(p.value);
        });
        emit(' }');
        break;
      case 'ElementExpr':
        emit('__DB.el(');
        node.args.forEach((a, i) => { if (i) emit(', '); genExpr(a); });
        emit(')');
        break;
      case 'Construct': {
        // Assemble from role slots; order in source is irrelevant.
        const s = node.slots;
        // बहुवचन / द्विवचन कर्तृ → constructGroup: the tag distributes over the
        // समास children (one element per child), sharing the other kāraka slots.
        // Returns an array of nodes. A द्विवचन (dual) is the same group builder —
        // the grammar asserts a pair (checked in semantic analysis); a बहुवचन is
        // any number. Same slot syntax, different builder.
        emit((node.plural || node.dual) ? '__DB.constructGroup({ tag: ' : '__DB.construct({ tag: ');
        genExpr(s.tag);
        if (s.content) {
          if (!inView && readsState(s.content)) {
            // dynamic content outside a दृश्य → fine-grained: bind only this node
            emit(', contentBind: () => ('); genExpr(s.content); emit(')');
          } else {
            emit(', content: '); genExpr(s.content);
          }
        }
        if (s.event)   { emit(', event: ');   genExpr(s.event); }
        if (s.handler) { emit(', handler: '); genExpr(s.handler); }
        if (s.parent)  { emit(', parent: ');  genExpr(s.parent); }
        if (s.prop)    { emit(', prop: ');    genExpr(s.prop); }
        if (s.source)  { emit(', source: ');  genExpr(s.source); }
        // रूप style: optional named base merged with translated inline pairs.
        // Dynamic pairs (reading भाव cells, outside a view) become fine-grained
        // styleBind thunks; static pairs stay a plain object (zero overhead).
        if (node.style && (node.style.base || (node.style.pairs && node.style.pairs.length))) {
          const { base, pairs } = node.style;
          const { staticPairs, bindPairs } = partitionStylePairs(pairs || []);
          if (base || staticPairs.length) {
            emit(', style: ');
            if (base) {
              emit('Object.assign({}, ');
              genExpr(base);
              if (staticPairs.length) { emit(', '); emitStyleObject(staticPairs); }
              emit(')');
            } else {
              emitStyleObject(staticPairs);
            }
          }
          if (bindPairs.length) { emit(', styleBind: '); emitStyleBindObject(bindPairs); }
        }
        // समास children: a sibling list of nested elements / text
        if (node.children && node.children.length) {
          emit(', children: [');
          node.children.forEach((c, i) => { if (i) emit(', '); genExpr(c); });
          emit(']');
        }
        emit(' })');
        break;
      }
      case 'Mount':
        emit('__DB.mount(');
        node.args.forEach((a, i) => { if (i) emit(', '); genExpr(a); });
        emit(')');
        break;
      case 'Listen':
        emit('__DB.listen(');
        node.args.forEach((a, i) => { if (i) emit(', '); genExpr(a); });
        emit(')');
        break;
      default:
        throw new Error(`codegen: unknown expression ${node.type}`);
    }
  }

  if (includeRuntime) emit(PRELUDE + RUNTIME + '\n');
  gen(ast);

  if (sourceMap || withMeta) {
    const result = { code: out, exports, imports };
    if (sourceMap) result.map = buildSourceMap(mappings, out);
    return result;
  }
  return out;
}

// ----- Source Map v3 (VLQ-encoded) -----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function vlqEncode(num) {
  let vlq = num < 0 ? ((-num) << 1) | 1 : num << 1;
  let out = '';
  do {
    let digit = vlq & 0b11111;
    vlq >>>= 5;
    if (vlq > 0) digit |= 0b100000;
    out += B64[digit];
  } while (vlq > 0);
  return out;
}

// Build a standard Source Map v3 object from statement-level mappings.
// `mappings` entries are 0-based genLine/genCol with 1-based source line/col.
function buildSourceMap(mappings, code, { file = 'out.js', source = 'input.deva' } = {}) {
  // group by generated line, sort by generated column
  const byLine = new Map();
  for (const m of mappings) {
    if (!byLine.has(m.genLine)) byLine.set(m.genLine, []);
    byLine.get(m.genLine).push(m);
  }
  const totalLines = code.split('\n').length;

  // VLQ deltas are relative to previous values across the whole file:
  //   [genColDelta, sourceIndexDelta, srcLineDelta, srcColDelta]
  let prevGenCol = 0, prevSrcLine = 0, prevSrcCol = 0;
  const lineStrings = [];
  for (let line = 0; line < totalLines; line++) {
    const segs = (byLine.get(line) || []).sort((a, b) => a.genCol - b.genCol);
    prevGenCol = 0; // generated column resets each output line
    const parts = [];
    for (const m of segs) {
      const seg =
        vlqEncode(m.genCol - prevGenCol) +
        vlqEncode(0) +                          // single source, index 0
        vlqEncode((m.srcLine - 1) - prevSrcLine) +
        vlqEncode((m.srcCol - 1) - prevSrcCol);
      prevGenCol = m.genCol;
      prevSrcLine = m.srcLine - 1;
      prevSrcCol = m.srcCol - 1;
      parts.push(seg);
    }
    lineStrings.push(parts.join(','));
  }

  return {
    version: 3,
    file,
    sources: [source],
    names: [],
    mappings: lineStrings.join(';'),
  };
}

// Identifiers are transliterated to stable ASCII so the generated JS is
// portable and debuggable. The mapping is deterministic, so the same
// Sanskrit name always yields the same JS name (declaration == call site).
const TRANSLIT = {
  // independent vowels
  'अ':'a','आ':'aa','इ':'i','ई':'ii','उ':'u','ऊ':'uu','ऋ':'ri','ॠ':'rii',
  'ऌ':'li','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
  // consonants (inherent 'a')
  'क':'ka','ख':'kha','ग':'ga','घ':'gha','ङ':'nga',
  'च':'ca','छ':'cha','ज':'ja','झ':'jha','ञ':'nya',
  'ट':'tta','ठ':'ttha','ड':'dda','ढ':'ddha','ण':'nna',
  'त':'ta','थ':'tha','द':'da','ध':'dha','न':'na',
  'प':'pa','फ':'pha','ब':'ba','भ':'bha','म':'ma',
  'य':'ya','र':'ra','ल':'la','व':'va','श':'sha','ष':'ssa','स':'sa','ह':'ha',
  'ळ':'lla',
  // dependent vowel signs (matras) — replace the inherent 'a'
  '\u093E':'aa','\u093F':'i','\u0940':'ii','\u0941':'u','\u0942':'uu',
  '\u0943':'ri','\u0947':'e','\u0948':'ai','\u094B':'o','\u094C':'au',
  // anusvara / visarga / chandrabindu
  '\u0902':'m','\u0903':'h','\u0901':'n',
};
const VIRAMA = '\u094D';

export function id(name) {
  let result = '';
  const chars = [...name];
  for (let k = 0; k < chars.length; k++) {
    const ch = chars[k];
    if (/[A-Za-z0-9_$]/.test(ch)) { result += ch; continue; }
    if (ch === VIRAMA) {
      // virama removes the inherent 'a' of the preceding consonant
      if (result.endsWith('a')) result = result.slice(0, -1);
      continue;
    }
    const next = chars[k + 1];
    const map = TRANSLIT[ch];
    if (map !== undefined) {
      // a matra replaces the inherent 'a' just emitted for the consonant
      if (/[\u093E-\u094C]/.test(ch) && result.endsWith('a')) {
        result = result.slice(0, -1) + map;
      } else {
        result += map;
      }
    } else {
      result += '_u' + ch.codePointAt(0).toString(16);
    }
  }
  if (/^[0-9]/.test(result)) result = '_' + result;
  // A transliterated name might collide with a JS reserved word
  // (e.g. दो → "do"). Suffix an underscore to keep it a valid identifier.
  if (JS_RESERVED.has(result)) result = result + '_';
  return result || '_';
}

const JS_RESERVED = new Set([
  'do','if','in','for','new','var','let','try','case','else','enum','eval',
  'null','this','true','void','with','break','catch','class','const','false',
  'super','throw','while','yield','delete','export','import','return','switch',
  'typeof','default','extends','finally','continue','debugger','function',
  'arguments','await','async','instanceof',
]);

function unescapeStr(s) {
  return s
    .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    .replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}
