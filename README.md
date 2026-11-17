# CineScope

A responsive movie and TV discovery frontend built with React, strict TypeScript, Vite, Tailwind CSS, shadcn/Radix primitives, Redux Toolkit, RTK Query, React Router, React Hook Form, Zod, and Sonner.

## Run locally

Use Node.js 20.19+ or 22.12+ and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open the URL Vite prints, normally http://localhost:5173. The default is mock mode and runs without Django. Continue as Guest to browse. For a demo account use any valid email and any nonempty password. The demo has one account persona, stores no password, sends no emails, and performs no real Google authentication.

## Environment switching

`.env.example` includes commented local and deployed URL options. Copy it to `.env.local`, select the values, then restart Vite. Vite embeds public `VITE_*` values at build time, so redeploy when those values change.

- `VITE_API_MODE=mock` starts MSW before React mounts. `live` uses Django directly through the configured API prefix.
- `VITE_API_BASE_URL=/api/v1/` is the recommended browser API prefix for both local and deployed environments.
- `API_PROXY_TARGET=http://localhost:8000` directs Vite's `/api` and `/accounts` development proxy to local Django. A commented option points to `https://movie-trail-py.vercel.app`.
- `VITE_APP_URL` may be blank to use the current origin, or set to `http://localhost:5173` or `https://movie-trail-ui.vercel.app` for demo share URLs.
- Direct backend API URL options are provided for catalogue testing. Session authentication between unrelated Vercel domains uses the same-origin proxy described in the contract.

Backend documentation is at https://movie-trail-py.vercel.app/api/docs. The product API prefix is `/api/v1/`.

## Implemented routes

- `/` provides Guest, Google, and Email entry.
- `/discover` provides title and people search, AND genre filters, year/runtime ranges, rating, language, sort, recommendation tools, recent activity, feeds, and snapshot pagination.
- `/library` provides saved titles, watchlist, watched titles, custom collections, and automatic groups. `?tab=custom` opens collections.
- `/library/collections/:id` opens a custom or automatic collection.
- `/shared/:token` provides a public read-only collection. `/shared/demo` is a sample mock collection.
- `/auth/verify` and `/auth/reset-password` consume email-link tokens through the API. Tokens are removed from the address bar on page entry and held in memory until submission.
- Unknown routes show the 404 screen.

Trailer details open in a focus-trapped Radix overlay. Escape closes it. The underlying page remains mounted, retaining filters, pagination, and scroll. A single YouTube iframe is mounted at a time. Queue navigation loads later discovery pages when necessary. Titles without fixture trailers display the unavailable state.

Create/edit/delete, multi-collection save, sharing, authentication, mood, and guest synchronization use reusable dialogs. Collection deletion has a confirmation step. Automatic collections are read-only.

## State and API architecture

`src/store` contains typed UI and guest slices. `src/hooks` contains typed Redux hooks and the common library adapter. Guest writes use the latest store snapshot so consecutive collection mutations preserve previous changes.

`src/services/base-api.ts` centralizes credentials, masked CSRF bootstrapping, and headers. CSRF remains in memory. Django session cookies remain browser-managed. Public shared reads omit credentials. `src/services/api.ts` defines metadata, discovery, people, details, recommendations, auth/profile, recent, library, collection membership, sharing, public collections, and sync endpoints with cache invalidation.

OpenAPI types are generated from `docs/openapi.yaml` into `src/types/api.generated.ts`. Regenerate with `npm run types:generate`. `docs/API_CONTRACT.md` supplies the additional cross-field rules.

RTK Query owns server state. React Router search parameters own shareable discovery filters. Redux owns dialogs, trailer queues, the user session view, and guest data. Feature folders contain the screen components and interactions.

## Guest persistence and synchronization

The versioned `cinescope:guest:v1` localStorage entry stores normalized title summaries, watched state and timestamps, collections, and recent activity. Movie and TV identity always uses both `media_type` and `tmdb_id`. Invalid storage recovers to an empty library. Guest limits are 500 saved titles and 20 collections, matching one sync payload's capacity.

Saving watched status retains the title. Explicit unsave removes custom memberships. Guest automatic groups cover genres, decades, rating >= 8, movies, TV, and watched status.

Sign-in offers an explicit import when guest data exists. Not Now preserves it. Pending sync snapshots and immutable payloads are retained in sessionStorage so retries reuse the same sync ID and body. Success clears only accepted, unchanged records and retains concurrent edits and rejected titles. Recent activity remains local and is excluded from sync. Guest and account data use separate namespaces.

## Mock coverage and content

`src/mocks` contains separate fixtures, filtering logic, MSW handlers, and the browser worker. The handlers intercept the same `/api/v1/` paths used by live mode. They simulate catalogue filters/sorting, immutable snapshots, pagination, details, authentication, account library, recent activity, collections, membership, sharing/revocation, recommendation moods, and sync receipts.

Demo mutations persist in this browser. Demo share links have browser-local scope. Real cross-device sharing and secure authentication require Django. Search for `error` to exercise the demo upstream-error state. A nonmatching title exercises empty results. An unknown shared token returns 404. A stale snapshot returns 410.

Movie metadata and ratings are representative fixture values. New Releases follows the last 90 days and may be empty because fixtures are historical. No provider availability is fabricated. Trailer fixtures use known public trailers for Dune: Part Two, Interstellar, and Oppenheimer. Other titles exercise the no-trailer state. Poster artwork reuses approved Stitch assets, with text artwork fallbacks for missing images.

The frontend has no direct TMDB JSON requests. Images may use returned CDN URLs. Video embeds use YouTube. TMDB and JustWatch attribution appears in the UI.

## Design and contract decisions

The implementation follows the seven finalized screens in https://stitch.google.com/projects/2796373769027149979, using the exported charcoal/blue palette, Outfit headings, and Inter body type. Desktop layouts adapt into mobile grids, horizontal rails, compact navigation, stacked filters, and full-screen trailer dialogs.

The exported screens still contained some removed functionality and fictional hardware/provider copy. The explicit product brief governs implemented features and content. The welcome illustration uses a restrained CSS fallback. Placeholder assets in the sync design are replaced by the guest's actual saved poster previews.

The contract's Collection and PublicCollection schemas contain no description field. Guest descriptions are local-only and excluded from API/sync payloads. Account collection editing and public sharing use the supported name field. Trailer IDs follow the trailer schema despite its copied collection-ID description. No incompatible API fields were added.

## Verification

```sh
npm run test
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run preview
```

Vitest and Testing Library run critical storage and DOM/network journeys against MSW. They cover guest save/persistence, multi-collection saving, watched preservation, filters, recommendations, trailer queue cleanup, mock sign-in, explicit sync, idempotency, share revocation, and snapshots. Browser visual and viewport QA needs a browser session that permits automation. Live Google OAuth, email delivery, cookie/proxy behavior, and actual backend data need end-to-end testing against deployed Django.

## Vercel

Use the repository root, Vite preset, `npm ci`, `npm run build`, and output directory `dist`. Set `VITE_API_MODE=mock` for the demo or `live` for Django integration.

`vercel.json` routes `/api/*` and `/accounts/*` to `https://movie-trail-py.vercel.app` before the SPA fallback. Django must trust the frontend origin, preserve host-only session/CSRF cookies through the proxy, and configure its public callback and frontend origin according to the contract. Confirm Set-Cookie forwarding, redirects, and CSRF on the deployed topology before using real authentication.

The frontend deployment is https://movie-trail-ui.vercel.app. This implementation does not publish or push automatically.

### API proxy routing and verification

The API and OAuth rewrites use named `(.*)` captures so trailing slashes reach Django. Vercel compiles rewrite sources with strict path matching. The previous `/api/:path*` and `/accounts/:path*` patterns matched slashless requests but missed Django's slash-ending URLs. Django's append-slash redirect then landed on the unrestricted SPA fallback and returned HTML. The fallback now explicitly excludes the `api` and `accounts` namespaces. Missing backend routes retain the backend response.

Regression tests use Vercel's actual `@vercel/routing-utils` compiler to reproduce the old failure and check API paths, OAuth callbacks, query strings, and frontend deep links. The compiler implementation is available in [Vercel's routing source](https://github.com/vercel/vercel/blob/main/packages/routing-utils/src/superstatic.ts).

The existing deployed JavaScript was checked during diagnosis and already contained live mode, `/api/v1/`, and `https://movie-trail-ui.vercel.app`. GitHub's Vercel status reported the current `7a00f00` source commit, and that commit included the rewrite configuration. `vercel.json` is tracked and is not ignored. There are no repository middleware, build-output route overrides, legacy `routes` entries, or `.vercelignore` files. Authenticated Vercel Root Directory and project-level routing settings were unavailable for direct inspection. The slashless requests reaching Django independently demonstrate that the production proxy rules are active.

For Vercel Git deployments, keep Root Directory at the repository root, the Vite framework preset, `npm run build`, and `dist` output. Keep production `VITE_API_MODE=live`, `VITE_API_BASE_URL=/api/v1/`, and `VITE_APP_URL=https://movie-trail-ui.vercel.app`. Deploy from the repository root so Vercel reads `vercel.json`. Uploading only `dist` omits this configuration. A separately configured CDN catch-all, if present, must exclude API/OAuth namespaces because project-level rules precede deployment routes.

After an authorized deployment, run the read-only verification command. It exits unsuccessfully for HTML responses, HTTP errors, or invalid endpoint shapes.

```sh
npm run verify:deployment
# Or verify a specific authorized deployment URL
npm run verify:deployment -- https://your-deployment.vercel.app
```

It checks frontend-domain health, metadata, and titles JSON. Then open `/discover`, confirm real title cards and genres render, and inspect the browser Network panel for same-origin JSON responses. A local build or passing route test alone does not verify the released deployment.
