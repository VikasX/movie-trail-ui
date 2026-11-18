/**
 * The shared HTTP setup used by every RTK Query endpoint.
 * It adds the API prefix, includes session cookies, and prepares CSRF headers for writes.
 * services/api.ts supplies the endpoint paths. Redux middleware manages request caching and subscriptions.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// RTK Query tools that create API requests, cache results, and generate React hooks.
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
// Bring in the exported helpers/components from `@/lib/config`.
import { config } from '@/lib/config'
// fetchBaseQuery wraps browser fetch. credentials include lets the browser send session cookies.
// Keep `raw` as the result returned by `fetchBaseQuery` with these arguments.
const raw = fetchBaseQuery({ baseUrl: config.apiBase, credentials: 'include' })
// Keep the masked CSRF token in memory. The cookie is managed by the browser and Django.
// Keep `csrf` as an initially empty value.
let csrf: string | undefined
// Share a single in-flight CSRF bootstrap promise when several requests start together.
// Keep `csrfRequest` as an initially empty value.
let csrfRequest: Promise<string | undefined> | undefined
// Keep `baseQuery` as a callback that runs when it is called and returns a promise.
const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  // Endpoints may supply a short URL string or a full object containing URL, method, headers, and body.
  // Keep `request` as a choice between two values based on `typeof args === 'string'`.
  const request = typeof args === 'string' ? { url: args } : args
  // A write such as POST, PUT, PATCH, or DELETE needs a CSRF header. A normal GET reads data.
  // Keep `unsafe` as the right-hand expression only when `request.method` is truthy.
  const unsafe =
    request.method && !['GET', 'HEAD'].includes(request.method.toUpperCase())
  // Also bootstrap before checking the user session, including a fresh browser visit after OAuth.
  // Take this branch only when `unsafe || request.url === 'me/'` is truthy.
  if (unsafe || request.url === 'me/') {
    // Take this branch only when `!csrf` is truthy.
    if (!csrf) {
      // The nullish assignment starts this promise only when a bootstrap is not already running.
      // Update `csrfRequest` using the result returned by `(async () => { const r = await raw('auth/csrf/', api, extra) return (r.data as { csrf_token?: string } | un...` with these arguments.
      csrfRequest ??= (async () => {
        // Keep `r` as the completed result of `raw('auth/csrf/', api, extra)`; await pauses this async function until the promise settles.
        const r = await raw('auth/csrf/', api, extra)
        // Return the value read from `(r.data as { csrf_token?: string } | undefined)?.csrf_token` to the caller.
        return (r.data as { csrf_token?: string } | undefined)?.csrf_token
      })()
      // Wait for the shared result, then release the in-flight marker for future bootstrap attempts.
      // Update `csrf` using the completed result of `csrfRequest`; await pauses this async function until the promise settles.
      csrf = await csrfRequest
      // Update `csrfRequest` using the value read from `undefined`.
      csrfRequest = undefined
    }
    // Add the masked token to a write request. Django checks it together with the CSRF cookie.
    // Take this branch only when `unsafe` is truthy.
    if (unsafe)
      // Update `request.headers` using an object whose named fields are explained below.
      request.headers = { ...request.headers, 'X-CSRFToken': csrf || '' }
  }
  // Send the actual endpoint request after its shared authentication headers are ready.
  // Keep `result` as the completed result of `raw(request, api, extra)`; await pauses this async function until the promise settles.
  const result = await raw(request, api, extra)
  // Successful login can return a rotated CSRF token, which replaces the token held in memory.
  // Keep `token` as the value read from `(result.data as { csrf_token?: string } | undefined)?.csrf_token`.
  const token = (result.data as { csrf_token?: string } | undefined)?.csrf_token
  // Take this branch only when `token` is truthy.
  if (token) csrf = token
  // Take this branch only when `request.url === 'auth/logout/' && !result.error` is truthy.
  if (request.url === 'auth/logout/' && !result.error) csrf = undefined
  // Return the value read from `result` to the caller.
  return result
}
// Create the common cache and tag names here. api.ts injects all concrete endpoints into this API.
// Keep `baseApi` as the result returned by `createApi` with these arguments.
export const baseApi = createApi({
  // The Redux state key where RTK Query stores its request cache.
  reducerPath: 'api',
  // Use the existing `baseQuery` variable as the field with the same name.
  baseQuery,
  // The cache labels endpoints may provide or invalidate.
  tagTypes: ['Title', 'Library', 'Collections', 'Recent', 'User', 'Public'],
  // Set the `endpoints` field to a callback that runs when it is called.
  endpoints: () => ({}),
})
/** Forget the in-memory CSRF token so a later protected request bootstraps a fresh one. */
export function resetCsrf() {
  // Update `csrf` using the value read from `undefined`.
  csrf = undefined
}
