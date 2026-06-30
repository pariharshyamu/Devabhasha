// minimal test runner — node test/test.js
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
function run(name, src, check) {
  try {
    const logs = [];
    const js = compile(src, { includeRuntime: false });
    new Function('console', js)({ log: (...a) => logs.push(a.join(' ')) });
    const ok = check(logs);
    if (ok) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + '  got: ' + JSON.stringify(logs)); }
  } catch (e) {
    fail++; console.log('  ✗ ' + name + '  threw: ' + e.message);
  }
}

run('variables + print', 'चर क = ५। दर्शय(क)।', l => l[0] === '5');
run('function call', 'कार्य द्वि(क){फलम् क*२।} दर्शय(द्वि(७))।', l => l[0] === '14');
run('if/else true', 'यदि(३>२){दर्शय("ह")।}अन्यथा{दर्शय("न")।}', l => l[0] === 'ह');
run('if/else false', 'यदि(१>२){दर्शय("ह")।}अन्यथा{दर्शय("न")।}', l => l[0] === 'न');
run('while loop', 'चर i=०। यावत्(i<३){i=i+१।} दर्शय(i)।', l => l[0] === '3');
run('for-of sum', 'चर s=०। प्रत्येकम्(x:[१,२,३]){s=s+x।} दर्शय(s)।', l => l[0] === '6');
run('string concat', 'दर्शय("अ"+"आ")।', l => l[0] === 'अआ');
run('devanagari digits', 'दर्शय(१०+५)।', l => l[0] === '15');
run('nested function', 'कार्य व(क){यदि(क<२){फलम् १।}फलम् क*व(क-१)।} दर्शय(व(५))।', l => l[0] === '120');
run('boolean + logic', 'दर्शय(सत्यम् && असत्यम्)।', l => l[0] === 'false');

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
