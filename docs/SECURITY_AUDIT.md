# CineScope frontend security audit

Reviewed 18 November 2026. The hardening changes described here are local changes awaiting an authorized deployment. Production observations concern the previously deployed application.

## A. Findings

### Critical

No critical issue or exposed secret was found in the inspected frontend. Pattern scans covered 61 tracked files and five reachable Git commits. This is a bounded source/history review, not a guarantee about deleted Git objects, external repositories, or dashboard secrets.

### High

**Development dependency advisories remain.** The initial npm audit reported 22 affected packages, including transitive entries. A compatible `path-to-regexp` update reduced this to 20 entries, comprising 18 high and two moderate findings. The production dependency audit reports zero findings.

The remaining high entries propagate from [picomatch's ReDoS advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) through globbing/build tools, including Vite, Vitest, typescript-eslint, and the shadcn CLI. Its latest registry release was 4.0.7 and the advisory listed no patched release at review time. Ordinary movie searches and guest inputs are not passed to these build-tool glob parsers. Avoid running the tools on untrusted source trees or exposing the development server publicly. This review did not demonstrate a production browser exploit through these dependencies.

The two moderate entries concern minimatch and its ts-morph dependency chain. The [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) requires 11.0.1 or later, outside the affected consumer's supported major. An untested major override or audit-driven downgrade of Vite/shadcn was not applied. Upstream-compatible updates remain necessary.

### Medium

1. **Unvalidated URL sinks.** `features/auth/auth.tsx` passed the returned OAuth URL directly to `window.location.assign`. `features/titles/trailer-modal.tsx` used the returned availability link directly as an anchor destination. An unexpected API value such as a JavaScript URL could reach an executable browser sink. `lib/security.ts` now allows only the expected Google/allauth authorization destinations and HTTPS TMDB availability links. The backend must still enforce OAuth state and its return-URL allowlist.
2. **Session cache boundaries.** `store/index.ts`, `store/ui-slice.ts`, and session restoration previously cleared the displayed user on a session-check 401 without consistently purging private RTK Query data or account-related dialogs. A different identity could reuse cache keys belonging to the previous account. Identity changes and expired authenticated requests now clear the cache, CSRF memory, and account-related dialogs while preserving guest storage.
3. **Missing document-level browser headers.** The deployed Discover response had no CSP, frame restriction, nosniff, Referrer-Policy response header, or Permissions-Policy. The HTML already supplied a no-referrer meta tag. `vercel.json` now defines the additional protections for frontend documents/assets, leaving API/OAuth response headers under Django's control. These additions have been tested locally and require deployment.

### Low and defensive improvements

4. **Arbitrary image requests.** `movie-card.tsx` accepted any image URL from API/guest data. This could contact an unintended origin even though React escaped text. Posters now accept only HTTPS TMDB images and the existing Stitch demo image source. Invalid images use the existing fallback.
5. **Unbounded guest documents and unchecked sync jobs.** `features/guest/storage.ts` validated field types but did not bound record counts or string/document sizes. `collections/dialogs.tsx` cast pending sessionStorage jobs without runtime validation. Size/schema checks now bound parsing and persistence. Retry jobs must match their validated frozen snapshot and current owner. An account change during sync prevents local guest cleanup.
6. **Raw error detail reflection.** `hooks/use-library.ts` previously displayed arbitrary exception and server error messages. It now uses local messages for known API codes/statuses and a generic fallback. OAuth result parameters also receive a fixed message. React text escaping was already present; this finding concerns information disclosure and misleading messages rather than HTML execution.
7. **Credentialed destination/configuration guard.** `lib/config.ts`, `.env.example`, and `services/base-api.ts` now keep requests on `/api/v1/` behind the same-origin proxy, reject off-origin/off-prefix destinations, reject fetch redirects, omit credentials on public shared reads, and use no-store for auth/private requests. Public build settings can no longer silently switch authenticated calls to another host.
8. **Request preparation and malformed paging.** Writes stop if CSRF bootstrap fails, preserve caller `Headers`, and reject a bootstrap result belonging to an earlier session. Collection identities are validated/encoded. Share tokens and paging values are bounded, malformed next URLs are handled safely, and cyclic pagination stops with an error. These improvements prevent request confusion and availability failures; they do not replace Django authorization or CSRF validation.
9. **Production DevTools.** `store/index.ts` disables Redux DevTools outside development because authentication action arguments can contain passwords. No authentication secret was found in persistent browser storage.

## B. Fixes and compatibility

- Added `src/lib/security.ts` for URL, video-ID, paging, share-token, and collection-path validation.
- Added `src/lib/validation.ts` to configure Zod before schema creation. Its interpreted mode avoids dynamic Function compilation under the CSP, following [Zod's CSP guidance](https://zod.dev/compile#content-security-policy).
- Updated auth, poster, trailer, paging, persistence, and Redux boundaries at their existing call sites. Existing React text rendering, API schema, Django session cookies, and explicit guest-sync interaction are retained.
- Added regression tests in `src/test/security.test.tsx` and extended the actual Vercel route/compiler tests. The suite also includes contract pagination coverage.
- Added a scoped override and lockfile update from `path-to-regexp` 6.1.0 to 6.3.0 for the local Vercel routing compiler. This fixes its [backtracking advisory](https://github.com/advisories/GHSA-9wv6-86v2-598j). The working rewrite expressions were preserved.

The CSP permits same-origin application scripts/fonts/API requests, the two existing image hosts, and YouTube frames. Inline styles remain allowed for existing React/Radix/Sonner positioning/styles. Inline JavaScript, eval, arbitrary frame hosts, plugins, and embedding CineScope in another frame are disallowed. The image hosts also appear in `connect-src` because MSW's demo worker fetches images during passthrough. Browser testing caught this requirement before finalizing the policy.

The policy does not restrict ordinary top-level Google OAuth navigation. Google scripts are not embedded by this application. API and `/accounts/` paths are excluded from the document header rule, preserving Django callback responses and cookie behavior. Header configuration follows [Vercel's response-header configuration](https://vercel.com/docs/headers).

The trailer iframe retains its explicit `strict-origin-when-cross-origin` referrer policy, which supplies the origin needed by YouTube's embed checks while document navigation uses no-referrer.

## C. Backend and infrastructure work

The reported Google OAuth and email-registration configuration problems remain unresolved by this frontend audit. No real login, registration, password-reset delivery, or provider consent was performed. No backend files were edited.

The backend/operator still needs to verify the following against actual server logs and provider settings.

- Google client credentials and the exact registered callback URI. With the existing proxy topology this is `https://movie-trail-ui.vercel.app/accounts/google/login/callback/`. The allauth initiating session, state, provider exchange, and callback must use the same browser-facing cookie topology. The frontend continues to send a constant `return_to` value.
- Email provider configuration, verification/reset message delivery, canonical frontend link origin, and generic registration/recovery responses.
- Django authorization for every private resource and cross-account object lookup. Frontend hiding/validation cannot establish authorization.
- Actual authenticated session-cookie flags, login/session rotation, logout invalidation, private-response caching, production trusted origins, and behavior across multiple tabs. A CSRF-cookie check alone does not verify session-cookie behavior.

Observed production facts include a JSON 401 and `private, no-store` on anonymous `/me/`, a CSRF cookie with HttpOnly/Secure/SameSite=Lax/Path=/ and no Domain attribute, and an HTTP-to-HTTPS 308 redirect. Vercel supplies HSTS. No Supabase/database credentials or database integration requiring a frontend change were found.

## D. Verification

### Automated checks

- TypeScript check passed.
- ESLint passed.
- 81 tests passed across five files, covering existing journeys/storage/routing/pagination and new security regressions.
- Production build passed. No public source maps were emitted.
- A separate live-mode production bundle also built successfully using the required public production settings, without changing `.env.local`.
- Formatting and Git whitespace checks passed.
- Full dependency audit has 20 remaining development-tool findings, comprising 18 high and two moderate entries.
- `npm audit --omit=dev` reports zero vulnerabilities.
- Frontend-domain deployment verification passed for health, metadata, and titles. All returned HTTP 200 application/json rather than the SPA document.

### Browser checks on the hardened local production bundle

Headless Chrome served the compiled application with the proposed Vercel security headers. Mock mode supplied deterministic account-free test data. The following seven UI areas rendered and their relevant interactions passed.

1. Welcome and Continue as Guest.
2. Discover, title search, and combined Animation/Family genre filters.
3. Trailer/details overlay. A real YouTube iframe navigated and played, with video time advancing and `paused=false`.
4. My Library and guest watchlist saves.
5. Collection creation and collection-detail navigation.
6. Save-to-collection dialog.
7. Sharing dialog, including the guest Sign In & Sync restriction.

Additional checks covered the email sign-in form without submitting it, direct read-only public shares, invalid tokens, the Not Found route, a 1440px desktop layout, and a 390px mobile layout with no horizontal page overflow. Desktop/mobile screenshots were inspected. A live 500px TMDB poster loaded under the proposed CSP. No document CSP violations or uncaught application exceptions remained in the final run. The stylesheet/design were unchanged.

These tests do not establish that every device, assistive technology, or provider/network condition works.

A separate Chrome run served the hardened live-mode bundle with the same proposed headers and proxied read-only API requests to Django. Real discovery cards/posters, title search, an Action genre request, and a guest save followed by Library navigation passed. That run had no CSP violations or uncaught browser exceptions. Its local test proxy was used for guest/read-only behavior and does not verify production authentication/cookie forwarding.

### Existing production application

An isolated browser context loaded Discover from `movie-trail-ui.vercel.app`, observed three titles requests returning HTTP 200 application/json, rendered real titles including The Odyssey, and opened a title-details overlay. Production account data was not changed. The production API health, metadata, titles, anonymous session, CSRF-cookie attributes, and HTTPS redirect were also checked with read-only requests.

This is evidence about the current deployment's guest browsing and routing. It does not verify deployment of the new hardening changes.

## E. Production readiness

**Fixed and verified locally.** URL sink controls, session/cache boundaries, error handling, guest storage/retry validation, request/paging guards, the compatible routing dependency fix, and proposed browser headers.

**Awaiting authorization and deployment.** All source/header changes in this audit. No commit, push, or deployment was performed. Keep production settings `VITE_API_MODE=live`, `VITE_API_BASE_URL=/api/v1/`, and `VITE_APP_URL=https://movie-trail-ui.vercel.app`. Local development remains in its existing mock mode. Dashboard environment values were not independently inspected.

**Still pending.** The development dependency advisories, real Google/email integration, authenticated cross-account/backend authorization checks, and post-deployment browser/header verification.

After an authorized deployment, rerun `npm run verify:deployment`, inspect document response headers, and repeat the tested guest/mobile/trailer flows on the actual deployment. Verify real sign-in, refresh, session expiry, logout, revoked shares, and guest sync with controlled test accounts before treating authenticated production behavior as verified.
