// devserver.js — a zero-dependency dev server with live reload for .deva web
// programs. Serves an HTML page that runs the compiled program, watches the
// source (and its directory, catching आयात imports), recompiles on change, and
// pushes a reload signal to the browser over Server-Sent Events. Compile errors
// are shown on the page instead of a blank screen.
//
// Uses only Node built-ins (http, fs) — no external packages — so it runs in
// the same dependency-free environment as the rest of the toolchain.

import { createServer } from 'http';
import { readFileSync, watch } from 'fs';
import { dirname, basename } from 'path';
import { bundle } from './bundler.js';
import { DevabhashaError, formatError } from './errors.js';

// Build the browser bundle for the entry file. Returns { ok, code | error }.
function buildBundle(entry) {
  try {
    const code = bundle(entry, { includeRuntime: true });
    return { ok: true, code };
  } catch (e) {
    const src = (() => { try { return readFileSync(entry, 'utf8'); } catch { return ''; } })();
    const msg = e instanceof DevabhashaError ? formatError(e, e.source || src) : ('दोषः: ' + e.message);
    return { ok: false, error: msg };
  }
}

// The HTML shell. #मूलम् is the mount root; the live-reload client listens on
// /__live (SSE) and reloads on the 'reload' event. A compile error is rendered
// into the page (passed via a global the bundle replaces) rather than crashing.
function pageHtml(entryName) {
  return `<!DOCTYPE html>
<html lang="sa">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${entryName} — देवभाषा</title>
<style>
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f4f1ea; }
  #__err { white-space: pre-wrap; font-family: ui-monospace, monospace; color: #a33;
           background: #fff5f5; border: 1px solid #f3c0c0; border-radius: 8px;
           margin: 20px; padding: 16px 20px; font-size: 13px; }
  #मूलम् { min-height: 100vh; }
</style>
</head>
<body>
<div id="मूलम्"></div>
<script>
  // live reload over Server-Sent Events
  try {
    const es = new EventSource('/__live');
    es.addEventListener('reload', () => location.reload());
  } catch (e) {}
</script>
<script src="/__bundle.js"></script>
</body>
</html>`;
}

// Wrap a compiled bundle so the DOM runtime mounts to #मूलम् by default and
// any runtime error is shown on the page.
function wrapBundle(code) {
  return `(function(){
  var __root = document.getElementById('मूलम्');
  try {
${code}
  } catch (e) {
    var d = document.createElement('div'); d.id = '__err';
    d.textContent = 'दोषः (runtime): ' + (e && e.message || e);
    document.body.appendChild(d);
    console.error(e);
  }
})();`;
}

function errorPageScript(message) {
  return `(function(){
  var d = document.createElement('div'); d.id = '__err';
  d.textContent = ${JSON.stringify(message)};
  document.body.appendChild(d);
})();`;
}

export function serve(entry, { port = 5173, open = false } = {}) {
  const entryName = basename(entry);
  const clients = new Set();           // open SSE responses

  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(pageHtml(entryName));
      return;
    }
    if (req.url === '/__bundle.js') {
      const built = buildBundle(entry);
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(built.ok ? wrapBundle(built.code) : errorPageScript(built.error));
      return;
    }
    if (req.url === '/__live') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('retry: 1000\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    res.writeHead(404); res.end('not found');
  });

  function notifyReload() {
    for (const res of clients) { try { res.write('event: reload\ndata: 1\n\n'); } catch {} }
  }

  // Watch the entry's directory so edits to it OR its imports trigger a reload.
  // Debounced — editors often fire several events per save.
  let timer = null;
  const dir = dirname(entry) || '.';
  let watcher = null;
  try {
    watcher = watch(dir, { persistent: true }, (_evt, fname) => {
      if (fname && !/\.deva$/.test(fname)) return;   // only .deva changes
      clearTimeout(timer);
      timer = setTimeout(() => {
        const built = buildBundle(entry);
        console.log(built.ok ? `↻ recompiled ${entryName}` : `✗ ${entryName} has errors (shown in browser)`);
        notifyReload();
      }, 60);
    });
  } catch (e) {
    console.error('चेतावनी: file watching unavailable — live reload disabled.');
  }

  server.listen(port, () => {
    // initial build feedback
    const built = buildBundle(entry);
    if (!built.ok) console.log(`✗ ${entryName} has errors (shown in browser):\n` + built.error);
    console.log(`\n  देवभाषा dev server\n  ▸ http://localhost:${port}/\n  watching ${entryName} for changes (live reload on)\n`);
  });

  return {
    server,
    close() { if (watcher) watcher.close(); for (const r of clients) { try { r.end(); } catch {} } server.close(); },
  };
}
