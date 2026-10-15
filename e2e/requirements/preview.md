# Feature: preview

## Happy paths

- [initial render]: a new resume exposes a live preview surface
- [edit render]: editing resume content eventually updates the rendered preview

## Edge cases

- [rapid edits]: several quick edits leave one current preview rather than a stale result
- [long document]: content beyond the first page appears on a second preview page
