// build-extension.js — (re)build the VS Code extension's analyzer bundle and
// package the .vsix.
//
//   node build-extension.js
//
// The extension wires the analyzer core (src/analyzer.js) to VS Code provider
// APIs. Because the toolchain is ESM but VS Code extensions are CommonJS, the
// analyzer graph is bundled to a single CJS file (extension/analyzer.js) with
// esbuild — a BUILD-TIME tool only; nothing extra ships in the .vsix.
//
// Steps:
//   1. esbuild src/analyzer.js → extension/analyzer.js (CJS, bundled)
//   2. zip extension-build/ (manifest + content-types + extension/) → .vsix
//
// Requires esbuild and the `zip` utility to be available. If esbuild is not
// installed, run: npm install esbuild --no-save

import { execSync } from 'child_process';
import { existsSync, cpSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });

// 1. bundle the analyzer to CommonJS
const esbuild = join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
if (!existsSync(esbuild)) {
  console.error('esbuild not found. Run: npm install esbuild --no-save');
  process.exit(1);
}
run(`${esbuild} src/analyzer.js --bundle --platform=node --format=cjs --outfile=extension/analyzer.js`);
console.log('✓ extension/analyzer.js (CJS bundle)');

// 2. assemble the .vsix
const buildDir = join(root, 'extension-build');
rmSync(join(buildDir, 'extension'), { recursive: true, force: true });
cpSync(join(root, 'extension'), join(buildDir, 'extension'), { recursive: true });
rmSync(join(root, 'devabhasha-1.0.0.vsix'), { force: true });
run(`zip -r -q -X ../devabhasha-1.0.0.vsix '[Content_Types].xml' extension.vsixmanifest extension`, buildDir);
console.log('✓ devabhasha-1.0.0.vsix');
