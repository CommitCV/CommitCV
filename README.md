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
npm i
npm run dev
```

Then open `localhost:5173` in your browser.

### Code Linting/Formatting

Linting and formatting is done automatically using ESLint and Prettier. The formatting and linting should get done automatically when you use `git commit` to commit your code from the CLI.

You can also run them manually using `npm run lint` and `npm run lint:fix` to lint, and lint and fix respectively.

For formatting you can run `npx run prettier . --write` to format all files in the current directory and lower.
