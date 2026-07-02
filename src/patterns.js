// patterns.js — shared helpers over विकल्प match patterns (MatchObject /
// MatchArray). The parser builds these nodes; codegen emits their tests and
// binds; and the analysis passes (semantics, types, symbols) all need the same
// two things from a pattern: the names it BINDS (recursively, through nested
// patterns and array rest) and the CONSTRAINT expressions it evaluates. Keeping
// that traversal in one place stops the three passes from drifting apart.

export const isMatchPattern = n =>
  !!n && (n.type === 'MatchObject' || n.type === 'MatchArray');

// Every binding a pattern introduces, as { name, line, col } — object shorthand
// and aliased binds, array positional binds, the array rest, and everything the
// same for any nested sub-pattern.
export function patternBindings(pat, out = []) {
  if (!pat) return out;
  if (pat.type === 'MatchObject') {
    for (const p of pat.props) {
      if (p.kind === 'bind') out.push({ name: p.name, line: p.line, col: p.col });
      else if (p.kind === 'nested') patternBindings(p.sub, out);
    }
  } else if (pat.type === 'MatchArray') {
    for (const e of pat.elements) {
      if (e.kind === 'bind') out.push({ name: e.name, line: e.line, col: e.col });
      else if (e.kind === 'nested') patternBindings(e.sub, out);
    }
    if (pat.rest) out.push({ name: pat.rest.name, line: pat.rest.line, col: pat.rest.col });
  }
  return out;
}

// Every constraint value expression a pattern (and its nested sub-patterns)
// compares against — so the passes can check those for undefined names, types,
// and references just like any other expression.
export function patternConstraints(pat, out = []) {
  if (!pat) return out;
  if (pat.type === 'MatchObject') {
    for (const p of pat.props) {
      if (p.kind === 'const') out.push(p.value);
      else if (p.kind === 'nested') patternConstraints(p.sub, out);
    }
  } else if (pat.type === 'MatchArray') {
    for (const e of pat.elements) {
      if (e.kind === 'const') out.push(e.value);
      else if (e.kind === 'nested') patternConstraints(e.sub, out);
    }
  }
  return out;
}
