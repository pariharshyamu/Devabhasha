# पूर्णस्तर — a full-stack app in Devabhāṣā

Both ends of a web app, written in one Sanskrit language — and the whole backend
arc behind it:

- **अग्रिम.deva** — the *frontend*. Runs in the browser; fetches the book list
  from the backend (`जाल.आनयप्रदत्त`) and renders it reactively (`भाव`/`प्रभाव`),
  with a form that POSTs a new book, a ✕ that DELETEs one, and a status line that
  shows the backend's **validation error** when a body is rejected.
- **पश्चिम.deva** — the *backend*. A Devabhāṣā HTTP service on the full modern
  stack:
  - **`मार्गकः`** routes by method + path (`प्राप्`/`स्थापय`/`निष्कासय`, with a
    `:अङ्कः` path param),
  - **`सञ्चयः`** persists the books in **SQLite** (the durable v2 of the document
    store) — restart the server and the data is still there,
  - **`आकृति`** validates every POST body at the door, so a malformed book comes
    back as a `422` with a path-qualified reason instead of corrupting the store.

The two halves share the language, the **`परिणाम` error model**, and the JSON
shapes — the frontend's `परिणाम` from `आनयप्रदत्त` inspects the same
`सफल`/`मूल्यम्`/`दोषः` the backend produces.

## The routes

| Method + path | does |
|---|---|
| `GET /` | serves the HTML page running the compiled frontend |
| `GET /api/ग्रन्थाः` | the book list as JSON (from the database) |
| `POST /api/ग्रन्थाः` | validate (`आकृति`) + persist (`सञ्चयः`) a book → `201`, or `422` |
| `DELETE /api/ग्रन्थाः/:अङ्कः` | delete by id |

## Run it

```
node चालय.mjs
```

This compiles `अग्रिम.deva` to a browser bundle (DOM runtime + a browser fetch
shim), then runs `पश्चिम.deva` on Node, which serves it. Open
<http://localhost:8100>. A `ग्रन्थालयः.db` file appears next to the sources on
first run and is seeded with two books; it is git-ignored, and deleting it just
re-seeds on the next start.

## The honest scope

This is a demonstration that Devabhāṣā can express a full-stack app end to end,
now on the real stdlib — a router, a SQLite-backed store, and schema validation,
all themselves written in Devabhāṣā. The one piece of scaffolding left is the
build harness (`चालय.mjs`), a small Node script: a `.deva` program can compile
another, but it can't yet bundle-and-serve *itself* in one step, so the harness
wires the frontend build to the backend run. Everything it wires together —
frontend, router, persistence, validation — is Sanskrit source.
