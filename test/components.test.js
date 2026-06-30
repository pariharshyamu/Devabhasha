// components.test.js — the component model: कार्य returning रचय as reusable
// components, with सूत्र(cell) reactive props that update fine-grained across
// the function boundary.
import { compile } from '../src/index.js';
import { id } from '../src/codegen.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- सूत्र compilation ----------
ok('सूत्र → tagged thunk', js('चर s = सूत्र(ग)।').includes('__DB.sutra(() => (')); 
ok('सूत्र does not eagerly read state',
   js('भाव ग = ०। चर s = सूत्र(ग)।').includes('__DB.sutra(() => (ga()))'));
ok('सूत्र over an expression', js('भाव ग = ०। चर s = सूत्र(ग * २)।').includes('(ga() * 2)'));
ok('सूत्र as a call argument stays a thunk',
   js('भाव ग = ०। f(सूत्र(ग))।').includes('f(__DB.sutra('));

// ---------- runtime (jsdom) ----------
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

  // a function returning रचय is a usable component (positional props)
  {
    const seen = [];
    runDom(`कार्य पत्रम् (शी, मू) {
              फलम् रचय मूलः { रचय शीर्षः वाक्यम् शी। रचय वाक्यः वाक्यम् मू। }।
            }
            चर अ = पत्रम्("नाम", "रामः")।
            चर ब = पत्रम्("वयः", "30")।
            धर(अ.textContent)। धर(ब.textContent)।`,
      { 'धर': v => seen.push(v) });
    ok('component: reused with different props', seen[0] === 'नामरामः' && seen[1] === 'वयः30');
  }

  // reactive prop via सूत्र updates fine-grained across the boundary
  {
    const seen = [];
    runDom(`कार्य दर्शकम् (मू) { फलम् रचय शीर्षः वाक्यम् मू।  }
            भाव ग = ०।
            चर द = दर्शकम्(सूत्र(पाठ"v{ग}"))।
            धर(द.textContent)।
            ग = ९।
            धर(द.textContent)।`,
      { 'धर': t => seen.push(t) });
    ok('component: reactive सूत्र prop initial', seen[0] === 'v0');
    ok('component: reactive सूत्र prop updates across boundary', seen[1] === 'v9');
  }

  // two instances of one component with independent reactive props
  {
    const seen = [];
    runDom(`कार्य घटः (मू) { फलम् रचय वाक्यः वाक्यम् मू।  }
            भाव अ = ०।
            भाव ब = ०।
            चर का = घटः(सूत्र(अ))।
            चर खब = घटः(सूत्र(ब))।
            अ = ५।
            धर(का.textContent)। धर(खब.textContent)।`,
      { 'धर': t => seen.push(t) });
    ok('component: instances have independent reactive props',
       seen[0] === '5' && seen[1] === '0');
  }

  // static prop in a component is NOT reactive
  {
    const seen = [];
    runDom(`कार्य घटः (मू) { फलम् रचय वाक्यः वाक्यम् मू।  }
            भाव ग = ०।
            चर द = घटः("स्थिरम्")।
            ग = ५।
            धर(द.textContent)।`,
      { 'धर': t => seen.push(t) });
    ok('component: static prop stays put', seen[0] === 'स्थिरम्');
  }

  // callback prop (passing a function as a prop)
  {
    let fired = 0;
    runDom(`कार्य पटः (कर्म) { चर ब = रचय पटः वाक्यम् "x" स्पर्शाय करणेन कर्म। फलम् ब।  }
            चर b = पटः(कार्य(){ अग्नि()। })।
            b.click()।`,
      { 'अग्नि': () => fired++ });
    ok('component: callback prop wires the handler', fired === 1);
  }
} else {
  console.log('  (jsdom not installed — skipped 6 runtime checks)');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
