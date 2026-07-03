// चालय.mjs — build the frontend bundle, then run the backend server.
//
//   node चालय.mjs
//
// 1. compile अग्रिम.deva (frontend) to browser JS, with the DOM runtime and a
//    browser I/O shim (native fetch) prepended → अग्रिम.bundle.js
// 2. run पश्चिम.deva (backend) on Node, which reads that bundle and serves it.
//
// Both halves are written in Devabhāṣā — one Sanskrit source, both ends.

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { compile } from '../../src/index.js';
import { bundle } from '../../src/bundler.js';
import { IO_BROWSER_SOURCE } from '../../src/io-browser.js';
import { __IO } from '../../src/io-node.js';
import { __SRV } from '../../src/server-node.js';

const here = dirname(fileURLToPath(import.meta.url));

// 1. build the frontend → browser bundle (DOM runtime + browser fetch shim).
//    The frontend is a single file (no आयात), so the single-file compiler is
//    enough; the browser I/O shim gives it a native-fetch जाल.
const frontSrc = readFileSync(join(here, 'अग्रिम.deva'), 'utf8');
const frontJs = compile(frontSrc, { includeRuntime: true });
writeFileSync(join(here, 'अग्रिम.bundle.js'), IO_BROWSER_SOURCE + '\n' + frontJs);
console.log('✓ अग्रिम.bundle.js (frontend, browser)');

// 2. run the backend server (Node). It आयात-s मार्गकः / सञ्चयः / आकृति, so it
//    goes through the multi-file bundler (which resolves imports + std/), not
//    the single-file compiler.
const backJs = bundle(join(here, 'पश्चिम.deva'), { includeRuntime: false });
process.chdir(here);   // so सञ्चिका.पठ + the ग्रन्थालयः.db path resolve here
const __DB = new Proxy({}, { get: () => () => { throw new Error('no DOM on server'); } });
// eslint-disable-next-line no-new-func
new Function('__DB', '__IO', '__SRV', 'console', backJs)(__DB, __IO, __SRV, console);
