# Devabhāṣā (देवभाषा) for VS Code

Language support for **Devabhāṣā** — the Sanskrit programming language that
compiles to JavaScript.

## Features
- **Syntax highlighting** for `.deva` files (keywords, strings, interpolation, Devanagari & ASCII numbers, the danda terminator)
- **Completion** — keywords, standard library, style vocabulary, and DOM tags
- **Hover** — what a Sanskrit word means
- **Go to definition** and **Rename** — scope-aware, across the file
- **Live diagnostics** — compile errors as you type
- **Run command** — `Devabhāṣā: Run current file`

The language intelligence is powered in-process by the same analyzer that backs
the Devabhāṣā language server — no separate process, no bundled language-client.

## Usage
Open any `.deva` file. Highlighting and diagnostics activate automatically.
