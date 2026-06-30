// style.test.js — रूप: CSS-in-Sanskrit styling.
//
// Verifies Sanskrit style-property names and value words translate to CSS,
// that variables and quoted CSS pass through correctly, and that styling
// composes with समास nesting.
import { compile } from '../src/index.js';
import { styleProp, styleValue, isStyleWord } from '../src/style.js';

let pass = 0, fail = 0;
const ok = (name, cond) => cond ? (pass++, console.log('  ✓ ' + name))
                                : (fail++, console.log('  ✗ ' + name));
const js = src => compile(src, { includeRuntime: false }).trim();

// --- property-name translation ---
ok('वर्णः → color', styleProp('वर्णः') === 'color');
ok('पृष्ठभूमिः → backgroundColor', styleProp('पृष्ठभूमिः') === 'backgroundColor');
ok('अक्षरमानम् → fontSize', styleProp('अक्षरमानम्') === 'fontSize');
ok('कोणवृत्तिः → borderRadius', styleProp('कोणवृत्तिः') === 'borderRadius');
ok('unknown prop passes through', styleProp('cursor') === 'cursor');

// --- value-word translation ---
ok('रक्तः → crimson', styleValue('रक्तः') === 'crimson');
ok('नीलः → navy', styleValue('नीलः') === 'navy');
ok('केन्द्रम् → center', styleValue('केन्द्रम्') === 'center');
ok('प्रवाहः → flex', styleValue('प्रवाहः') === 'flex');
ok('गुरुः → bold', styleValue('गुरुः') === 'bold');
ok('केसरः → hex #F4C430', styleValue('केसरः') === '#F4C430');
ok('unknown value passes through', styleValue('xyz') === 'xyz');
ok('isStyleWord true for रक्तः', isStyleWord('रक्तः') === true);
ok('isStyleWord false for variable', isStyleWord('रंग') === false);

// --- compilation: color word becomes CSS literal ---
ok('color word → quoted CSS',
   js('रचय पटः रूप { वर्णः: रक्तः }।').includes('"color": "crimson"'));
ok('property name translated',
   js('रचय पटः रूप { पृष्ठभूमिः: नीलः }।').includes('"backgroundColor": "navy"'));

// --- variable value → reference (not literal) ---
{
  const out = js('चर रंग = "tomato"। रचय पटः रूप { वर्णः: रंग }।');
  ok('variable value is a reference', out.includes('"color": ramga'));
  ok('variable value not quoted', !out.includes('"color": "ramga"'));
}

// --- quoted CSS value passes through ---
ok('quoted px value',
   js('रचय पटः रूप { अक्षरमानम्: "18px" }।').includes('"fontSize": "18px"'));

// --- raw CSS property passes through ---
ok('raw css property',
   js('रचय पटः रूप { cursor: "pointer" }।').includes('"cursor": "pointer"'));

// --- multiple properties ---
{
  const out = js('रचय पटः रूप { वर्णः: श्वेतः, पृष्ठभूमिः: रक्तः, अन्तरालः: "10px" }।');
  ok('multiple props: color', out.includes('"color": "white"'));
  ok('multiple props: bg', out.includes('"backgroundColor": "crimson"'));
  ok('multiple props: padding', out.includes('"padding": "10px"'));
}

// --- रूप composes with समास (styled nested tree) ---
{
  const out = js(`रचय मूलः रूप { पृष्ठभूमिः: केसरः } {
      रचय शीर्षः वाक्यम् "T" रूप { वर्णः: नीलः }।
  }`);
  ok('styled container', out.includes('"backgroundColor": "#F4C430"'));
  ok('styled child', out.includes('"color": "navy"'));
  ok('child nested in children array',
     out.indexOf('children:') < out.indexOf('"color": "navy"'));
}

// --- रूप coexists with kāraka content slot ---
ok('content + style coexist',
   js('रचय पटः वाक्यम् "hi" रूप { वर्णः: रक्तः }।')
     .includes('content: "hi"') === true);

// --- expression as a style value ---
ok('expression value',
   js('चर n = ५। रचय पटः रूप { अक्षरमानम्: n + "px" }।').includes('(n + "px")'));

// --- color words resolve inside style-value EXPRESSIONS (ternary etc.) ---
ok('color word in ternary → CSS literal',
   js('रचय पटः रूप { पृष्ठभूमिः: स ? रक्तः : धूसरः }।')
     .includes('(sa ? "crimson" : "gray")'));
ok('condition variable in ternary stays a variable',
   js('रचय पटः रूप { पृष्ठभूमिः: सक्रियः ? रक्तः : नीलः }।')
     .includes('sakriyah ?'));
ok('style word only resolves inside style context',
   !js('दर्शय(रक्तः)।').includes('"crimson"'));   // outside रूप, रक्तः is a plain ident

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
