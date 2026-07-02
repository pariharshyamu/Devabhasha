#!/usr/bin/env node
// cli.js — command line interface.
//   devabhasha build  file.deva [-o out.js]   compile to JavaScript
//   devabhasha run    file.deva                compile and execute with Node

import { readFileSync, writeFileSync } from 'fs';
import { compile, compileWithMap } from './index.js';
import { bundle, checkProgram } from './bundler.js';
import { serve } from './devserver.js';
import { __IO, IO_NODE_SOURCE } from './io-node.js';
import { __SRV, SRV_NODE_SOURCE } from './server-node.js';
import { DevabhashaError, formatError } from './errors.js';

const args = process.argv.slice(2);
const cmd = args[0];

function fail(msg) { console.error('दोषः: ' + msg); process.exit(1); }

// Print a compiler error with source context if available.
function failCompile(e, source) {
  if (e instanceof DevabhashaError) {
    console.error(formatError(e, e.source || source));
  } else {
    console.error('दोषः: ' + e.message);
  }
  process.exit(1);
}

if (!cmd || !['build', 'run', 'serve', 'check'].includes(cmd)) {
  console.log(`देवभाषा — Sanskrit → JavaScript transpiler

Usage:
  devabhasha build <file.deva> [-o out.js]   compile (resolves आयात) to JavaScript
  devabhasha run   <file.deva>                compile and run with Node
  devabhasha check <file.deva>                type-check the program (resolves आयात)
  devabhasha serve <file.deva> [--port N]     dev server with live reload (web)
`);
  process.exit(0);
}

const file = args[1];
if (!file) fail('no input file');

// check: whole-program type analysis across the आयात graph. Type diagnostics
// are warnings; exit non-zero when any are found so it is usable as a CI gate.
if (cmd === 'check') {
  let diags;
  try { diags = checkProgram(file); }
  catch (e) { failCompile(e); }
  if (!diags.length) { console.log('✓ प्रकारपरीक्षा सफला (no type issues)'); process.exit(0); }
  const cwd = process.cwd() + '/';
  for (const d of diags) {
    const where = String(d.file).replace(cwd, '');
    console.error(`${where}:${d.line}:${d.col}  ${d.message}`);
  }
  console.error(`\n${diags.length} प्रकारभेदाः (type issue${diags.length === 1 ? '' : 's'})`);
  process.exit(1);
}

if (cmd === 'serve') {
  const portIdx = args.indexOf('--port');
  const port = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) || 5173 : 5173;
  try { readFileSync(file, 'utf8'); } catch { fail(`cannot read ${file}`); }
  serve(file, { port });
  // keep the process alive (server + watcher)
} else {

let src;
try { src = readFileSync(file, 'utf8'); }
catch { fail(`cannot read ${file}`); }

if (cmd === 'build') {
  const wantMap = args.includes('--sourcemap') || args.includes('-m');
  const outIdx = args.indexOf('-o');
  const out = outIdx >= 0 ? args[outIdx + 1] : file.replace(/\.deva$/, '.js');

  // --sourcemap uses the single-file compiler (with positions); without it,
  // the multi-file bundler (which resolves आयात) is used.
  if (wantMap) {
    let result;
    try {
      result = compileWithMap(src, { includeRuntime: true });
    } catch (e) { failCompile(e, src); }
    const mapFile = out + '.map';
    result.map.file = out.split('/').pop();
    result.map.sources = [file.split('/').pop()];
    result.map.sourcesContent = [src];
    writeFileSync(out, result.code + `\n//# sourceMappingURL=${mapFile.split('/').pop()}\n`);
    writeFileSync(mapFile, JSON.stringify(result.map));
    console.log(`✓ ${out}`);
    console.log(`✓ ${mapFile}`);
  } else {
    let js;
    try { js = bundle(file, { includeRuntime: true }); }
    catch (e) { failCompile(e, src); }
    // inline the Node I/O + HTTP server backends so the built .js is self-contained
    writeFileSync(out, IO_NODE_SOURCE + '\n' + SRV_NODE_SOURCE + '\n' + js);
    console.log(`✓ ${out}`);
  }
} else {
  // run: bundle without the DOM runtime, then execute with the Node I/O
  // backend injected and a stub __DB (DOM needs a browser).
  let runnable;
  try { runnable = bundle(file, { includeRuntime: false }); }
  catch (e) { failCompile(e, src); }
  const __DB = new Proxy({}, { get: () => () => {
    throw new Error('DOM operations need a browser — use the playground or build the JS.');
  }});
  try {
    // eslint-disable-next-line no-new-func
    new Function('__DB', '__IO', '__SRV', runnable)(__DB, __IO, __SRV);
  } catch (e) {
    fail('runtime: ' + e.message);
  }
}
}
