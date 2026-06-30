// stdlib tests — strings, objects, arrays (the self-hosting enablers)
import { compile } from '../src/index.js';

let pass = 0, fail = 0;
function run(name, src, check) {
  try {
    const logs = [];
    const js = compile(src, { includeRuntime: false });
    new Function('console', js)({ log: (...a) => logs.push(a.join(' ')) });
    const ok = check(logs);
    ok ? (pass++, console.log('  ✓ ' + name))
       : (fail++, console.log('  ✗ ' + name + '  got: ' + JSON.stringify(logs)));
  } catch (e) { fail++; console.log('  ✗ ' + name + '  threw: ' + e.message); }
}

// strings
run('length', 'दर्शय("नमस्ते".दीर्घता)।', l => l[0] === '6');
run('charAt', 'दर्शय("अआइ".अक्षरः(१))।', l => l[0] === 'आ');
run('slice', 'दर्शय("नमस्ते".खण्ड(०,२))।', l => l[0] === 'नम');
run('concat via +', 'दर्शय("अ"+"आ")।', l => l[0] === 'अआ');
run('charCodeAt', 'दर्शय("A".सङ्केतः(०))।', l => l[0] === '65');
run('includes', 'दर्शय("नमस्ते".अस्ति("मस्"))।', l => l[0] === 'true');
run('split+join', 'दर्शय("a,b,c".विभज(",").सम्मील("-"))।', l => l[0] === 'a-b-c');

// arrays
run('push+length', 'चर स=[]। स.योजय(१)। स.योजय(२)। दर्शय(स.दीर्घता)।', l => l[0]==='2');
run('index', 'दर्शय([१०,२०,३०][१])।', l => l[0] === '20');
run('map', 'दर्शय([१,२].प्रतिचित्रय(कार्य(x){फलम् x+१।}))।', l => l[0]==='2,3');
run('filter', 'दर्शय([१,२,३,४].गालय(कार्य(x){फलम् x>२।}))।', l => l[0]==='3,4');
run('indexOf', 'दर्शय(["क","ख","ग"].अनुक्रमणिका("ख"))।', l => l[0]==='1');

// objects
run('literal+access', 'चर व=कोष{नाम:"राम"}। दर्शय(व.नाम)।', l => l[0]==='राम');
run('field assign', 'चर व=कोष{x:१}। व.x=९। दर्शय(व.x)।', l => l[0]==='9');
run('nested', 'चर ट=कोष{अ:कोष{ब:५}}। दर्शय(ट.अ.ब)।', l => l[0]==='5');
run('obj in array', 'चर स=[कोष{n:१},कोष{n:२}]। दर्शय(स[१].n)।', l => l[0]==='2');

// the real integration: a mini-tokenizer round-trips
run('tokenizer fragment',
  'कार्य व(प){चर r=[]। चर i=०। यावत्(i<प.दीर्घता){r.योजय(प.अक्षरः(i))। i=i+१।} फलम् r।} दर्शय(व("अआइ").दीर्घता)।',
  l => l[0] === '3');

console.log(`\n${pass} पास, ${fail} फेल`);
process.exit(fail ? 1 : 0);
