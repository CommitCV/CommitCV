import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-plugin-prettier/recommended";

export default defineConfig([
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    plugins: { 
	    js,
	    "@typescript-eslint": tseslint.plugin,
	    react: pluginReact,
	    "react-hooks": reactHooks,
	    "react-refresh": reactRefresh
    },
    settings: {
	    react: { version: "detect" },
    },
    extends: [
	    js.configs.recommended,
	    ...tseslint.configs.recommended,
	    pluginReact.configs.flat.recommended,
	    jsxA11y.flatConfigs.recommended,
	    prettier
    ],
    languageOptions: { globals: globals.browser },
    rules: {
	...reactRefresh.configs.vite.rules,
	...reactHooks.configs.flat.recommended.rules,
	"react/react-in-jsx-scope": ["off"],

    }
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
]);
