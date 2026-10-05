# Typst preview

The browser compiles resume content with Typst WASM. The template, Font
Awesome package, and fonts are served from the application, so resume text is
not sent to a third-party renderer.

```mermaid
flowchart LR
    json[Resume JSON] --> emitter[Typst source]
    emitter --> compiler[Typst WASM]
    compiler --> svg[SVG preview]
    compiler --> pdf[PDF download]
```

The emitter escapes user text before adding formatting markup. Standalone Typst
exports inline the template and icon package so the file can be opened outside
CommitCV.
