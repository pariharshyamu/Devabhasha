// lifecycle.test.js — step 5: reactive style binding (styleBind) and effect
// cleanup (सफाई / onCleanup), the lifecycle teardown hook.
import { compile } from '../src/index.js';
import { id } from '../src/codegen.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();
const run = src => {
  const logs = [];
  // minimal __DB with state/effect/onCleanup (no DOM needed for cleanup tests)
  const __DB = {
    _subStack: [], _activeEffect: null,
    _currentSub() { return __DB._subStack.length ? __DB._subStack[__DB._subStack.length - 1] : null; },
    state(init) { let v = init; const subs = new Set();
      const c = (...a) => { if (a.length === 0) { const s = __DB._currentSub(); if (s) { subs.add(s); if (s.deps) s.deps.add(c); } return v; }
        const n = a[0]; if (n === v && (n === null || typeof n !== 'object')) return v; v = n;
        for (const s of Array.from(subs)) { if (typeof s === 'function') s(); else if (s && s.run) s.run(); } return v; };
      c.__isState = true; c.__unsubscribe = (s) => subs.delete(s); return c; },
    effect(fn) { const sub = { deps: new Set(), cleanups: [], run() {
        for (const c of sub.cleanups) { try { c(); } catch (e) {} } sub.cleanups = [];
        for (const cell of sub.deps) if (cell.__unsubscribe) cell.__unsubscribe(sub); sub.deps.clear();
        __DB._subStack.push(sub); const pe = __DB._activeEffect; __DB._activeEffect = sub;
        try { fn(); } finally { __DB._activeEffect = pe; __DB._subStack.pop(); } } }; sub.run(); return sub; },
    onCleanup(fn) { if (__DB._activeEffect) __DB._activeEffect.cleanups.push(fn); },
  };
  new Function('__DB', 'console', compile(src, { includeRuntime: false }))(__DB, { log: (...a) => logs.push(a.join(' ')) });
  return logs;
};

// ---------- reactive style: compile-time slot selection ----------
ok('dynamic style (bare cell) → styleBind',
   js('भाव र = "red"। चर न = रचय मूलः रूप { वर्णः: र }।').includes('styleBind: { "color": () => (r'));
ok('dynamic style (expression) → styleBind',
   js('भाव स = सत्यम्। चर न = रचय मूलः रूप { वर्णः: (स ? "a" : "b") }।').includes('styleBind:'));
ok('static style stays plain style (zero overhead)',
   js('चर न = रचय मूलः रूप { वर्णः: नीलः }।').includes('style: { "color": "navy" }') &&
   !js('चर न = रचय मूलः रूप { वर्णः: नीलः }।').includes('styleBind'));
ok('mixed: static prop in style, dynamic in styleBind',
   (() => { const o = js('भाव र = "red"। चर न = रचय मूलः रूप { वर्णः: र, अन्तरालः: "5px" }।');
            return o.includes('style: { "padding": "5px" }') && o.includes('styleBind: { "color"'); })());
ok('style inside दृश्य stays coarse (no styleBind)',
   !js('भाव र = "red"। दृश्य { रचय मूलः रूप { वर्णः: र }। }').includes('styleBind'));

// ---------- reactive style: runtime (jsdom) ----------
let JSDOM;
try { ({ JSDOM } = await import('jsdom')); } catch {}
if (JSDOM) {
  function runDom(src, externals = {}) {
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    global.Node = dom.window.Node;
    const names = Object.keys(externals).map(id);
    new Function('document', 'Node', ...names, compile(src, { includeRuntime: true }))
      (dom.window.document, dom.window.Node, ...Object.values(externals));
  }
  {
    const seen = [];
    runDom(`भाव र = "red"।
            चर प = रचय मूलः रूप { वर्णः: र, अन्तरालः: "8px" }।
            धर(प)।
            र = "blue"।
            धर(प)।`,
      { 'धर': n => seen.push({ color: n.style.color, padding: n.style.padding, node: n }) });
    ok('reactive style: initial value', seen[0].color === 'red');
    ok('reactive style: updates in place', seen[1].color === 'blue' && seen[0].node === seen[1].node);
    ok('reactive style: static property preserved', seen[1].padding === '8px');
  }
} else {
  console.log('  (jsdom not installed — skipped 3 style runtime checks)');
}

// ---------- effect cleanup (सफाई) ----------
ok('सफाई → __DB.onCleanup', js('प्रभाव(कार्य(){ सफाई(कार्य(){})। })।').includes('__DB.onCleanup'));
{
  const logs = run(`भाव अ = १।
                    चर लॉग = []।
                    प्रभाव(कार्य(){
                        चर म = अ।
                        लॉग.योजय("up" + म)।
                        सफाई(कार्य(){ लॉग.योजय("down" + म)। })।
                    })।
                    अ = २।
                    अ = ३।
                    दर्शय(लॉग.सम्मील(","))।`);
  ok('cleanup runs before each re-run with captured value',
     logs[0] === 'up1,down1,up2,down2,up3');
}
{
  // cleanup only fires for effects that re-run (no spurious teardown)
  const logs = run(`भाव अ = ०।
                    भाव ब = ०।
                    चर लॉग = []।
                    प्रभाव(कार्य(){ चर _ = अ। सफाई(कार्य(){ लॉग.योजय("c")। })। })।
                    ब = ९।
                    दर्शय(लॉग.दीर्घता)।`);
  ok('cleanup does not fire when effect did not re-run', logs[0] === '0');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
