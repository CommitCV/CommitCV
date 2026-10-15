# CommitCV - V3

V3 of CommitCV is a complete rewrite of CommitCV, taking it from a 24-hour
vibe-coded hackathon program to a well-planned, smooth, & robust application
that you can trust to manage your resume (and hopefully more!).

## What's New?

- Local-first Typst Web Assembly Compiler
    - This means more more slow, server-compiled tex to render and download
      your resume
- Version control with git integration
- Standardized UI, Components, Fonts, etc.
- Human-authored-only Code
- Infrastructure moved to Vite + React + TailwindCSS V4

## Development

Clone the repo and run:

```bash
pnpm install
pnpm dev
```

Then open the local Vite URL in your browser.

### Production

Build and run the production server:

```bash
pnpm build
pnpm server
```

The server serves the built frontend and handles GitHub OAuth and proxy
requests. Use `.env.example` for local configuration.

## Documentation

Read the [project documentation](docs/index.md), or build it with MkDocs:

```bash
mkdocs serve
```

## Checks

```bash
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```
