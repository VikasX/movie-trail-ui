/** URL allowlists protect browser navigation and resource loading from untrusted API/storage values. */
const DEFAULT_API_BASE = '/api/v1/'

/** Preserve the same-origin session proxy when a public build setting is misconfigured. */
export function sameOriginApiBase(value: string | undefined, origin: string) {
  try {
    const url = new URL(value || DEFAULT_API_BASE, origin)
    if (
      url.origin === origin &&
      url.pathname === DEFAULT_API_BASE &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
      return DEFAULT_API_BASE
  } catch {
    /* Invalid settings use the contract's same-origin prefix. */
  }
  return DEFAULT_API_BASE
}

/** Keep image requests on the TMDB CDN or the existing Stitch demo image source. */
export function safeImageUrl(value: string | null | undefined) {
  if (!value || value.length > 2048) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port)
      return undefined
    if (
      (url.hostname === 'image.tmdb.org' && url.pathname.startsWith('/t/p/')) ||
      (url.hostname === 'lh3.googleusercontent.com' &&
        url.pathname.startsWith('/aida-public/'))
    )
      return url.href
  } catch {
    /* A malformed image uses the existing poster fallback. */
  }
  return undefined
}

/** YouTube video IDs contain exactly eleven URL-safe characters. */
export function isYoutubeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value)
}

/** Availability links in the contract point to TMDB's watch page, never an arbitrary provider URL. */
export function safeTmdbUrl(value: string | null | undefined) {
  if (!value || value.length > 2048) return undefined
  try {
    const url = new URL(value)
    if (
      url.origin === 'https://www.themoviedb.org' &&
      !url.username &&
      !url.password
    )
      return url.href
  } catch {
    /* Invalid availability links are omitted. */
  }
  return undefined
}

/** Permit only Google's authorization endpoint or the same-origin allauth entry. */
export function safeOAuthUrl(value: unknown, origin: string) {
  if (typeof value !== 'string' || value.length > 8192) return undefined
  try {
    const url = new URL(value, origin)
    if (url.username || url.password || url.hash) return undefined
    const google =
      url.origin === 'https://accounts.google.com' &&
      ['/o/oauth2/v2/auth', '/o/oauth2/auth'].includes(url.pathname)
    const allauth =
      url.origin === origin && url.pathname === '/accounts/google/login/'
    if (google || allauth) return url.href
  } catch {
    /* A malformed response is a failed sign-in attempt. */
  }
  return undefined
}

/** Extract paging values safely; never fetch the supplied origin. */
export function safePageUrl(value: string) {
  try {
    const url = new URL(value, window.location.origin)
    if (!['http:', 'https:'].includes(url.protocol)) return undefined
    const page = Number(url.searchParams.get('page'))
    const snapshot = url.searchParams.get('snapshot') || undefined
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      (snapshot && snapshot.length > 256)
    )
      return undefined
    return url
  } catch {
    return undefined
  }
}

export function pageFromUrl(value: string) {
  const url = safePageUrl(value)
  return url
    ? {
        page: Number(url.searchParams.get('page')),
        snapshot: url.searchParams.get('snapshot') || undefined,
      }
    : undefined
}

/** Dots and slashes must not turn an invalid share token into another API path. */
export function shareToken(value: string) {
  return /^[A-Za-z0-9_-]{1,256}$/.test(value) ? value : 'invalid-token'
}

/** Validate and encode collection identities instead of interpolating path segments. */
export function collectionPath(id: string) {
  if (
    !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|auto:[a-z0-9:-]+)$/i.test(
      id,
    )
  )
    throw new Error('This collection link is invalid.')
  return 'me/collections/' + encodeURIComponent(id) + '/'
}
