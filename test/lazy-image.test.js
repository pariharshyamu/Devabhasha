// lazy-image.test.js — आलस्यचित्रम् (lazy image): renders with a placeholder
// and swaps in the real src only when scrolled into view (IntersectionObserver),
// falling back to eager load where the observer is unavailable.
import { compile } from '../src/index.js';
import { id } from '../src/codegen.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

ok('आलस्यचित्रम् → __DB.lazyImage',
   compile('चर च = आलस्यचित्रम्("a.jpg", कोष{})।', { includeRuntime: false }).includes('__DB.lazyImage'));

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); } catch {}

if (JSDOM) {
  // run with a controllable IntersectionObserver mock
  function run(src, externals = {}, withObserver = true) {
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    global.Node = dom.window.Node;
    let trigger = null;
    const IO = withObserver ? class {
      constructor(cb) { this.cb = cb; }
      observe(el) { trigger = () => this.cb([{ isIntersecting: true, target: el }]); }
      unobserve() {}
    } : undefined;
    const names = Object.keys(externals).map(id);
    new Function('document', 'Node', 'IntersectionObserver', ...names,
      compile(src, { includeRuntime: true }))
      (dom.window.document, dom.window.Node, IO, ...Object.values(externals));
    return () => trigger && trigger();
  }

  // placeholder shown first, real src only after intersection
  {
    let img;
    const fire = run(`चर च = आलस्यचित्रम्("real.jpg", कोष{ placeholder: "ph.gif", alt: "चित्रम्" })।
                      धर(च)।`,
      { 'धर': n => { img = n; } });
    ok('lazy: shows placeholder before view', img.getAttribute('src') === 'ph.gif');
    ok('lazy: real url stashed in data-src', img.getAttribute('data-src') === 'real.jpg');
    ok('lazy: alt set', img.getAttribute('alt') === 'चित्रम्');
    ok('lazy: native loading hint set', img.getAttribute('loading') === 'lazy');
    fire();
    ok('lazy: swaps to real src on intersection', img.getAttribute('src') === 'real.jpg');
  }

  // no placeholder → src empty until intersection
  {
    let img;
    const fire = run(`चर च = आलस्यचित्रम्("pic.png", कोष{})। धर(च)।`, { 'धर': n => { img = n; } });
    ok('lazy: no src before view when no placeholder', !img.getAttribute('src'));
    fire();
    ok('lazy: loads real src on intersection', img.getAttribute('src') === 'pic.png');
  }

  // fallback: no IntersectionObserver → eager load immediately
  {
    let img;
    run(`चर च = आलस्यचित्रम्("eager.jpg", कोष{ placeholder: "p.gif" })। धर(च)।`,
      { 'धर': n => { img = n; } }, /*withObserver*/ false);
    ok('lazy: eager-loads when IntersectionObserver absent', img.getAttribute('src') === 'eager.jpg');
  }
} else {
  console.log('  (jsdom not installed — skipped lazy-image runtime checks)');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
