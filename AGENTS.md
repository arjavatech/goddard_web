# Repository Guidelines

## Project Structure & Module Organization
- Primary source lives in `src/` with `components/ui` for shadcn primitives, `components/dashboard` for feature widgets, and `services/{api,auth}` for API and Supabase helpers; keep feature-specific pages under `pages/` (e.g. `pages/admin`).
- `src/config/env.ts` centralizes environment parsing; reuse exported helpers rather than reading `import.meta.env` directly.
- Reference design docs in `docs/` before UI updates; `dist/` is Vite output and should be regenerated rather than edited.

## Environment & Configuration
- Copy `.env.example` to `.env` and supply the `VITE_SUPABASE_*` keys plus any API overrides; defaults enable mock APIs via `VITE_USE_MOCK_API=true`.
- Use the `VITE_BYPASS_AUTH` toggle for local flows; commit secrets only through deployment tooling, never in source.
- When adding new flags, extend the Zod schema in `src/config/env.ts` so validation fails fast in dev.

## Build, Test, and Development Commands
- `npm install` installs dependencies pinned by `package-lock.json`.
- `npm run dev` starts the Vite dev server with hot reloading; pair it with `.env` updates when toggling mock mode.
- `npm run build` emits production assets to `dist/`; `npm run preview` serves the build for smoke checks.
- `npm run lint` runs ESLint with the TypeScript and React Hooks rules—ensure a clean run before opening a PR.

## Coding Style & Naming Conventions
- TypeScript strict mode is enforced; prefer typed props/interfaces and avoid implicit `any`.
- Stick to 2-space indentation, PascalCase React components, and camelCase hooks/utilities; co-locate shared hooks in `src/lib`.
- Use the `@/` alias for absolute imports, Tailwind utility classes for styling, and `class-variance-authority` variants when introducing new UI primitives.

## Testing Guidelines
- An automated test runner is not yet wired in; new features should include a plan to introduce Vitest + React Testing Library with files alongside components as `*.test.tsx`.
- Until tests land, document manual verification steps (auth toggle used, routes exercised) in the PR and consider adding lightweight lint rules or storybook entries.
- Keep future tests deterministic by mocking Supabase/network clients via the adapters in `src/services`.

## Commit & Pull Request Guidelines
- Follow the conventional commit style used in history (`feat:`, `refactor:`, etc.) with concise, actionable subjects.
- Each PR should describe scope, list environment toggles touched, and attach UI screenshots or GIFs when visual changes occur.
- Link relevant issues, update `README.md` or `docs/` when behavior shifts, and request review only after lint/build checks pass.
