# पूर्णस्तर — a full-stack app in Devabhāṣā

Both ends of a web app, written in one Sanskrit language:

- **अग्रिम.deva** — the *frontend*. Runs in the browser; fetches the book list
  from the backend (`जाल.आनयप्रदत्त`) and renders it reactively (`भाव`/`प्रभाव`),
  with a form that POSTs a new book and re-renders on success.
- **पश्चिम.deva** — the *backend*. A Devabhāṣā HTTP server (`सेवक`) that serves
  the HTML page (with the compiled frontend embedded) at `/`, and a JSON API at
  `/api/ग्रन्थाः` (GET list, POST add).

The two halves share the language, the **Result error model**, and the JSON
shapes — the frontend's `परिणाम` from `आनयप्रदत्त` inspects the same
`सफल`/`मूल्यम्`/`दोषः` the backend produces.

## Run it

```
node चालय.mjs
```

This compiles `अग्रिम.deva` to a browser bundle (DOM runtime + a browser fetch
shim), then runs `पश्चिम.deva` on Node, which serves it. Open
<http://localhost:8100>.

## The honest scope

This is a demonstration that Devabhāṣā can express a full-stack app end to end —
not a production stack. The backend is the minimal `सेवक` primitive (no routing
library yet), and the build harness (`चालय.mjs`) is a small Node script because
a `.deva` program can't yet invoke the compiler on itself. What it *does* prove:
a reactive Sanskrit frontend and a Sanskrit HTTP/JSON backend genuinely talking
to each other over real HTTP.
