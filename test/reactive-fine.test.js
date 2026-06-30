// reactive-fine.test.js — fine-grained reactivity: प्रभाव (effect) and बन्ध
// (bindText). Effects track exactly the भाव cells they read and re-run only
// when those change; bound text nodes update in place (no view rebuild).
import { compile } from '../src/index.js';
import { id } from '../src/codegen.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

// a faithful mirror of the runtime's reactive core (state/effect/bindText)
function makeDB(documentImpl) {
  const __DB = {
    _subStack: [],
    _currentSub() { return __DB._subStack.length ? __DB._subStack[__DB._subStack.length - 1] : null; },
    state(initial) {
      let value = initial; const subs = new Set();
      const cell = (...a) => {
        if (a.length === 0) { const s = __DB._currentSub(); if (s) { subs.add(s); if (s.deps) s.deps.add(cell); } return value; }
        const next = a[0]; if (next === value && (next === null || typeof next !== 'object')) return value;
        value = next; for (const s of Array.from(subs)) { if (typeof s === 'function') s(); else if (s && s.run) s.run(); } return value;
      };
      cell.__isState = true; cell.__unsubscribe = (s) => subs.delete(s); return cell;
    },
    effect(fn) {
      const sub = { deps: new Set(), run() {
        for (const c of sub.deps) if (c.__unsubscribe) c.__unsubscribe(sub);
        sub.deps.clear(); __DB._subStack.push(sub); try { fn(); } finally { __DB._subStack.pop(); }
      } };
      sub.run(); return sub;
    },
    bindText(thunk) { const node = documentImpl.createTextNode(''); __DB.effect(() => { node.textContent = String(thunk()); }); return node; },
  };
  return __DB;
}
// run compiled Devabhāṣā with an injected __DB and named externals
function runWith(src, __DB, externals = {}) {
  const names = Object.keys(externals).map(id);
  new Function('__DB', ...names, compile(src, { includeRuntime: false }))(__DB, ...Object.values(externals));
}

// ---------- compilation ----------
ok('प्रभाव → __DB.effect', compile('प्रभाव(कार्य(){})।', { includeRuntime: false }).includes('__DB.effect'));
ok('बन्ध → __DB.bindText', compile('बन्ध(कार्य(){ फलम् क। })।', { includeRuntime: false }).includes('__DB.bindText'));

// ---------- effect runs immediately, then on its deps ----------
{
  const __DB = makeDB();
  const log = [];
  runWith(`भाव अ = १।
           प्रभाव(कार्य(){ धर(अ)। })।
           अ = २।
           अ = ३।`, __DB, { 'धर': v => log.push(v) });
  ok('effect runs immediately + on each dep change', log.join(',') === '1,2,3');
}

// ---------- effect does NOT run for cells it didn't read ----------
{
  const __DB = makeDB();
  let runs = 0;
  runWith(`भाव अ = १।
           भाव ब = १०।
           प्रभाव(कार्य(){ चर _ = अ। गण()। })।
           ब = २०।
           ब = ३०।`, __DB, { 'गण': () => runs++ });
  ok('effect ignores unrelated cell writes', runs === 1);
}

// ---------- conditional dependency cleanup (stale-subscription bug) ----------
{
  const __DB = makeDB();
  let runs = 0;
  runWith(`भाव ध्वजः = सत्यम्।
           भाव ब = १००।
           प्रभाव(कार्य(){ गण()। यदि (ध्वजः) { चर _ = ब। } })।
           ब = २००।          # flag on → depends on ब → re-run
           ध्वजः = असत्यम्।    # re-run; no longer reads ब
           ब = ३००।          # flag off → must NOT re-run`, __DB, { 'गण': () => runs++ });
  ok('conditional deps: drops stale subscription', runs === 3);
}

// ---------- multiple independent effects ----------
{
  const __DB = makeDB();
  const log = [];
  runWith(`भाव अ = ०।
           भाव ब = ०।
           प्रभाव(कार्य(){ धर("A" + अ)। })।
           प्रभाव(कार्य(){ धर("B" + ब)। })।
           अ = १।   # only effect A re-runs
           ब = १।   # only effect B re-runs`, __DB, { 'धर': v => log.push(v) });
  ok('independent effects each track own deps',
     log.join(',') === 'A0,B0,A1,B1');
}

// ---------- बन्ध updates the SAME text node in place ----------
{
  const nodes = [];
  const documentImpl = { createTextNode: (t) => ({ textContent: t, __id: nodes.length }) };
  const __DB = makeDB(documentImpl);
  const seen = [];
  runWith(`भाव ग = ०।
           चर नोड = बन्ध(कार्य(){ फलम् "v" + ग। })।
           धर(नोड)।
           ग = ५।
           धर(नोड)।`, __DB, { 'धर': n => seen.push({ text: n.textContent, id: n.__id }) });
  ok('bindText: initial text', seen[0].text === 'v0');
  ok('bindText: updated text', seen[1].text === 'v5');
  ok('bindText: SAME node (in-place, no rebuild)', seen[0].id === seen[1].id);
}

// ---------- a derived/computed effect chains ----------
{
  const __DB = makeDB();
  const log = [];
  runWith(`भाव मूलम् = २।
           भाव द्विगुणम् = ०।
           प्रभाव(कार्य(){ द्विगुणम् = मूलम् * २। })।   # effect writes another cell
           प्रभाव(कार्य(){ धर(द्विगुणम्)। })।             # observes the derived cell
           मूलम् = ५।`, __DB, { 'धर': v => log.push(v) });
  ok('effect-derived cell propagates (2→4, 5→10)', log.join(',') === '4,10');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
