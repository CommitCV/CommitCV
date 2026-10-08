# Testing

Run the fast checks with:

```bash
pnpm lint
pnpm test
pnpm build
```

Playwright tests cover the user-visible editor flow. Install a browser once,
then run the suite or the smoke subset:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:smoke
```

Unit tests cover parsing, legacy import, editing, text formatting, drag and
drop, undo history, Typst emission, the compile worker client, storage
adapters, and the server proxy. E2E tests use keyboard and pointer interactions, and focus on
behaviors that unit tests cannot observe.
