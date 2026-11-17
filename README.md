# CineScope

A minimal React and TypeScript frontend for discovering movies and TV series.

## Local setup

Use Node.js 22.12+ (or 20.19+) and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

In PowerShell, use `Copy-Item .env.example .env.local` for the copy step. Open the URL printed by Vite, normally http://localhost:5173.

`VITE_API_BASE_URL` configures the base URL for future backend requests and defaults to `/api`. The starter runs without a backend. Vite embeds `VITE_*` values in the browser bundle, so use public configuration values. Restart the dev server after editing environment variables.

## Commands

- `npm run dev` starts the development server.
- `npm run lint` checks ESLint rules with zero warnings allowed.
- `npm run typecheck` checks the app and Vite configuration with TypeScript.
- `npm run format` formats source and configuration files with Prettier.
- `npm run format:check` checks formatting.
- `npm run build` type-checks and produces the production bundle in `dist`.
- `npm run preview` serves the production build locally.

## Project structure

```text
src/
  components/ui/     shadcn/ui components
  hooks/             Typed Redux hooks and future shared hooks
  lib/               Shared utilities, including cn()
  pages/             Homepage and 404 page
  services/          RTK Query base API
  store/             Typed Redux store and example UI slice
  types/             Shared declarations and environment types
  App.tsx            Route definitions
  main.tsx           React entry point and providers
  index.css          Tailwind imports and shadcn theme tokens
```

The `@/` alias points to `src/` in both TypeScript and Vite. The homepage reads the example `showReadyStatus` UI state. Use `useAppDispatch` and `useAppSelector` from `@/hooks/redux` for typed Redux access.

RTK Query's reducer and middleware are registered in the store. Future service modules can extend `baseApi` with `injectEndpoints`. The API currently has an empty endpoint definition.

Tailwind CSS uses the official Vite plugin. shadcn/ui is configured in `components.json`, with theme variables in `src/index.css`. Add components as needed with `npx shadcn@latest add <component>`. Future Stitch designs can use the existing pages, shared components, and theme tokens.

## Vercel deployment

1. Push the repository to your Git host and import it into Vercel.
2. Use the repository root as the Root Directory and select the Vite framework preset.
3. Use `npm ci` as the install command, `npm run build` as the build command, and `dist` as the output directory.
4. Set `VITE_API_BASE_URL` in Vercel when a backend is available. Set it for each required environment, then redeploy to embed the value in the bundle.
5. Deploy. Check `/` and a direct visit to an unknown path to verify the homepage and client-side 404 route.

`vercel.json` supplies the Vite build settings and rewrites SPA paths to `index.html`, so direct visits and refreshes reach React Router. Static assets are served normally. For other static hosts, publish `dist` and configure the equivalent SPA fallback.

## Configuration references

- [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [shadcn/ui with Vite](https://ui.shadcn.com/docs/installation/vite)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
