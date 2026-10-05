# Path aliases

The frontend uses aliases for the main boundaries:

- `@components` for UI components
- `@hooks` for React hooks
- `@store` for Zustand state
- `@resume` for the resume domain
- `@typst` for emission and compilation
- `@storage` for persistence adapters

Each alias is declared in the Vite and TypeScript configuration so editor
imports and builds resolve the same way.
