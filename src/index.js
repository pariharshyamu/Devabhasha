// index.js — public API: compile(source) -> javascript string.

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { generate } from './codegen.js';

export function compile(source, options = {}) {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return generate(ast, options);
}

// Like compile, but returns { code, exports, imports } for the bundler.
// Never includes the runtime (the bundler adds it once for the whole program).
export function compileModule(source) {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return generate(ast, { includeRuntime: false, withMeta: true });
}

// Like compile, but also returns a Source Map v3 object: { code, map }.
export function compileWithMap(source, options = {}) {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return generate(ast, { ...options, sourceMap: true });
}

export { tokenize, parse, generate };
export { PRELUDE } from './codegen.js';
export { DevabhashaError, formatError } from './errors.js';
