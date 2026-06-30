// keyed-list.test.js — आवली: keyed list reconciliation. Surviving keys reuse
// their DOM node (preserving node state); new keys build, vanished keys are
// removed, and reorders MOVE nodes rather than rebuild them.
import { compile } from '../src/index.js';
import { id } from '../src/codegen.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));

ok('आवली → __DB.keyedList',
   compile('चर न = आवली(स, क, र)।', { includeRuntime: false }).includes('__DB.keyedList(sa, ka, ra)'));

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); } catch {}

if (JSDOM) {
  // run a program; externals receive the keyed-list host across phases
  function run(src, externals) {
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    global.document = dom.window.document; global.Node = dom.window.Node;
    const names = Object.keys(externals).map(id);
    new Function('document', 'Node', ...names, compile(src, { includeRuntime: true }))
      (dom.window.document, dom.window.Node, ...Object.values(externals));
  }
  const keysOf = h => Array.from(h.children).map(n => n.getAttribute('data-k')).join(',');

  // a list that reorders, inserts, and removes; we count builds via a marker
  let builds = 0;
  const phases = [];
  run(`भाव सूची = [कोष{ id: १ }, कोष{ id: २ }, कोष{ id: ३ }]।
       चर पटः = आवली(सूत्र(सूची), कार्य(व){ फलम् व.id। }, कार्य(व){
           गण()।
           चर न = रचय वाक्यः वाक्यम् पाठ"i{व.id}"।
           न.setAttribute("data-k", व.id)।
           फलम् न।
       })।
       चरण(पटः)।                                              # 0: initial
       सूची = [कोष{ id: ३ }, कोष{ id: १ }, कोष{ id: २ }]।       # reorder
       चरण(पटः)।                                              # 1
       सूची = [कोष{ id: ३ }, कोष{ id: ४ }, कोष{ id: १ }, कोष{ id: २ }]।  # insert 4
       चरण(पटः)।                                              # 2
       सूची = [कोष{ id: ४ }, कोष{ id: २ }]।                    # remove 1 & 3
       चरण(पटः)।                                              # 3
      `,
    { 'गण': () => builds++, 'चरण': h => phases.push({ keys: keysOf(h), builds, nodes: Array.from(h.children) }) });

  ok('initial renders all keys', phases[0].keys === '1,2,3');
  ok('initial builds = 3', phases[0].builds === 3);
  ok('reorder produces new order', phases[1].keys === '3,1,2');
  ok('reorder does NOT rebuild (builds still 3)', phases[1].builds === 3);
  ok('reorder reuses the SAME nodes',
     phases[0].nodes.find(n => n.getAttribute('data-k') === '2') ===
     phases[1].nodes.find(n => n.getAttribute('data-k') === '2'));
  ok('insert adds new key in place', phases[2].keys === '3,4,1,2');
  ok('insert builds exactly one new node (builds = 4)', phases[2].builds === 4);
  ok('remove drops vanished keys', phases[3].keys === '4,2');
  ok('remove does not rebuild survivors (builds still 4)', phases[3].builds === 4);

  // node STATE (e.g. a typed value) is preserved across reorder
  {
    const cap = [];
    run(`भाव सू = [कोष{ id: १ }, कोष{ id: २ }, कोष{ id: ३ }]।
         चर प = आवली(सूत्र(सू), कार्य(व){ फलम् व.id। }, कार्य(व){
             चर न = रचय वाक्यः वाक्यम् पाठ"{व.id}"।
             न.setAttribute("data-k", व.id)।
             फलम् न।
         })।
         अंकय(प)।
         सू = [कोष{ id: ३ }, कोष{ id: १ }, कोष{ id: २ }]।
         परीक्ष(प)।`,
      { 'अंकय': h => Array.from(h.children).forEach(n => { n.dataset.state = 'S' + n.getAttribute('data-k'); }),
        'परीक्ष': h => cap.push(Array.from(h.children).map(n => n.dataset.state).join(',')) });
    ok('node DOM state moves with its key across reorder', cap[0] === 'S3,S1,S2');
  }
} else {
  console.log('  (jsdom not installed — skipped keyed-list runtime checks)');
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
