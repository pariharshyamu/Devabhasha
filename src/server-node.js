// server-node.js — the सेवक HTTP-server host primitive (Node backend).
//
// Mirrors io-node.js: a live `__SRV` object for `devabhasha run`, and an
// inlined `SRV_NODE_SOURCE` string for `devabhasha build` (self-contained).
//
// सेवक(handler, port) starts an http.createServer. The handler receives a
// request and a response object, both keyed in Devanagari (member access emits
// raw Devanagari, so the runtime object must expose those exact keys):
//
//   अनुरोधः (request):  मार्गः (url/path), रीतिः (method), शीर्षाणि (headers),
//                       प्रश्नाः (query params object), देहम्() → Promise<body text>,
//                       देहम्_जेसन() → Promise<Result<parsed JSON>>
//   प्रत्युत्तरम् (response): स्थिति(code), शीर्षम्(k,v), लेखय(text), प्रेषय_जेसन(value)
//
// The handler may be async (return a Promise); errors are caught and become 500.

import { createServer } from 'http';

// Build the Devanagari-keyed request wrapper around a Node IncomingMessage.
function makeRequest(req) {
  const url = new URL(req.url, 'http://localhost');
  const query = {};
  for (const [k, v] of url.searchParams) query[k] = v;
  let bodyText = null;
  const readBody = () => new Promise((resolve) => {
    if (bodyText != null) return resolve(bodyText);
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { bodyText = data; resolve(data); });
    req.on('error', () => resolve(''));
  });
  return {
    'मार्गः': decodeURIComponent(url.pathname),
    'रीतिः': req.method,
    'शीर्षाणि': req.headers,
    'प्रश्नाः': query,
    async 'देहम्'() { return readBody(); },
    async 'देहम्_जेसन'() {
      const t = await readBody();
      try { return { 'सफल': true, 'मूल्यम्': JSON.parse(t), 'दोषः': null }; }
      catch (e) { return { 'सफल': false, 'मूल्यम्': null, 'दोषः': 'JSON: ' + (e && e.message || e) }; }
    },
  };
}

// Build the Devanagari-keyed response wrapper around a Node ServerResponse.
function makeResponse(res) {
  const api = {
    'स्थिति'(code) { res.statusCode = code; return api; },          // set status, chainable
    'शीर्षम्'(k, v) { res.setHeader(k, v); return api; },            // set header, chainable
    'लेखय'(text) {                                                  // send text and end
      if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(text == null ? '' : String(text));
      return api;
    },
    'प्रेषय_जेसन'(value) {                                          // send JSON and end
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(value));
      return api;
    },
  };
  return api;
}

export const __SRV = {
  serve(handler, port) {
    const server = createServer(async (req, res) => {
      try {
        await handler(makeRequest(req), makeResponse(res));
        if (!res.writableEnded) res.end();            // handler forgot to respond
      } catch (e) {
        if (!res.headersSent) res.statusCode = 500;
        if (!res.writableEnded) res.end('सर्वर-दोषः (500): ' + (e && e.message || e));
      }
    });
    server.listen(port || 3000);
    return server;
  },
};

export const SRV_NODE_SOURCE = `// --- देवभाषा HTTP server (Node backend) ---
const __SRV = (() => {
  const { createServer } = require('http');
  function makeRequest(req) {
    const url = new URL(req.url, 'http://localhost');
    const query = {}; for (const [k, v] of url.searchParams) query[k] = v;
    let bodyText = null;
    const readBody = () => new Promise((resolve) => {
      if (bodyText != null) return resolve(bodyText);
      let data = ''; req.on('data', c => { data += c; });
      req.on('end', () => { bodyText = data; resolve(data); });
      req.on('error', () => resolve(''));
    });
    return {
      "मार्गः": decodeURIComponent(url.pathname), "रीतिः": req.method, "शीर्षाणि": req.headers, "प्रश्नाः": query,
      async "देहम्"() { return readBody(); },
      async "देहम्_जेसन"() { const t = await readBody(); try { return { "सफल": true, "मूल्यम्": JSON.parse(t), "दोषः": null }; } catch (e) { return { "सफल": false, "मूल्यम्": null, "दोषः": 'JSON: ' + (e && e.message || e) }; } },
    };
  }
  function makeResponse(res) {
    const api = {
      "स्थिति"(code){ res.statusCode = code; return api; },
      "शीर्षम्"(k, v){ res.setHeader(k, v); return api; },
      "लेखय"(text){ if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(text == null ? '' : String(text)); return api; },
      "प्रेषय_जेसन"(value){ res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(value)); return api; },
    };
    return api;
  }
  return {
    serve(handler, port) {
      const server = createServer(async (req, res) => {
        try { await handler(makeRequest(req), makeResponse(res)); if (!res.writableEnded) res.end(); }
        catch (e) { if (!res.headersSent) res.statusCode = 500; if (!res.writableEnded) res.end('सर्वर-दोषः (500): ' + (e && e.message || e)); }
      });
      server.listen(port || 3000);
      return server;
    },
  };
})();
`;
