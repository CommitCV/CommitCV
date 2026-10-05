# Resume schema

Resume files are JSON documents with four top-level concepts:

- File metadata: filename, date, and schema version.
- Sections: ordered, toggleable resume blocks.
- Text entries: content plus formatting flags.
- Nested sections: optional children below a section.

Section types describe how content is rendered: a header, full text, two-column
split, or four-column split. Nested variants omit the top-level heading.

The parser validates uploaded and stored JSON before it enters the editor. It
rejects unknown section types, flags, missing required values, and mismatched
schema versions. Errors include the failing path so malformed files can be
fixed without guessing.
