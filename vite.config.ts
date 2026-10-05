import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import eslint from "vite-plugin-eslint";

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            "@components": "/src/components",
            "@hooks": "/src/hooks",
            "@store": "/src/store",
            "@resume": "/src/resume",
            "@typst": "/src/typst",
            "@storage": "/src/storage",
        },
    },
    plugins: [react(), tailwindcss(), eslint()],
    test: {
        environment: "node",
        include: ["src/**/*.test.ts", "server/**/*.test.ts"],
    },
});
