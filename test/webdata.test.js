// webdata.test.js — list/data rendering + named reusable styles (रूपनाम).
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// ---------- list rendering ----------
// mapping an array to nodes and placing as children compiles cleanly
ok('map → children compiles',
   js('रचय सूचीः { [१,२].प्रतिचित्रय(कार्य(x){ फलम् रचय पङ्क्तिः वाक्यम् x। }) }')
     .includes('children: ['));

// render list to real DOM (with a minimal element shim)
function render(src) {
  const flat = (n, c) => {
    if (c == null) return;
    if (Array.isArray(c)) { c.forEach(x => flat(n, x)); return; }
    n.children.push(c.tag ? c : { text: String(c) });
  };
  const __DB = {
    construct({ tag, content, children }) {
      const n = { tag, children: [] };
      if (content != null) flat(n, content);
      if (children) for (const c of children) flat(n, c);
      return n;
    },
    mount: n => n,
  };
  let out;
  new Function('__DB', '__c', compile(src, { includeRuntime: false }) + '\n__c(typeof phala!=="undefined"?phala:null);')
    (__DB, r => { out = r; });
  return out;
}

{
  const tree = render(`चर phala = रचय सूचीः {
      ["क","ख","ग"].प्रतिचित्रय(कार्य(x){ फलम् रचय पङ्क्तिः वाक्यम् x। })
  }।`);
  ok('list: ul tag', tree && tree.tag === 'ul');
  ok('list: 3 li children (array flattened)', tree && tree.children.length === 3);
  ok('list: children are li', tree && tree.children.every(c => c.tag === 'li'));
  ok('list: first item text correct',
     tree && tree.children[0].children[0].text === 'क');
}

// data objects → elements
{
  const tree = render(`चर लोकाः = [कोष{न:"राम"}, कोष{न:"सीता"}]।
      चर phala = रचय सूचीः {
          लोकाः.प्रतिचित्रय(कार्य(व){ फलम् रचय पङ्क्तिः वाक्यम् व.न। })
      }।`);
  ok('data list: 2 items', tree && tree.children.length === 2);
  ok('data list: reads object field',
     tree && tree.children[1].children[0].text === 'सीता');
}

// mixed static + mapped children
{
  const tree = render(`चर phala = रचय मूलः {
      रचय शीर्षः वाक्यम् "सूची"।
      ["अ","आ"].प्रतिचित्रय(कार्य(x){ फलम् रचय पङ्क्तिः वाक्यम् x। })
  }।`);
  ok('mixed: heading + 2 mapped = 3 children', tree && tree.children.length === 3);
  ok('mixed: heading first', tree && tree.children[0].tag === 'h1');
  ok('mixed: mapped after', tree && tree.children[1].tag === 'li');
}

// ---------- named styles (रूपनाम) ----------
ok('StyleDecl → const object',
   js('रूपनाम क = रूप { वर्णः: श्वेतः }।') === 'const ka = { "color": "white" };');

ok('named reference via Object.assign',
   js('रूपनाम क = रूप { वर्णः: श्वेतः }। रचय पटः रूप क।')
     .includes('Object.assign({}, ka)'));

ok('named base + overrides',
   js('रूपनाम क = रूप { वर्णः: श्वेतः }। रचय पटः रूप क { अन्तरालः: "5px" }।')
     .includes('Object.assign({}, ka, { "padding": "5px" })'));

ok('named style translates value words',
   js('रूपनाम क = रूप { पृष्ठभूमिः: केसरः }।').includes('"#F4C430"'));

// named style with multiple props
ok('named style multiple props',
   js('रूपनाम बृहत् = रूप { वर्णः: नीलः, अक्षरभारः: गुरुः, संरेखणम्: केन्द्रम् }।')
     === 'const brihat = { "color": "navy", "fontWeight": "bold", "textAlign": "center" };');

// render: named style + override resolves correctly
{
  const flat = (n, c) => { if (c == null) return; if (Array.isArray(c)) { c.forEach(x => flat(n, x)); return; } n.children.push(c.tag ? c : { text: String(c) }); };
  const __DB = { construct({ tag, content, style }) { const n = { tag, children: [], style: style || {} }; if (content != null) flat(n, content); return n; }, mount: n => n };
  let out;
  new Function('__DB', '__c', compile('रूपनाम आधारः = रूप { वर्णः: श्वेतः, पृष्ठभूमिः: रक्तः }। चर phala = रचय पटः रूप आधारः { पृष्ठभूमिः: नीलः }।', { includeRuntime: false }) + '\n__c(phala);')(__DB, r => { out = r; });
  ok('render: base color inherited', out.style.color === 'white');
  ok('render: override wins (navy)', out.style.backgroundColor === 'navy');
}

// named ref followed by a CHILDREN block (not style overrides) — the
// '{' must be disambiguated as समास children, not style pairs
{
  const out = js('रूपनाम क = रूप { वर्णः: श्वेतः }। रचय मूलः रूप क { रचय वाक्यः वाक्यम् "x"। }');
  ok('named ref + children block', out.includes('Object.assign({}, ka)') && out.includes('children: ['));
}

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
