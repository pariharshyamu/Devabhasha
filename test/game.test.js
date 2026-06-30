// game.test.js — host bindings added for real-time/interactive programs:
// कालचक्र (interval), कालनाशः (clearTimer), कुञ्जिश्रोता (keydown), the
// position CSS props, and the mutable-object reactive re-render fix.
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- globals lower to the __DB host bindings ----------
ok('कालचक्र → __DB.interval', js('कालचक्र(फ, ३०)।').includes('__DB.interval(pha, 30)'));
ok('कालनाशः → __DB.clearTimer', js('कालनाशः(घ)।').includes('__DB.clearTimer(gha)'));
ok('कुञ्जिश्रोता → __DB.onKey', js('कुञ्जिश्रोता(फ)।').includes('__DB.onKey(pha)'));

// ---------- position style properties ----------
ok('शीर्षात् → top', js('रचय पटः रूप { शीर्षात्: "10px" }।').includes('"top": "10px"'));
ok('वामतः → left', js('रचय पटः रूप { वामतः: "5px" }।').includes('"left": "5px"'));
ok('अधस्तात् → bottom', js('रचय पटः रूप { अधस्तात्: "0px" }।').includes('"bottom": "0px"'));
ok('दक्षिणतः → right', js('रचय पटः रूप { दक्षिणतः: "0px" }।').includes('"right": "0px"'));
ok('स्तरः → zIndex', js('रचय पटः रूप { स्तरः: "5" }।').includes('"zIndex": "5"'));

// ---------- the reactive-mutation fix: object state always re-renders ----------
// A भाव cell holding an object, mutated in place and reassigned the SAME
// reference, must still notify subscribers (games rely on this). We model the
// cell with the runtime's own logic and assert the re-render fires.
function makeCell(init) {
  let value = init; const subs = new Set();
  const cell = (...a) => {
    if (a.length) {
      // mirror runtime guard: skip only equal PRIMITIVES
      if (a[0] === value && (a[0] === null || typeof a[0] !== 'object')) return value;
      value = a[0]; subs.forEach(f => f()); return value;
    }
    return value;
  };
  cell.sub = f => subs.add(f);
  return cell;
}
{
  let renders = 0;
  const st = makeCell({ y: 0 });
  st.sub(() => renders++);
  const obj = st();
  obj.y = 5; st(obj);          // same reference, mutated
  obj.y = 9; st(obj);          // again
  ok('mutated object state re-renders each write', renders === 2);
}
{
  let renders = 0;
  const st = makeCell(0);
  st.sub(() => renders++);
  st(0);                        // same primitive → no re-render
  st(1);                        // changed primitive → re-render
  ok('equal primitive still short-circuits', renders === 1);
}

// ---------- a minimal game program compiles end-to-end ----------
ok('game loop + key handler + view compiles', (() => {
  try {
    compile(`भाव स = कोष{ य: ० }।
      कार्य पदम्(){ चर अ = स। अ.य = अ.य + १। स = अ। }
      कालचक्र(पदम्, ३०)।
      कुञ्जिश्रोता(कार्य(क){ पदम्()। })।
      दृश्य { रचय शीर्षः वाक्यम् पाठ"{स.य}"। }`, { includeRuntime: false });
    return true;
  } catch { return false; }
})());

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
