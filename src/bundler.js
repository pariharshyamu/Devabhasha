// bundler.js — compile-time module resolution & linking (आयात / निर्यात).
//
// Design (the Rust/Python lineage): resolve the import graph at compile time,
// compile each .deva module to JS, wrap each in an IIFE that returns an object
// of its निर्यात exports, order them so dependencies come first, and link
// imports to the right module's exports. One self-contained bundle is emitted;
// the DOM runtime is included once for the whole program.

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { compileModule, generate, PRELUDE } from './index.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { DevabhashaError } from './errors.js';
import { id } from './codegen.js';
import { moduleExportTypes, typeDiagnostics } from './types.js';

// The canonical standard library ships with the compiler. An import whose
// source begins with "std/" resolves HERE, regardless of the importing file's
// location — so `आयात { योगः } आ "std/सूची"` works from anywhere without copying
// the module. (The library modules are written in Devabhāṣā; see the folder.)
const STD_PREFIX = 'std/';
const STD_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'stdlib');

// Resolve a module source string (as written in आयात "...") to an absolute
// path. "std/X" → the shipped standard library; otherwise relative to the
// importing file. Appends .deva when no extension is given.
function resolveSource(source, fromFile) {
  if (source.startsWith(STD_PREFIX)) {
    let name = source.slice(STD_PREFIX.length);
    if (!/\.deva$/.test(name)) name += '.deva';
    return resolve(STD_ROOT, name);
  }
  let p = source;
  if (!/\.deva$/.test(p)) p += '.deva';
  return isAbsolute(p) ? p : resolve(dirname(fromFile), p);
}

// Build the dependency graph by walking आयात edges from the entry file.
// Returns { modules: Map<path, {path, code, exports, imports}>, order: [path] }
// where order is a topological sort (dependencies first). Cycles are tolerated
// (a module already on the stack is simply not re-entered).
export function buildGraph(entryPath) {
  const modules = new Map();
  const order = [];
  const visiting = new Set();

  function visit(absPath, importerPath) {
    if (modules.has(absPath)) return;            // already compiled
    if (visiting.has(absPath)) return;           // cycle — break it
    if (!existsSync(absPath)) {
      throw new DevabhashaError(
        `आयातदोषः: module not found: ${absPath}` + (importerPath ? ` (imported by ${importerPath})` : ''),
        { kind: 'parse' }
      );
    }
    visiting.add(absPath);

    const source = readFileSync(absPath, 'utf8');
    let mod;
    try {
      mod = compileModule(source);
    } catch (e) {
      if (e instanceof DevabhashaError) { e.source = source; e.file = absPath; }
      throw e;
    }
    mod.path = absPath;
    mod.source = source;

    // resolve each import's source path and recurse (dependencies first)
    for (const imp of mod.imports) {
      imp.resolved = resolveSource(imp.source, absPath);
      visit(imp.resolved, absPath);
    }

    visiting.delete(absPath);
    modules.set(absPath, mod);
    order.push(absPath);                          // post-order = deps first
  }

  visit(resolve(entryPath), null);
  return { modules, order };
}

// A stable JS identifier for a module path.
let __counter = 0;
const slotNames = new Map();
function moduleSlot(path) {
  if (!slotNames.has(path)) slotNames.set(path, `__mod_${__counter++}`);
  return slotNames.get(path);
}

// Link the graph into one JS program.
//   includeRuntime: prepend the DOM runtime (for build); omit for run.
export function bundle(entryPath, { includeRuntime = true } = {}) {
  __counter = 0; slotNames.clear();
  const { modules, order } = buildGraph(entryPath);
  const entryAbs = resolve(entryPath);

  const pieces = [];
  if (includeRuntime) {
    // full runtime (PRELUDE + __DB) via a trivial program compiled with it
    pieces.push(generate(parse(tokenize('')), { includeRuntime: true }));
  } else {
    // host-independent prelude is always needed (Result constructors etc.)
    pieces.push(PRELUDE);
  }

  for (const path of order) {
    const mod = modules.get(path);
    const slot = moduleSlot(path);
    const isEntry = path === entryAbs;

    // build the import-binding prelude for this module
    let prelude = '';
    for (const imp of mod.imports) {
      const depSlot = moduleSlot(imp.resolved);
      if (imp.kind === 'namespace') {
        prelude += `const ${id(imp.alias)} = ${depSlot};\n`;
      } else if (imp.kind === 'named') {
        for (const n of imp.names) {
          prelude += `const ${id(n)} = ${depSlot}[${JSON.stringify(id(n))}];\n`;
        }
      } // 'effect' imports need no bindings; the dep already ran
    }

    // the module's own code (no runtime — added once above)
    const body = mod.code;

    // export object: { exportedName: exportedName, ... }
    const exportObj = '{ ' + mod.exports.map(n => `${JSON.stringify(id(n))}: ${id(n)}`).join(', ') + ' }';

    if (isEntry) {
      // entry runs in an IIFE too (so its imports get scoped bindings)
      pieces.push(`const ${slot} = (function () {\n${prelude}${body}\nreturn ${exportObj};\n})();`);
    } else {
      pieces.push(`const ${slot} = (function () {\n${prelude}${body}\nreturn ${exportObj};\n})();`);
    }
  }

  return pieces.join('\n\n');
}

// Type-check a whole PROGRAM (the आयात graph rooted at entryPath), resolving
// each module's imported names to the exporting module's declared types. So a
// call to an imported function is argument-checked across the module boundary,
// and a namespace import (आयात * रूपेण ग) is modelled as an object shape whose
// fields are the module's exports — ग.योगः("x") is checked via member access +
// the function-call path. Returns a flat list of { file, ...diagnostic }.
export function checkProgram(entryPath) {
  const { modules, order } = buildGraph(entryPath);
  // export types are syntactic (from annotations), so they need no ordering
  const exportTypes = new Map();
  for (const [path, mod] of modules) exportTypes.set(path, moduleExportTypes(mod.source));

  const all = [];
  for (const path of order) {
    const mod = modules.get(path);
    const importSigs = new Map();
    for (const imp of mod.imports) {
      const depTypes = exportTypes.get(imp.resolved) || {};
      if (imp.kind === 'named') {
        for (const n of imp.names) importSigs.set(n, n in depTypes ? depTypes[n] : 'किमपि');
      } else if (imp.kind === 'namespace') {
        importSigs.set(imp.alias, { base: 'वस्तु', fields: { ...depTypes } });
      }
    }
    for (const d of typeDiagnostics(mod.source, { importSigs })) all.push({ file: path, ...d });
  }
  return all;
}
