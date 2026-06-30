// reactive.test.js — भाव (reactive state) + दृश्य (auto-re-rendering views).
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- compilation ----------
ok('भाव → __DB.state', js('भाव x = ०।') === 'const x = __DB.state(0);');
ok('भाव read → x()',
   js('भाव x = ०। दर्शय(x)।').includes('console.log(x())'));
ok('भाव write → x(v)',
   js('भाव x = ०। x = ५।').includes('x(5)'));
ok('भाव ++ → x(x()+1)',
   js('भाव x = ०। x++।').includes('x(x() + 1)'));
ok('भाव += desugars through state',
   js('भाव x = ०। x += ३।').replace(/\s/g, '').includes('x((x()+3))'));
ok('दृश्य → __DB.view',
   js('दृश्य { दर्शय("x")। }').includes('__DB.view(null, () =>'));
ok('दृश्य with container',
   js('दृश्य ("#app") { दर्शय("x")। }').includes('__DB.view("#app"'));
ok('view body returns last expression',
   js('भाव x=०। दृश्य { x + १ }').includes('return (x() + 1)'));

// non-state variables are unaffected
ok('plain variable not wrapped',
   js('चर y = ५। दर्शय(y)।').includes('console.log(y)') &&
   !js('चर y = ५। दर्शय(y)।').includes('y()'));

// ---------- runtime mechanism (via a DOM shim) ----------
function runtimeWith(srcBody) {
  // build the runtime and return __DB plus a fake document
  const elements = [];
  const makeEl = tag => ({ tag, children: [], _text: '',
    set textContent(v){ this._text = String(v); this.children = []; },
    get textContent(){ return this._text; },
    set innerHTML(v){ this.children = []; this._text = ''; },
    append(c){ this.children.push(c); },
    addEventListener(){}, style:{}, setAttribute(){} });
  const host = makeEl('host');
  global.document = {
    createElement: makeEl,
    createTextNode: t => ({ nodeType: 3, text: String(t) }),
    querySelector: () => host,
    body: host,
  };
  global.Node = function(){};
  const fullJs = compile(srcBody, { includeRuntime: true });
  const getDB = new Function('document', 'Node', fullJs + '; return __DB;');
  return { __DB: getDB(global.document, global.Node), host };
}

// state cell get/set
{
  const { __DB } = runtimeWith('दर्शय("")।');
  const s = __DB.state(10);
  ok('state initial read', s() === 10);
  s(20);
  ok('state after write', s() === 20);
}

// view re-renders on state change
{
  const { __DB, host } = runtimeWith('दर्शय("")।');
  const count = __DB.state(0);
  let renders = 0;
  __DB.view(host, () => { renders++; count(); return { tag: 'span', children: [], _text: '' }; });
  ok('view renders once initially', renders === 1);
  count(1);
  ok('view re-renders on change', renders === 2);
  count(1); // same value → no re-render
  ok('no re-render on same value', renders === 2);
  count(5);
  ok('re-render on new value', renders === 3);
}

// view that does NOT read a state cell is not subscribed
{
  const { __DB, host } = runtimeWith('दर्शय("")।');
  const a = __DB.state(0);
  let renders = 0;
  __DB.view(host, () => { renders++; return { tag: 'span', children: [], _text: '' }; });
  a(99);
  ok('unsubscribed view not re-run', renders === 1);
}

// ---------- end-to-end counter through the compiler ----------
// (full DOM behavior is verified in-browser; here we just confirm the
//  compiled program runs and the view subscribes + re-renders on ++.)
{
  let renderCount = 0;
  const elements = [];
  const makeEl = tag => ({ tag, children: [], _t:'',
    set textContent(v){ this._t=String(v); }, get textContent(){ return this._t; },
    set innerHTML(v){ this.children=[]; renderCount++; },
    append(c){ this.children.push(c); }, addEventListener(){}, style:{}, setAttribute(){} });
  const host = makeEl('host');
  global.document = { createElement: makeEl, createTextNode: t=>({nodeType:3,text:String(t)}),
    querySelector: ()=>host, body: host };
  global.Node = function(){};
  const src = `
    भाव गणकः = ०।
    दृश्य { रचय शीर्षः वाक्यम् "n=" + गणकः। }
    गणकः++।
    गणकः++।
  `;
  const fullJs = compile(src, { includeRuntime: true });
  new Function('document','Node', fullJs)(global.document, global.Node);
  // initial render + 2 increments = 3 innerHTML clears
  ok('counter end-to-end: re-rendered on each ++', renderCount === 3);
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
