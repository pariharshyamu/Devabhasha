// reactive-auto.test.js — automatic fine-grained content binding.
//
// रचय ... वाक्यम् पाठ"{x}" with dynamic content (reads a भाव cell), used
// OUTSIDE a दृश्य, compiles to a fine-grained contentBind thunk so only that
// node's text updates. Static content stays eager; content INSIDE a दृश्य
// stays coarse (the view owns updates) to avoid double-binding.
import { compile } from '../src/index.js';
import { id } from '../src/codegen.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- compile-time slot selection ----------
ok('dynamic content outside view → contentBind thunk',
   js('भाव ग = ०। चर न = रचय शीर्षः वाक्यम् पाठ"{ग}"।').includes('contentBind: () => ('));
ok('static content stays eager content',
   js('चर न = रचय शीर्षः वाक्यम् "स्थिरम्"।').includes('content: "स्थिरम्"') &&
   !js('चर न = रचय शीर्षः वाक्यम् "स्थिरम्"।').includes('contentBind'));
ok('non-state expression stays eager',
   !js('चर x = ५। चर न = रचय शीर्षः वाक्यम् पाठ"{x}"।').includes('contentBind'));
ok('dynamic content INSIDE दृश्य stays eager (coarse view owns it)',
   !js('भाव ग = ०। दृश्य { रचय शीर्षः वाक्यम् पाठ"{ग}"। }').includes('contentBind'));
ok('state read in content compiles cell call',
   js('भाव ग = ०। चर न = रचय शीर्षः वाक्यम् पाठ"{ग}"।').includes('ga()'));

// ---------- runtime: automatic in-place update via real runtime + jsdom ----------
let JSDOM;
try { ({ JSDOM } = await import('jsdom')); } catch { /* optional */ }

if (JSDOM) {
  function runDom(src, externals = {}) {
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    global.Node = dom.window.Node;   // runtime references the Node interface
    const names = Object.keys(externals).map(id);
    const fn = new Function('document', ...names, compile(src, { includeRuntime: true }));
    fn(dom.window.document, ...Object.values(externals));
  }

  // dynamic content auto-binds: node text updates in place, same child node
  {
    const seen = [];
    runDom(`भाव ग = ०।
            चर प = रचय मूलः वाक्यम् पाठ"न: {ग}"।
            धर(प)।
            ग = ९।
            धर(प)।`, { 'धर': el => seen.push({ t: el.textContent, c: el.firstChild }) });
    ok('auto-bind: initial text', seen[0].t === 'न: 0');
    ok('auto-bind: updated in place', seen[1].t === 'न: 9');
    ok('auto-bind: same text node (no rebuild)', seen[0].c === seen[1].c);
  }

  // two sibling nodes bound to different cells update independently
  {
    const seen = [];
    runDom(`भाव अ = ०।
            भाव ब = ०।
            चर ना = रचय मूलः वाक्यम् पाठ"A{अ}"।
            चर नब = रचय मूलः वाक्यम् पाठ"B{ब}"।
            अ = १।
            धर(ना)। धर(नब)।`, { 'धर': el => seen.push(el.textContent) });
    ok('independent sibling bindings (A updated, B not)',
       seen[0] === 'A1' && seen[1] === 'B0');
  }

  // static content node is NOT reactive (changing unrelated state leaves it)
  {
    const seen = [];
    runDom(`भाव ग = ०।
            चर प = रचय मूलः वाक्यम् "स्थिरम्"।
            ग = ५।
            धर(प)।`, { 'धर': el => seen.push(el.textContent) });
    ok('static content stays put', seen[0] === 'स्थिरम्');
  }
} else {
  console.log('  (jsdom not installed — skipped 5 runtime checks)');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
