// io-browser.js — the browser backend for the layered I/O interface (__IO).
//
// The frontend half of a full-stack Devabhāṣā app runs in the browser and uses
// जाल (network) to talk to its backend. The codegen lowers जाल.आनय /
// आनयप्रदत्त to __IO.net.fetch / fetchJson, so a browser page that runs a
// compiled frontend needs an __IO whose `net` uses the browser's native fetch.
//
// File ops have no meaning in a browser, so सञ्चिका.* returns a clear failure
// Result rather than throwing — keeping the same program runnable on either
// host, with the Result telling it what isn't available here.
//
// Exported as a source string (like IO_NODE_SOURCE) so the server can prepend
// it to the frontend bundle it serves.

export const IO_BROWSER_SOURCE = `// --- देवभाषा I/O (browser backend) ---
const __IO = (() => {
  const ok = (v) => ({ "सफल": true, "मूल्यम्": v, "दोषः": null });
  const err = (e) => ({ "सफल": false, "मूल्यम्": null, "दोषः": String(e && e.message || e) });
  const noFile = async () => err('file I/O is not available in the browser');
  return {
    file: {
      read: noFile, write: noFile, exists: async () => ok(false),
      remove: noFile, list: noFile, readJson: noFile, writeJson: noFile,
    },
    net: {
      async fetch(url, options){ try { const res = await fetch(url, options||undefined); const text = await res.text(); return ok({ "स्थितिः": res.status, "पाठः": text, "सफलम्": res.ok }); } catch(e){ return err(e); } },
      async fetchJson(url, options){ try { const res = await fetch(url, options||undefined); const text = await res.text(); try { return ok({ "स्थितिः": res.status, "प्रदत्तम्": JSON.parse(text), "सफलम्": res.ok }); } catch(e){ return err('JSON: '+(e&&e.message||e)); } } catch(e){ return err(e); } },
    },
    env(){ return null; },   // no environment variables in the browser
  };
})();
`;
