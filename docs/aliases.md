# Path Aliases

Path Aliases are used for shortening import paths. For instance, instead
of writing:

```ts
import Header from "../../components/header";
```

We can instead write:

```ts
import Header from "@components/header";
```

---

## Setting up a new Path Alias

Since we are using Vite, setting up path aliases is not as simple as
modifying `tsconfig.json` for reasons unknown to me. In this example we
will set up an alias for `public/img/branding/`, called '@branding'.

We must modify $3$ separate files to properly set up a new alias. First
is both `tsconfig.json` **and** `tsconfig.app.json`, where we add the
following:

```json
"compilerOptions": {
  "baseUrl": "./",
  "paths": {
    "@components/*": ["src/components/*"],
    "@branding/*": ["public/img/branding/*"]
  }
}
```

Then we modify `vite.config.ts`:

```ts
export default defineConfig({
  resolve: {
    alias: {
      '@components': '/src/components',
      '@branding': '/public/img/branding',
    },
  },
  plugins: [react()]
})
```

That's it! You can now use `import <whatever> from '@branding';`
