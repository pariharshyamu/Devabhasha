// plural-dom.test.js — बहुवचन DOM semantic: a plural कर्तृ (nominative tag)
// distributes the element over the समास children, one element per child, all
// sharing the remaining kāraka slots. Returns a group (array of nodes) that
// flattens into any parent, so it composes like a single element.
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- codegen: plural switches the builder ----------
ok('plural emits constructGroup',
   js('रचय पटाः { "a" "b" }।').includes('__DB.constructGroup('));
ok('singular emits construct (not group)',
   js('रचय पटः वाक्यम् "a"।').includes('__DB.construct(') &&
   !js('रचय पटः वाक्यम् "a"।').includes('constructGroup'));
ok('group keeps the resolved tag',
   js('रचय पटाः { "a" }।').includes('tag: "button"'));
ok('group carries children array',
   js('रचय वाक्याः { "x" "y" }।').includes('children: ['));
ok('group shares style across elements',
   js('रचय पटाः रूप { वर्णः: नीलः } { "a" "b" }।').includes('style: {'));
ok('plural composes inside a singular container',
   js('रचय मूलः { रचय वाक्याः { "x" "y" } }।')
     .match(/__DB\.construct\(\{ tag: "div".*constructGroup\(\{ tag: "p"/s) != null);
// vowel-final (इ/ई/उ) tags pluralize via their true class forms → group
ok('vowel-final पङ्क्तयः → li group',
   js('रचय पङ्क्तयः { "a" "b" }।').includes('__DB.constructGroup({ tag: "li"'));
ok('सूची > पङ्क्तयः → ul>li list',
   js('रचय सूचीः { रचय पङ्क्तयः { "a" "b" } }।')
     .match(/__DB\.construct\(\{ tag: "ul".*constructGroup\(\{ tag: "li"/s) != null);

// ---------- behavioral (jsdom if present) ----------
let JSDOM;
try { ({ JSDOM } = await import('jsdom')); } catch {}

if (JSDOM) {
  const run = src => {
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    global.document = dom.window.document; global.Node = dom.window.Node;
    new Function('document', 'Node', compile(src, { includeRuntime: true }))
      (dom.window.document, dom.window.Node);
    return dom.window.document.body;
  };

  {
    const body = run('योजय(रचय पटाः { "एक" "द्वि" "त्रि" })।');
    const btns = body.querySelectorAll('button');
    ok('three children → three <button>', btns.length === 3);
    ok('each button gets its child as text',
       btns[0].textContent === 'एक' && btns[2].textContent === 'त्रि');
  }
  {
    const body = run('योजय(रचय मूलः { रचय वाक्याः { "x" "y" } })।');
    const div = body.querySelector('div');
    ok('group flattens into container', div && div.querySelectorAll('p').length === 2);
    ok('no extra wrapper element', div.children.length === 2 &&
       div.children[0].tagName === 'P');
  }
  {
    const body = run('योजय(रचय पटाः रूप { वर्णः: नीलः } { "अ" "आ" })।');
    const btns = body.querySelectorAll('button');
    ok('shared style applied to every element',
       btns.length === 2 && btns[0].style.color === 'navy' && btns[1].style.color === 'navy');
  }
  {
    const body = run('योजय(रचय सूचीः { रचय पङ्क्तयः { "एकम्" "द्वे" "त्रीणि" } })।');
    const ul = body.querySelector('ul');
    ok('vowel-final list: ul wraps 3 li',
       ul && ul.querySelectorAll('li').length === 3);
    ok('vowel-final list: li text in order',
       ul.children[0].textContent === 'एकम्' && ul.children[2].textContent === 'त्रीणि');
  }
  {
    const body = run('योजय(रचय पटः वाक्यम् "solo")।');
    ok('singular still builds exactly one element',
       body.querySelectorAll('button').length === 1);
  }
  {
    const body = run('योजय(रचय पटाः { })।');
    ok('empty plural → empty group (no elements)',
       body.querySelectorAll('button').length === 0);
  }
  {
    // द्विवचन (dual): a pair builds exactly two elements, one per child —
    // like a plural, but the grammar means "two".
    const body = run('योजय(रचय पटौ { "हाँ" "नहीं" })।');
    const btns = body.querySelectorAll('button');
    ok('dual pair → exactly two <button>', btns.length === 2);
    ok('dual pair children in order',
       btns[0].textContent === 'हाँ' && btns[1].textContent === 'नहीं');
  }
  {
    const body = run('योजय(रचय सूचीः { रचय पङ्क्ती { "प्रथमा" "द्वितीया" } })।');
    const ul = body.querySelector('ul');
    ok('vowel-final dual पङ्क्ती → ul wraps 2 li',
       ul && ul.querySelectorAll('li').length === 2);
  }
} else {
  console.log('  · jsdom not installed — behavioral checks skipped');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
