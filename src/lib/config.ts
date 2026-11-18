/**
 * Central public environment settings read by the API and demo code.
 * Vite substitutes VITE_* values during development/build. An unset API mode selects mocks.
 * appOrigin is used when the demo creates a React collection link.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Keep `config` as an object whose named fields are explained below.
import { sameOriginApiBase } from './security'

export const config = {
  // Only the exact value live selects the real backend. Missing configuration defaults to the demo.
  // Set the `mock` field to the expression `import.meta.env.VITE_API_MODE !== 'live'`.
  mock: import.meta.env.VITE_API_MODE !== 'live',
  // A relative /api/v1/ URL stays on the frontend origin and reaches the appropriate local or Vercel proxy.
  // Validate the public setting and keep authenticated requests behind the same-origin contract prefix.
  apiBase: sameOriginApiBase(
    import.meta.env.VITE_API_BASE_URL,
    window.location.origin,
  ),
  // Use the configured public UI origin, or the origin of the page currently open in the browser.
  // Set the `appOrigin` field to `import.meta.env.VITE_APP_URL`, falling back to the right-hand value when the left side is falsy.
  appOrigin: import.meta.env.VITE_APP_URL || window.location.origin,
}
