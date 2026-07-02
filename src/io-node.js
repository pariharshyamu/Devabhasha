// io-node.js — the Node backend for the __IO interface.
//
// Layered design: a Devabhāṣā program calls सञ्चिका.पठ / जाल.आनय, which the
// codegen lowers to __IO.file.read / __IO.net.fetch. The program is bound to
// the __IO *interface*, never to Node — this file is one concrete backend.
// A browser backend or an in-memory test backend can implement the same
// shape and be injected instead.
//
// THE __IO CONTRACT (every operation is async and returns a परिणाम/Result):
//   __IO.file.read(path)            → Promise<Result<string>>
//   __IO.file.write(path, data)     → Promise<Result<true>>
//   __IO.file.exists(path)          → Promise<Result<boolean>>
//   __IO.file.remove(path)          → Promise<Result<true>>
//   __IO.file.list(dir)             → Promise<Result<string[]>>
//   __IO.net.fetch(url, options?)   → Promise<Result<{ status, text, ok }>>
//
// A Result is { सफल: boolean, मूल्यम्: value, दोषः: error } — the same shape
// the __RT prelude produces, so awaited results inspect with फल.सफल etc.

import { readFile, writeFile, unlink, readdir, access } from 'fs/promises';

const ok = (v) => ({ 'सफल': true, 'मूल्यम्': v, 'दोषः': null });
const err = (e) => ({ 'सफल': false, 'मूल्यम्': null, 'दोषः': String(e && e.message || e) });

export const __IO = {
  file: {
    async read(path) {
      try { return ok(await readFile(path, 'utf8')); }
      catch (e) { return err(e); }
    },
    async write(path, data) {
      try { await writeFile(path, String(data), 'utf8'); return ok(true); }
      catch (e) { return err(e); }
    },
    async exists(path) {
      try { await access(path); return ok(true); }
      catch { return ok(false); }   // absence is not an error — it's `false`
    },
    async remove(path) {
      try { await unlink(path); return ok(true); }
      catch (e) { return err(e); }
    },
    async list(dir) {
      try { return ok(await readdir(dir)); }
      catch (e) { return err(e); }
    },
    async readJson(path) {            // read + parse JSON → परिणाम
      try {
        const text = await readFile(path, 'utf8');
        try { return ok(JSON.parse(text)); }
        catch (e) { return err('JSON: ' + (e && e.message || e)); }
      } catch (e) { return err(e); }
    },
    async writeJson(path, value) {    // serialize + write
      try { await writeFile(path, JSON.stringify(value, null, 2), 'utf8'); return ok(true); }
      catch (e) { return err(e); }
    },
  },
  net: {
    async fetch(url, options) {
      try {
        const res = await fetch(url, options || undefined);
        const text = await res.text();
        return ok({ 'स्थितिः': res.status, 'पाठः': text, 'सफलम्': res.ok });
      } catch (e) { return err(e); }
    },
    async fetchJson(url, options) {   // fetch + parse JSON → परिणाम
      try {
        const res = await fetch(url, options || undefined);
        const text = await res.text();
        try { return ok({ 'स्थितिः': res.status, 'प्रदत्तम्': JSON.parse(text), 'सफलम्': res.ok }); }
        catch (e) { return err('JSON: ' + (e && e.message || e)); }
      } catch (e) { return err(e); }
    },
  },
  // पर्यावरण — an environment variable's value, or null when unset (so
  // `पर्यावरण("PORT") अथवा "8080"` supplies a default).
  env(name) { return process.env[name] ?? null; },
};

// A source string that defines the same __IO for embedding in `build` output.
// (For build, we inline the backend so the produced .js is self-contained
// when run under Node.)
export const IO_NODE_SOURCE = `// --- देवभाषा I/O (Node backend) ---
const __IO = (() => {
  const { readFile, writeFile, unlink, readdir, access } = require('fs/promises');
  const ok = (v) => ({ "सफल": true, "मूल्यम्": v, "दोषः": null });
  const err = (e) => ({ "सफल": false, "मूल्यम्": null, "दोषः": String(e && e.message || e) });
  return {
    file: {
      async read(p){ try { return ok(await readFile(p,'utf8')); } catch(e){ return err(e); } },
      async write(p,d){ try { await writeFile(p,String(d),'utf8'); return ok(true); } catch(e){ return err(e); } },
      async exists(p){ try { await access(p); return ok(true); } catch { return ok(false); } },
      async remove(p){ try { await unlink(p); return ok(true); } catch(e){ return err(e); } },
      async list(dir){ try { return ok(await readdir(dir)); } catch(e){ return err(e); } },
      async readJson(p){ try { const t = await readFile(p,'utf8'); try { return ok(JSON.parse(t)); } catch(e){ return err('JSON: '+(e&&e.message||e)); } } catch(e){ return err(e); } },
      async writeJson(p,v){ try { await writeFile(p,JSON.stringify(v,null,2),'utf8'); return ok(true); } catch(e){ return err(e); } },
    },
    net: {
      async fetch(url, options){ try { const res = await fetch(url, options||undefined); const text = await res.text(); return ok({ "स्थितिः": res.status, "पाठः": text, "सफलम्": res.ok }); } catch(e){ return err(e); } },
      async fetchJson(url, options){ try { const res = await fetch(url, options||undefined); const text = await res.text(); try { return ok({ "स्थितिः": res.status, "प्रदत्तम्": JSON.parse(text), "सफलम्": res.ok }); } catch(e){ return err('JSON: '+(e&&e.message||e)); } } catch(e){ return err(e); } },
    },
    env(name){ return process.env[name] ?? null; },
  };
})();
`;
