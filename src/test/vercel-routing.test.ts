import vercelJson from '../../vercel.json?raw'
import { describe, expect, it } from 'vitest'
import { getTransformedRoutes } from '@vercel/routing-utils'

const config = JSON.parse(vercelJson)

function destinationFor(url: string) {
  const parsed = new URL(url, 'https://movie-trail-ui.vercel.app')
  const { routes, error } = getTransformedRoutes(config)
  expect(error).toBeNull()
  for (const route of routes || []) {
    if (!('src' in route) || !route.src || !route.dest) continue
    const pattern = new RegExp(route.src)
    if (pattern.test(parsed.pathname)) {
      const destination = parsed.pathname.replace(pattern, route.dest)
      return destination + parsed.search
    }
  }
  return null
}

describe('Vercel API and SPA route separation', () => {
  it('reproduces the old wildcard failing on Django trailing slashes', () => {
    const { routes, error } = getTransformedRoutes({
      rewrites: [
        {
          source: '/api/:path*',
          destination: 'https://movie-trail-py.vercel.app/api/:path*',
        },
      ],
    })
    expect(error).toBeNull()
    const route = routes?.find((r) => 'src' in r)
    if (!route || !('src' in route))
      throw new Error('Expected a compiled rewrite')
    const matcher = new RegExp(route.src!)
    expect(matcher.test('/api/v1/health')).toBe(true)
    expect(matcher.test('/api/v1/health/')).toBe(false)
  })

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
    expect(destinationFor(path)).toBe(
      'https://movie-trail-py.vercel.app' + path,
    )
  })

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
    expect(destinationFor(path)).toBe('/index.html')
  })

  it('prevents the SPA fallback from matching API or OAuth paths independently of ordering', () => {
    const fallback = config.rewrites.find(
      (r: { destination: string }) => r.destination === '/index.html',
    )
    const { routes } = getTransformedRoutes({ rewrites: [fallback] })
    const route = routes?.find((r) => 'src' in r)
    if (!route || !('src' in route))
      throw new Error('Expected a compiled fallback')
    const matcher = new RegExp(route.src!)
    for (const path of [
      '/api',
      '/api/',
      '/api/v1/titles/',
      '/accounts',
      '/accounts/',
      '/accounts/google/login/callback/',
    ]) {
      expect(matcher.test(path), path).toBe(false)
    }
  })
})
