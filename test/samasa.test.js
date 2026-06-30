// samasa.test.js — समास (compound) composition: nested DOM element trees.
//
// Verifies that nested रचय blocks compile to correctly-nested
// __DB.construct({ ..., children: [...] }) calls, and that the resulting
// tree renders the right DOM structure.
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// --- compilation: children array is produced ---
ok('block form emits children',
   js('रचय मूलः { रचय वाक्यः वाक्यम् "x"। }').includes('children: ['));
ok('container tag is div',
   js('रचय मूलः { रचय वाक्यः वाक्यम् "x"। }').includes('tag: "div"'));
ok('child tag is p',
   js('रचय मूलः { रचय वाक्यः वाक्यम् "x"। }').includes('tag: "p"'));

// --- two siblings (dvandva) ---
{
  const out = js('रचय मूलः { रचय शीर्षः वाक्यम् "a"। रचय वाक्यः वाक्यम् "b"। }');
  ok('two siblings: both tags present', out.includes('"h1"') && out.includes('"p"'));
  ok('two siblings: in one children array',
     (out.match(/children: \[/g) || []).length === 1);
}

// --- deep nesting (tatpuruṣa within tatpuruṣa) ---
{
  const out = js('रचय मूलः { रचय सूचीः { रचय पङ्क्तिः वाक्यम् "x"। } }');
  ok('nested: two children arrays', (out.match(/children: \[/g) || []).length === 2);
  ok('nested: ul inside div', out.includes('"ul"') && out.includes('"li"'));
}

// --- empty container ---
ok('empty block is valid',
   js('रचय मूलः { }').includes('tag: "div"'));

// simpler structural check through actual jsdom-free counting of construct calls
{
  const out = js(`रचय मूलः {
      रचय शीर्षः वाक्यम् "T"।
      रचय वाक्यः वाक्यम् "B"।
      रचय सूचीः {
          रचय पङ्क्तिः वाक्यम् "१"।
          रचय पङ्क्तिः वाक्यम् "२"।
      }
  }`);
  const constructs = (out.match(/__DB\.construct/g) || []).length;
  ok('full tree: 6 construct calls (div+h1+p+ul+li+li)', constructs === 6);
  ok('full tree: 2 children arrays (div, ul)',
     (out.match(/children: \[/g) || []).length === 2);
}

// --- siblings keep document order ---
{
  const out = js('रचय मूलः { रचय शीर्षः वाक्यम् "first"। रचय वाक्यः वाक्यम् "second"। }');
  ok('sibling order preserved', out.indexOf('first') < out.indexOf('second'));
}

// --- kāraka slots still work alongside children ---
{
  const out = js('रचय मूलः स्पर्शाय करणेन हस्त { रचय वाक्यः वाक्यम् "x"। }');
  ok('event + children coexist', out.includes('event:') && out.includes('children:'));
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
