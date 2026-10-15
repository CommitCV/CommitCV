// vite-plugin-eslint ships no type declarations that resolve under
// bundler module resolution; this matches its runtime shape.
declare module "vite-plugin-eslint" {
    import type { Plugin } from "vite";
    const vitePluginEslint: (options?: unknown) => Plugin;
    export default vitePluginEslint;
}
