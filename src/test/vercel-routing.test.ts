/**
 * Regression tests for production proxy and SPA routing.
 * The tests compile vercel.json with Vercel routing utilities and check actual path matching.
 * They include the old trailing-slash failure so a future rewrite edit can be checked against it.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `../../vercel.json?raw`.
import vercelJson from '../../vercel.json?raw'
// The test runner’s test declarations, assertions, and lifecycle helpers.
import { describe, expect, it } from 'vitest'
// Bring in the exported helpers/components from `@vercel/routing-utils`.
import { getTransformedRoutes } from '@vercel/routing-utils'

// Keep `config` as the JavaScript value decoded from the stored JSON text; malformed JSON throws.
const config = JSON.parse(vercelJson)

/** Compile the real Vercel rules and calculate the destination selected for a test URL. */
function destinationFor(
  /* The parsed URL whose pathname/query selects this operation. */ url: string,
) {
  // Keep `parsed` as a new URL instance initialized with these arguments.
  const parsed = new URL(url, 'https://movie-trail-ui.vercel.app')
  // Keep `{ routes, error }` as the result returned by `getTransformedRoutes` with these arguments.
  const { routes, error } = getTransformedRoutes(config)
  // Assert this expected result; a mismatch causes the test to fail.
  expect(error).toBeNull()
  // Visit each item in `routes || []` using `const route`.
  for (const route of routes || []) {
    // Take this branch only when `!('src' in route) || !route.src || !route.dest` is truthy.
    if (!('src' in route) || !route.src || !route.dest) continue
    // Keep `pattern` as a new RegExp instance initialized with these arguments.
    const pattern = new RegExp(route.src)
    // Take this branch only when `pattern.test(parsed.pathname)` is truthy.
    if (pattern.test(parsed.pathname)) {
      // Keep `destination` as the result returned by `parsed.pathname.replace` with these arguments.
      const destination = parsed.pathname.replace(pattern, route.dest)
      // Return the expression `destination + parsed.search` to the caller.
      return destination + parsed.search
    }
  }
  // Return null, representing the absence of a value to the caller.
  return null
}

// Group the related behavior tests under this description.
describe('Vercel API and SPA route separation', () => {
  it('applies browser protections to frontend documents without overriding OAuth/API headers', () => {
    const rule = config.headers[0]
    const { routes, error } = getTransformedRoutes({ headers: [rule] })
    expect(error).toBeNull()
    const route = routes?.find((r) => 'src' in r)
    expect(
      route && 'src' in route && new RegExp(route.src!).test('/discover'),
    ).toBe(true)
    for (const path of ['/api/v1/titles/', '/accounts/google/login/callback/'])
      expect(route && 'src' in route && new RegExp(route.src!).test(path)).toBe(
        false,
      )
    const headers = Object.fromEntries(
      rule.headers.map((h: { key: string; value: string }) => [h.key, h.value]),
    )
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Referrer-Policy']).toBe('no-referrer')
    const csp = headers['Content-Security-Policy']
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('https://www.youtube-nocookie.com')
    expect(csp).toContain('https://image.tmdb.org')
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain(' *')
  })
  // Exercise the behavior described by this test name.
  it('reproduces the old wildcard failing on Django trailing slashes', () => {
    // Keep `{ routes, error }` as the result returned by `getTransformedRoutes` with these arguments.
    const { routes, error } = getTransformedRoutes({
      // Set the `rewrites` field to an array containing these ordered values.
      rewrites: [
        {
          // Set the `source` field to the text `'/api/:path*'`.
          source: '/api/:path*',
          // Set the `destination` field to the text `'https://movie-trail-py.vercel.app/api/:path*'`.
          destination: 'https://movie-trail-py.vercel.app/api/:path*',
        },
      ],
    })
    // Assert this expected result; a mismatch causes the test to fail.
    expect(error).toBeNull()
    // Keep `route` as the first array item matching the predicate, or undefined when nothing matches.
    const route = routes?.find((r) => 'src' in r)
    // Take this branch only when `!route || !('src' in route)` is truthy.
    if (!route || !('src' in route))
      // Stop this operation by throwing the following error to its caller or catch block.
      throw new Error('Expected a compiled rewrite')
    // Keep `matcher` as a new RegExp instance initialized with these arguments.
    const matcher = new RegExp(route.src!)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(matcher.test('/api/v1/health')).toBe(true)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(matcher.test('/api/v1/health/')).toBe(false)
  })

  // Call `it.each([ '/api/', '/api/v1/health', '/api/v1/health/', '/api/v1/metadata/', '/api/v1/titles/?page_size=12&...` with the arguments below to perform this step.
  it.each([
    '/api/',
    '/api/v1/health',
    '/api/v1/health/',
    '/api/v1/metadata/',
    '/api/v1/titles/?page_size=12&genres=drama%2Cmystery',
    '/api/v1/auth/csrf/',
    '/api/v1/auth/login/',
    '/api/v1/me/library/movie/550/',
    '/api/v1/nonexistent/',
    '/accounts/',
    '/accounts/google/login/callback/?code=test&state=test',
    '/accounts/google/login/callback',
    '/accounts/nonexistent/',
  ])('preserves the backend path and query for %s', (path) => {
    // Assert this expected result; a mismatch causes the test to fail.
    expect(destinationFor(path)).toBe(
      'https://movie-trail-py.vercel.app' + path,
    )
  })

  // Call `it.each([ '/', '/discover', '/discover/', '/library', '/library/collections/example', '/shared/example', '/...` with the arguments below to perform this step.
  it.each([
    '/',
    '/discover',
    '/discover/',
    '/library',
    '/library/collections/example',
    '/shared/example',
    '/auth/verify',
    '/unknown',
    '/api-docs',
    '/accounts-help',
  ])('serves the SPA for frontend route %s', (path) => {
    // Assert this expected result; a mismatch causes the test to fail.
    expect(destinationFor(path)).toBe('/index.html')
  })

  // Exercise the behavior described by this test name.
  it('prevents the SPA fallback from matching API or OAuth paths independently of ordering', () => {
    // Keep `fallback` as the first array item matching the predicate, or undefined when nothing matches.
    const fallback = config.rewrites.find(
      (r: { destination: string }) => r.destination === '/index.html',
    )
    // Keep `{ routes }` as the result returned by `getTransformedRoutes` with these arguments.
    const { routes } = getTransformedRoutes({ rewrites: [fallback] })
    // Keep `route` as the first array item matching the predicate, or undefined when nothing matches.
    const route = routes?.find((r) => 'src' in r)
    // Take this branch only when `!route || !('src' in route)` is truthy.
    if (!route || !('src' in route))
      // Stop this operation by throwing the following error to its caller or catch block.
      throw new Error('Expected a compiled fallback')
    // Keep `matcher` as a new RegExp instance initialized with these arguments.
    const matcher = new RegExp(route.src!)
    // Visit each item in `[ '/api', '/api/', '/api/v1/titles/', '/accounts', '/accounts/', '/accounts/google/login/callback/', ]` using `const path`.
    for (const path of [
      '/api',
      '/api/',
      '/api/v1/titles/',
      '/accounts',
      '/accounts/',
      '/accounts/google/login/callback/',
    ]) {
      // Assert this expected result; a mismatch causes the test to fail.
      expect(matcher.test(path), path).toBe(false)
    }
  })
})
