/**
 * The in-browser demo backend used by MSW in mock mode.
 * handle chooses a response by HTTP method/path. Helpers implement snapshots, collections, and sync.
 * The demo account has separate browser persistence from the guest library. Production Django performs these operations in live mode.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Request interception helpers used to provide demo API responses.
import { http, HttpResponse, delay } from 'msw'
// Bring in the exported helpers/components from `./fixtures`.
import { titles, metadata, trailerKeys } from './fixtures'
// Bring in the exported helpers/components from `./catalogue`.
import { filterTitles } from './catalogue'
// Bring in the exported helpers/components from `@/features/guest/storage`.
import {
  readLibrary,
  emptyLibrary,
  persistLibrary,
  saveTitle,
  removeTitle,
  automaticCollections,
} from '@/features/guest/storage'
// Bring in the exported helpers/components from `@/types/models`.
import {
  titleKey,
  type Schema,
  type Title,
  type LocalCollection,
} from '@/types/models'
// Bring in the exported helpers/components from `@/lib/config`.
import { config } from '@/lib/config'
// Bring in the exported helpers/components from `@/lib/filters`.
import { parseFilters } from '@/lib/filters'

// Demo account persistence uses a different key from cinescope:guest:v1, keeping the two libraries separate.
// Keep `accountKey` as the text `'cinescope:demo-account:v1'`.
const accountKey = 'cinescope:demo-account:v1'
// Keep `account` as the result returned by `readLibrary` with these arguments.
let account = readLibrary(accountKey)
// Keep `user` as the JavaScript value decoded from the stored JSON text; malformed JSON throws.
let user: Schema['User'] | null = JSON.parse(
  sessionStorage.getItem('cinescope:demo-user') || 'null',
)
// Store prior sync responses so the same sync ID and body can replay the same result.
// Keep `receipts` as a key-to-value lookup used to group or retrieve records.
const receipts = new Map<
  string,
  { body: string; result: Schema['SyncResult'] }
>()
// Keep `mappings` as a key-to-value lookup used to group or retrieve records.
const mappings = new Map<string, string>()
// Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
try {
  // Keep `saved` as the JavaScript value decoded from the stored JSON text; malformed JSON throws with a TypeScript shape assertion; the assertion adds no runtime validation.
  const saved = JSON.parse(
    sessionStorage.getItem('cinescope:demo-sync:v1') || 'null',
  ) as {
    // The `receipts` field used by this data shape. Its type is `[string, { body: string; result: Schema['SyncResult'] }][]`.
    receipts: [string, { body: string; result: Schema['SyncResult'] }][]
    // The `mappings` field used by this data shape. Its type is `[string, string][]`.
    mappings: [string, string][]
  } | null
  // Run this callback once for every item in `saved?.receipts`.
  saved?.receipts.forEach(([k, v]) => receipts.set(k, v))
  // Run this callback once for every item in `saved?.mappings`.
  saved?.mappings.forEach(([k, v]) => mappings.set(k, v))
} catch {
  /* A corrupt demo receipt cache starts empty. */
}
// Keep ordered mock selections stable while the caller requests later pages.
// Keep `snapshots` as a key-to-value lookup used to group or retrieve records.
const snapshots = new Map<
  string,
  { results: unknown[]; signature: string; expires: number }
>()
// Keep `now` as a callback that runs when it is called.
const now = () => new Date().toISOString()
// Return existing HTTP error responses unchanged, or wrap ordinary data as JSON with no-store headers.
// Keep `json` as a callback that runs when it is called.
const json = (value: unknown, status = 200) =>
  value instanceof HttpResponse
    ? value
    : HttpResponse.json(value as Record<string, unknown>, {
        // Use the existing `status` variable as the field with the same name.
        status,
        // Set the `headers` field to an object whose named fields are explained below.
        headers: {
          // Set the `'X-Request-ID'` field to the result returned by `crypto.randomUUID` with these arguments.
          'X-Request-ID': crypto.randomUUID(),
          // Set the `'Cache-Control'` field to the text `'no-store'`.
          'Cache-Control': 'no-store',
        },
      })
// Build the same error-envelope shape that components expect from Django.
// Keep `error` as a callback that runs when it is called.
const error = (code: string, message: string, status = 400) =>
  json(
    { error: { code, message, fields: {}, request_id: crypto.randomUUID() } },
    status,
  )
/** Persist the separate demo account library after a mock mutation. */
function saveAccount() {
  // Call `persistLibrary` with the arguments below to perform this step.
  persistLibrary(account, accountKey)
}
/** Create or reuse an immutable five-minute mock snapshot and return the requested slice. */
function page<T>(
  /* Input rows used by this helper; its type describes the accepted values. */ rows: T[],
  /* The parsed URL whose pathname/query selects this operation. */ url: URL,
  /* Input bounded used by this helper; its type describes the accepted values. Omitting this input uses the default shown after =. */ bounded = false,
) {
  // A later page must reuse a valid snapshot. Missing, expired, or mismatched snapshots return an API error.
  // Keep `requested` as the value looked up by `url.searchParams.get('snapshot')`.
  const requested = url.searchParams.get('snapshot')
  // Keep `signature` as an editable set of URL query parameters copied from the supplied input.
  const signature = new URLSearchParams(url.search)
  // Remove `'page'` from `signature`.
  signature.delete('page')
  // Remove `'snapshot'` from `signature`.
  signature.delete('snapshot')
  // Keep `old` as a choice between two values based on `requested`.
  const old = requested ? snapshots.get(requested) : undefined
  // Take this branch only when `requested && (!old || old.expires < Date.now())` is truthy.
  if (requested && (!old || old.expires < Date.now()))
    // Return the result returned by `error` with these arguments to the caller.
    return error(
      'snapshot_expired',
      'This selection expired. Refresh to start again.',
      410,
    )
  // Take this branch only when `old && old.signature !== signature.toString()` is truthy.
  if (old && old.signature !== signature.toString())
    // Return the result returned by `error` with these arguments to the caller.
    return error('snapshot_mismatch', 'Filters changed. Restart the selection.')
  // Keep `number` as the result returned by `Number` with these arguments.
  // Keep `size` as the result returned by `Number` with these arguments.
  const number = Number(url.searchParams.get('page') || 1),
    size = Number(url.searchParams.get('page_size') || 12)
  // Take this branch only when `!Number.isInteger(number) || number < 1 || !Number.isInteger(size) || size < 1 || size > 100` is truthy.
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  )
    // Return the result returned by `error` with these arguments to the caller.
    return error('validation_error', 'Invalid page.')
  // Take this branch only when `number > 1 && !requested` is truthy.
  if (number > 1 && !requested)
    // Return the result returned by `error` with these arguments to the caller.
    return error('snapshot_required', 'A snapshot is required.')
  // The first page freezes a cloned selection. Later pages slice this stored selection rather than rerunning filters.
  // Keep `id` as `requested`, falling back to the right-hand value when the left side is falsy.
  const id = requested || crypto.randomUUID()
  // Take this branch only when `!old` is truthy.
  if (!old)
    // Assign the supplied value under key `id` in `snapshots`.
    snapshots.set(id, {
      // The records in this page of results.
      results: structuredClone(rows),
      // Set the `signature` field to the result returned by `signature.toString` with these arguments.
      signature: signature.toString(),
      // Set the `expires` field to the expression `Date.now() + 300000`.
      expires: Date.now() + 300000,
    })
  // Keep `state` as the value looked up by `snapshots.get(id)` with a TypeScript shape assertion; the assertion adds no runtime validation.
  // Keep `results` as the value read from `state.results` with a TypeScript shape assertion; the assertion adds no runtime validation.
  const state = snapshots.get(id)!,
    results = state.results as T[]
  // Take this branch only when `number > 1 && (number - 1) * size >= results.length` is truthy.
  if (number > 1 && (number - 1) * size >= results.length)
    // Return the result returned by `error` with these arguments to the caller.
    return error('not_found', 'Page not found.', 404)
  // Keep `link` as a callback that runs when it is called.
  const link = (n: number) => {
    // Keep `u` as a new URL instance initialized with these arguments.
    const u = new URL(url)
    // Assign the supplied value under key `'page'` in `u.searchParams`.
    u.searchParams.set('page', String(n))
    // Assign the supplied value under key `'snapshot'` in `u.searchParams`.
    u.searchParams.set('snapshot', id)
    // Return the value read from `u.href` to the caller.
    return u.href
  }
  // Return an object whose named fields are explained below to the caller.
  return {
    // The total matching row count reported by this response.
    count: results.length,
    // The next page address, or null when this is the last page.
    next: number * size < results.length ? link(number + 1) : null,
    // The previous page address, or null on the first page.
    previous: number > 1 ? link(number - 1) : null,
    // The records in this page of results.
    results: results.slice((number - 1) * size, number * size),
    // Extra API information such as snapshot or attribution data.
    meta: {
      // The server token retaining the same selection across pages.
      snapshot: id,
      // Set the `expires_at` field to the result returned by `new Date(state.expires).toISOString` with these arguments.
      expires_at: new Date(state.expires).toISOString(),
      // Set the `coverage` field to a choice between two values based on `bounded`.
      coverage: bounded ? 'bounded_candidates' : 'complete',
      // Set the `candidate_limit` field to a choice between two values based on `bounded`.
      candidate_limit: bounded ? 40 : null,
      // Set the `warnings` field to an empty array, ready to collect items.
      warnings: [],
    },
  }
}
/** Look up a fixture using both media type and TMDB ID. */
function findTitle(
  /* Input media used by this helper; its type describes the accepted values. */ media: string,
  /* Input id used by this helper; its type describes the accepted values. */ id: string,
) {
  // Return the first array item matching the predicate, or undefined when nothing matches to the caller.
  return titles.find((t) => t.media_type === media && t.tmdb_id === Number(id))
}
/** Combine custom demo collections with the automatic views calculated from account saves. */
function collectionList() {
  // Return an array containing these ordered values to the caller.
  return [...account.collections, ...automaticCollections(account.saved)]
}
/** Resolve a collection membership list into public title summaries and added timestamps. */
function items(
  /* Input c used by this helper; its type describes the accepted values. */ c: LocalCollection,
) {
  // Return the result returned by `c.items.flatMap` with these arguments to the caller.
  return c.items.flatMap((ref) => {
    // Keep `saved` as the first array item matching the predicate, or undefined when nothing matches.
    const saved = account.saved.find((s) => titleKey(s.title) === titleKey(ref))
    // Return a choice between two values based on `saved` to the caller.
    return saved ? [{ title: saved.title, added_at: saved.saved_at }] : []
  })
}
/** Create a contract-shaped demo details response, including available fixture trailers. */
function detail(
  /* The movie/TV identity or title record being processed. */ t: Title,
): Schema['TitleDetails'] {
  // Keep `key` as the value read from `trailerKeys[t.tmdb_id]`.
  const key = trailerKeys[t.tmdb_id]
  // Only the fixtures with a known trailer key get a playable video. Other fixtures intentionally exercise the empty state.
  // Keep `trailers` as a choice between two values based on `key`.
  const trailers: Schema['Trailer'][] = key
    ? [
        {
          // Set the `id` field to the expression `'trailer-' + key`.
          id: 'trailer-' + key,
          // Set the `site` field to the text `'YouTube'`.
          site: 'YouTube',
          // Set the `youtube_key` field to the value read from `key`.
          youtube_key: key,
          // Set the `name` field to the text `'Official trailer'`.
          name: 'Official trailer',
          // The collection kind, distinguishing editable custom groups from computed automatic groups.
          kind: 'Trailer',
          // Set the `official` field to the boolean true.
          official: true,
          // Set the `language` field to the text `'en'`.
          language: 'en',
          // Set the `published_at` field to null, representing the absence of a value.
          published_at: null,
          // Set the `embed_url` field to the expression `'https://www.youtube-nocookie.com/embed/' + key`.
          embed_url: 'https://www.youtube-nocookie.com/embed/' + key,
          // Set the `watch_url` field to the expression `'https://www.youtube.com/watch?v=' + key`.
          watch_url: 'https://www.youtube.com/watch?v=' + key,
        },
      ]
    : []
  // Keep `director` as a choice between two values based on `[157336, 872585].includes(t.tmdb_id)`.
  const director = [157336, 872585].includes(t.tmdb_id)
    ? { tmdb_id: 525, name: 'Christopher Nolan' }
    : [693134, 335984, 329865].includes(t.tmdb_id)
      ? { tmdb_id: 137427, name: 'Denis Villeneuve' }
      : null
  // Return an object whose named fields are explained below to the caller.
  return {
    // The title record or display title used by this object.
    title: t,
    // Set the `tagline` field to the text `''`.
    tagline: '',
    // Set the `status` field to the text `'Released'`.
    status: 'Released',
    // Set the `number_of_seasons` field to null, representing the absence of a value.
    number_of_seasons: null,
    // Set the `number_of_episodes` field to null, representing the absence of a value.
    number_of_episodes: null,
    // Set the `cast` field to an empty array, ready to collect items.
    cast: [],
    // Set the `directors` field to a choice between two values based on `director`.
    directors: director
      ? [
          {
            // Set the `person` field to an object whose named fields are explained below.
            person: {
              ...director,
              // Set the `known_for_department` field to the text `'Directing'`.
              known_for_department: 'Directing',
              // Set the `profile_url` field to null, representing the absence of a value.
              profile_url: null,
            },
            // Set the `role` field to the text `'director'`.
            role: 'director',
            // Set the `character` field to null, representing the absence of a value.
            character: null,
          },
        ]
      : [],
    // Set the `creators` field to an empty array, ready to collect items.
    creators: [],
    // Use the existing `trailers` variable as the field with the same name.
    trailers,
    // Set the `selected_trailer_id` field to `trailers[0]?.id`, falling back to the right-hand value when the left side is falsy.
    selected_trailer_id: trailers[0]?.id || null,
    // Set the `availability` field to an object whose named fields are explained below.
    availability: {
      // Set the `region` field to the text `'IN'`.
      region: 'IN',
      // Set the `status` field to the text `'unavailable'`.
      status: 'unavailable',
      // Set the `link` field to null, representing the absence of a value.
      link: null,
      // Set the `flatrate` field to an empty array, ready to collect items.
      flatrate: [],
      // Set the `free` field to an empty array, ready to collect items.
      free: [],
      // Set the `ads` field to an empty array, ready to collect items.
      ads: [],
      // Set the `rent` field to an empty array, ready to collect items.
      rent: [],
      // Set the `buy` field to an empty array, ready to collect items.
      buy: [],
      // Set the `attribution` field to the text `'JustWatch'`.
      attribution: 'JustWatch',
    },
    // Set the `warnings` field to an array containing these ordered values.
    warnings: [
      {
        // Set the `code` field to the text `'demo_metadata'`.
        code: 'demo_metadata',
        // Set the `message` field to the text `'Representative demo metadata. Provider availability is unavailable in demo mode.'`.
        message:
          'Representative demo metadata. Provider availability is unavailable in demo mode.',
      },
    ],
  }
}
/** Route one intercepted request to the matching demo operation after a short simulated delay. */
async function handle(
  /* The request whose URL/body is read by this handler. */ request: Request,
) {
  // Simulate network latency so loading and disabled-button states can be exercised in the demo.
  // Wait for `delay(120)` before continuing this async operation.
  await delay(120)
  // Keep `url` as a new URL instance initialized with these arguments.
  // Keep `path` as `url.pathname.split('/api/v1/')[1]`, falling back to the right-hand value when the left side is falsy.
  // Keep `method` as the value read from `request.method`.
  const url = new URL(request.url),
    path = url.pathname.split('/api/v1/')[1] || '',
    method = request.method
  // Keep `body` as a choice between two values based on `['POST', 'PUT', 'PATCH'].includes( method, )`.
  const body: Record<string, unknown> = ['POST', 'PUT', 'PATCH'].includes(
    method,
  )
    ? await request.json().catch(() => ({}))
    : {}
  // Bootstrap a demo CSRF token. The next guard checks it on unsafe mock requests.
  // Take this branch only when `path === 'auth/csrf/'` is truthy.
  if (path === 'auth/csrf/') return json({ csrf_token: 'demo-masked-csrf' })
  // Take this branch only when `method !== 'GET' && request.headers.get('X-CSRFToken') !== 'demo-masked-csrf'` is truthy.
  if (
    method !== 'GET' &&
    request.headers.get('X-CSRFToken') !== 'demo-masked-csrf'
  )
    // Return the result returned by `error` with these arguments to the caller.
    return error('csrf_failed', 'Refresh your session and retry.', 403)
  // Supply the genre taxonomy, languages, regions, moods, and attribution for filter controls.
  // Take this branch only when `path === 'metadata/'` is truthy.
  if (path === 'metadata/') return json(metadata)
  // Simulate email login with a demo user. Google authorization is delegated to the real backend only in live mode.
  // Take this branch only when `path === 'auth/login/' || path === 'auth/oauth/start/'` is truthy.
  if (path === 'auth/login/' || path === 'auth/oauth/start/') {
    // Take this branch only when `path.includes('oauth')` is truthy.
    if (path.includes('oauth'))
      // Return the result returned by `error` with these arguments to the caller.
      return error(
        'demo_only',
        'Google authentication is available in live mode. Use demo email sign in.',
      )
    // Take this branch only when `body.password === 'invalid'` is truthy.
    if (body.password === 'invalid')
      // Return the result returned by `error` with these arguments to the caller.
      return error(
        'invalid_credentials',
        'Unable to sign in with those details.',
        401,
      )
    // Update `user` using an object whose named fields are explained below.
    user = {
      // Set the `id` field to the number 1.
      id: 1,
      // Set the `email` field to the result returned by `String` with these arguments.
      email: String(body.email),
      // Set the `display_name` field to the value read from `String(body.email).split('@')[0]`.
      display_name: String(body.email).split('@')[0],
      // Set the `email_verified` field to the boolean true.
      email_verified: true,
      // Set the `providers` field to an array containing these ordered values.
      providers: ['email'],
      // Set the `preferences` field to an object whose named fields are explained below.
      preferences: { language: 'en-US', region: 'IN' },
    }
    // Persist this key/value pair in sessionStorage; the data argument is serialized where needed.
    sessionStorage.setItem('cinescope:demo-user', JSON.stringify(user))
    // Return the result returned by `json` with these arguments to the caller.
    return json({ user, csrf_token: 'demo-masked-csrf' })
  }
  // End the demo session while retaining the independent demo account library.
  // Take this branch only when `path === 'auth/logout/'` is truthy.
  if (path === 'auth/logout/') {
    // Update `user` using null, representing the absence of a value.
    user = null
    // Call `sessionStorage.removeItem` with the arguments below to perform this step.
    sessionStorage.removeItem('cinescope:demo-user')
    // Return a new HttpResponse instance initialized with these arguments to the caller.
    return new HttpResponse(null, { status: 204 })
  }
  // Other demo email flows return a generic message and send no actual email.
  // Take this branch only when `path.startsWith('auth/')` is truthy.
  if (path.startsWith('auth/'))
    // Return the result returned by `json` with these arguments to the caller.
    return json(
      {
        // Set the `detail` field to the text `'If eligible, instructions have been sent. This is a demo; no email is delivered.'`.
        detail:
          'If eligible, instructions have been sent. This is a demo; no email is delivered.',
      },
      202,
    )
  // Private demo endpoints require a demo session, matching the account/guest separation used by the UI.
  // Take this branch only when `path.startsWith('me/') && !user` is truthy.
  if (path.startsWith('me/') && !user)
    // Return the result returned by `error` with these arguments to the caller.
    return error('authentication_required', 'Sign in to continue.', 401)
  // Take this branch only when `path === 'me/'` is truthy.
  if (path === 'me/') {
    // Take this branch only when `method === 'PATCH' && user` is truthy.
    if (method === 'PATCH' && user) {
      // Update `user` using an object whose named fields are explained below with a TypeScript shape assertion; the assertion adds no runtime validation.
      user = { ...user, ...body } as Schema['User']
      // Persist this key/value pair in sessionStorage; the data argument is serialized where needed.
      sessionStorage.setItem('cinescope:demo-user', JSON.stringify(user))
    }
    // Return the result returned by `json` with these arguments to the caller.
    return json(user)
  }
  // Search the small fixture people list used by the actor/director picker.
  // Take this branch only when `path === 'people/'` is truthy.
  if (path === 'people/') {
    // Keep `people` as an array containing these ordered values.
    const people = [
      {
        // The numeric TMDB identifier, paired with media_type to identify a title.
        tmdb_id: 525,
        // Set the `name` field to the text `'Christopher Nolan'`.
        name: 'Christopher Nolan',
        // Set the `known_for_department` field to the text `'Directing'`.
        known_for_department: 'Directing',
        // Set the `profile_url` field to null, representing the absence of a value.
        profile_url: null,
      },
      {
        // The numeric TMDB identifier, paired with media_type to identify a title.
        tmdb_id: 137427,
        // Set the `name` field to the text `'Denis Villeneuve'`.
        name: 'Denis Villeneuve',
        // Set the `known_for_department` field to the text `'Directing'`.
        known_for_department: 'Directing',
        // Set the `profile_url` field to null, representing the absence of a value.
        profile_url: null,
      },
      {
        // The numeric TMDB identifier, paired with media_type to identify a title.
        tmdb_id: 1190668,
        // Set the `name` field to the text `'Timothée Chalamet'`.
        name: 'Timothée Chalamet',
        // Set the `known_for_department` field to the text `'Acting'`.
        known_for_department: 'Acting',
        // Set the `profile_url` field to null, representing the absence of a value.
        profile_url: null,
      },
    ]
    // Return the result returned by `json` with these arguments to the caller.
    return json(
      page(
        people.filter((p) =>
          p.name
            .toLowerCase()
            .includes((url.searchParams.get('q') || '').toLowerCase()),
        ),
        url,
      ),
    )
  }
  // Parse discovery parameters, exercise selected error cases, then filter and paginate fixture titles.
  // Take this branch only when `path === 'titles/'` is truthy.
  if (path === 'titles/') {
    // Keep `params` as the result returned by `parseFilters` with these arguments.
    const params = parseFilters(url.searchParams)
    // Take this branch only when `params.q === 'error'` is truthy.
    if (params.q === 'error')
      // Return the result returned by `error` with these arguments to the caller.
      return error(
        'upstream_unavailable',
        'Demo upstream unavailable. Clear “error” to retry.',
        503,
      )
    // Take this branch only when `params.q && params.person_id` is truthy.
    if (params.q && params.person_id)
      // Return the result returned by `error` with these arguments to the caller.
      return error('validation_error', 'Choose a title search or a person.')
    // Take this branch only when `params.year_from && params.year_to && Number(params.year_from) > Number(params.year_to)` is truthy.
    if (
      params.year_from &&
      params.year_to &&
      Number(params.year_from) > Number(params.year_to)
    )
      // Return the result returned by `error` with these arguments to the caller.
      return error('validation_error', 'Start year must precede end year.')
    // Return the result returned by `json` with these arguments to the caller.
    return json(page(filterTitles(titles, params), url, true))
  }
  // Recognize a composite media/ID detail path and return its fixture details.
  // Keep `detailMatch` as the result returned by `path.match` with these arguments.
  const detailMatch = path.match(/^titles\/(movie|tv)\/(\d+)\/$/)
  // Take this branch only when `detailMatch` is truthy.
  if (detailMatch) {
    // Keep `t` as the result returned by `findTitle` with these arguments.
    const t = findTitle(detailMatch[1], detailMatch[2])
    // Return a choice between two values based on `t` to the caller.
    return t ? json(detail(t)) : error('not_found', 'Title unavailable.', 404)
  }
  // Apply the active recommendation dimensions and mood rules, or choose one eligible surprise title.
  // Take this branch only when `path === 'recommendations/'` is truthy.
  if (path === 'recommendations/') {
    // Keep `input` as the value read from `body` with a TypeScript shape assertion; the assertion adds no runtime validation with a TypeScript shape assertion; the assertion adds no runtime validation.
    // Keep `filters` as `input.filters`, falling back to the right-hand value when the left side is falsy.
    const input = body as unknown as Schema['RecommendationInput'],
      filters = input.filters || { media_type: 'all' }
    // Keep `list` as the result returned by `filterTitles` with these arguments.
    let list = filterTitles(titles, {
      ...filters,
      // The genre values used for filtering or display.
      genres: filters.genres,
    })
    // Keep `exclude` as a collection of unique values for membership checks.
    const exclude = new Set((input.exclude || []).map(titleKey))
    // Update `list` using an array containing only items that pass the predicate.
    list = list.filter((t) => !exclude.has(titleKey(t)))
    // Take this branch only when `input.mode === 'personalized' && !user` is truthy.
    if (input.mode === 'personalized' && !user)
      // Return the result returned by `error` with these arguments to the caller.
      return error('authentication_required', 'Sign in to continue.', 401)
    // Take this branch only when `input.mode === 'mood'` is truthy.
    if (input.mode === 'mood') {
      // Keep `mood` as the first array item matching the predicate, or undefined when nothing matches.
      const mood = metadata.moods.find((m) => m.key === input.mood)
      // Take this branch only when `!mood` is truthy.
      if (!mood) return error('validation_error', 'Select a supported mood.')
      // Update `list` using an array containing only items that pass the predicate.
      list = list.filter((t) =>
        input.mood === 'family_night'
          ? mood.genre_keys.every((g) => t.genres.some((x) => x.key === g))
          : mood.genre_keys.some((g) => t.genres.some((x) => x.key === g)),
      )
    }
    // Take this branch only when `input.mode === 'surprise'` is truthy.
    if (input.mode === 'surprise')
      // Update `list` using a choice between two values based on `list.length`.
      list = list.length ? [list[Math.floor(Math.random() * list.length)]] : []
    // Return the result returned by `json` with these arguments to the caller.
    return json({
      // Set the `mode` field to the value read from `input.mode`.
      mode: input.mode,
      // Set the `basis` field to a choice between two values based on `input.mode === 'surprise'`.
      basis:
        input.mode === 'surprise'
          ? 'random_candidates'
          : input.mode === 'mood'
            ? 'mood_mapping'
            : 'popular_fallback',
      // Set the `mapping_version` field to the text `'moods-v2'`.
      mapping_version: 'moods-v2',
      // The records in this page of results.
      results: list.slice(0, input.limit || 10),
      // Set the `warnings` field to an empty array, ready to collect items.
      warnings: [],
    })
  }
  // List saved account rows. The identity-specific branch below handles PUT saves and DELETE unsaves.
  // Take this branch only when `path === 'me/library/'` is truthy.
  if (path === 'me/library/') return json(page(account.saved, url))
  // Keep `libraryMatch` as the result returned by `path.match` with these arguments.
  const libraryMatch = path.match(/^me\/library\/(movie|tv)\/(\d+)\/$/)
  // Take this branch only when `libraryMatch` is truthy.
  if (libraryMatch) {
    // Keep `t` as the result returned by `findTitle` with these arguments.
    const t = findTitle(libraryMatch[1], libraryMatch[2])
    // Take this branch only when `!t` is truthy.
    if (!t) return error('not_found', 'Title unavailable.', 404)
    // Take this branch only when `method === 'DELETE'` is truthy.
    if (method === 'DELETE') {
      // Call `removeTitle` with the arguments below to perform this step.
      removeTitle(account, t)
      // Call `saveAccount` with the arguments below to perform this step.
      saveAccount()
      // Return a new HttpResponse instance initialized with these arguments to the caller.
      return new HttpResponse(null, { status: 204 })
    }
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(account, t, Boolean(body.watched))
    // Call `saveAccount` with the arguments below to perform this step.
    saveAccount()
    // Return the result returned by `json` with these arguments to the caller.
    return json(account.saved.find((s) => titleKey(s.title) === titleKey(t)))
  }
  // Take this branch only when `path === 'me/recent/'` is truthy.
  if (path === 'me/recent/') return json(page(account.recent, url))
  // Recognize a deliberate exploration write and retain a bounded recent-history list.
  // Keep `recent` as the result returned by `path.match` with these arguments.
  const recent = path.match(/^me\/recent\/(movie|tv)\/(\d+)\/$/)
  // Take this branch only when `recent` is truthy.
  if (recent) {
    // Keep `t` as the result returned by `findTitle` with these arguments.
    const t = findTitle(recent[1], recent[2])
    // Take this branch only when `!t` is truthy.
    if (!t) return error('not_found', 'Title unavailable.', 404)
    // Keep `item` as an object whose named fields are explained below.
    const item = { title: t, explored_at: now() }
    // Update `account.recent` using the result returned by `[ item, ...account.recent.filter((r) => titleKey(r.title) !== titleKey(t)), ].slice` with these arguments.
    account.recent = [
      item,
      ...account.recent.filter((r) => titleKey(r.title) !== titleKey(t)),
    ].slice(0, 50)
    // Call `saveAccount` with the arguments below to perform this step.
    saveAccount()
    // Return the result returned by `json` with these arguments to the caller.
    return json(item)
  }
  // GET lists custom and automatic collections. POST creates a new custom collection after name validation.
  // Take this branch only when `path === 'me/collections/'` is truthy.
  if (path === 'me/collections/') {
    // Take this branch only when `method === 'GET'` is truthy.
    if (method === 'GET')
      // Return the result returned by `json` with these arguments to the caller.
      return json(
        page(
          collectionList().map(({ items: _items, ...c }) => c),
          url,
        ),
      )
    // Keep `name` as the result returned by `String(body.name || '').trim` with these arguments.
    const name = String(body.name || '').trim()
    // Take this branch only when `!name || name.length > 80` is truthy.
    if (!name || name.length > 80)
      // Return the result returned by `error` with these arguments to the caller.
      return error(
        'validation_error',
        'Use a name between 1 and 80 characters.',
      )
    // Take this branch only when `account.collections.some( (c) => c.name.toLowerCase() === name.toLowerCase(), )` is truthy.
    if (
      account.collections.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )
    )
      // Return the result returned by `error` with these arguments to the caller.
      return error('name_conflict', 'A collection already has that name.', 409)
    // Keep `c` as an object whose named fields are explained below.
    const c: LocalCollection = {
      // Set the `id` field to the result returned by `crypto.randomUUID` with these arguments.
      id: crypto.randomUUID(),
      // The collection kind, distinguishing editable custom groups from computed automatic groups.
      kind: 'custom',
      // Use the existing `name` variable as the field with the same name.
      name,
      // The member records contained in this group or paginated response.
      items: [],
      // The number of members reported for this collection.
      item_count: 0,
      // The record creation time.
      created_at: now(),
      // The most recent record-update time.
      updated_at: now(),
      // Whether this collection currently has public sharing enabled.
      sharing_enabled: false,
      // The public link, or null when no link is available.
      share_url: null,
    }
    // Insert this record at the start of `account.collections` so it appears first.
    account.collections.unshift(c)
    // Call `saveAccount` with the arguments below to perform this step.
    saveAccount()
    // Keep `{ items: _items, description: _description, ...created }` as the value read from `c`.
    const { items: _items, description: _description, ...created } = c
    // Return the result returned by `json` with these arguments to the caller.
    return json(created, 201)
  }
  // Route a collection ID to detail/edit/delete, sharing, or membership handling.
  // Keep `cm` as the result returned by `path.match` with these arguments.
  const cm = path.match(/^me\/collections\/([^/]+)\/(.*)$/)
  // Take this branch only when `cm` is truthy.
  if (cm) {
    // Keep `id` as the result returned by `decodeURIComponent` with these arguments.
    // Keep `rest` as the value read from `cm[2]`.
    // Keep `c` as the first array item matching the predicate, or undefined when nothing matches.
    const id = decodeURIComponent(cm[1]),
      rest = cm[2],
      c = collectionList().find((c) => c.id === id)
    // Take this branch only when `!c` is truthy.
    if (!c) return error('not_found', 'Collection unavailable.', 404)
    // Take this branch only when `c.kind === 'automatic' && method !== 'GET'` is truthy.
    if (c.kind === 'automatic' && method !== 'GET')
      // Return the result returned by `error` with these arguments to the caller.
      return error(
        'immutable_collection',
        'Automatic collections are read-only.',
        403,
      )
    // Take this branch only when `!rest` is truthy.
    if (!rest) {
      // Take this branch only when `method === 'GET'` is truthy.
      if (method === 'GET') {
        // Keep `{ items: _items, description: _description, ...collection }` as the value read from `c`.
        const { items: _items, description: _description, ...collection } = c
        // Keep `paged` as the result returned by `page` with these arguments.
        const paged = page(items(c), url)
        // Return a choice between two values based on `paged instanceof HttpResponse` to the caller.
        return paged instanceof HttpResponse
          ? paged
          : json({ collection, items: paged })
      }
      // Take this branch only when `method === 'DELETE'` is truthy.
      if (method === 'DELETE') {
        // Update `account.collections` using an array containing only items that pass the predicate.
        account.collections = account.collections.filter((x) => x.id !== id)
        // Call `saveAccount` with the arguments below to perform this step.
        saveAccount()
        // Return a new HttpResponse instance initialized with these arguments to the caller.
        return new HttpResponse(null, { status: 204 })
      }
      // Keep `name` as the result returned by `String(body.name || '').trim` with these arguments.
      const name = String(body.name || '').trim()
      // Take this branch only when `!name || name.length > 80` is truthy.
      if (!name || name.length > 80)
        // Return the result returned by `error` with these arguments to the caller.
        return error(
          'validation_error',
          'Use a name between 1 and 80 characters.',
        )
      // Take this branch only when `account.collections.some( (x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase(), )` is truthy.
      if (
        account.collections.some(
          (x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase(),
        )
      )
        // Return the result returned by `error` with these arguments to the caller.
        return error('name_conflict', 'Name already used.', 409)
      // Update `c.name` using the value read from `name`.
      c.name = name
      // Update `c.updated_at` using the result returned by `now` with these arguments.
      c.updated_at = now()
      // Call `saveAccount` with the arguments below to perform this step.
      saveAccount()
      // Keep `{ items: _items, description: _description, ...updated }` as the value read from `c`.
      const { items: _items, description: _description, ...updated } = c
      // Return the result returned by `json` with these arguments to the caller.
      return json(updated)
    }
    // An enabled share has an opaque token. Revoking it removes its URL, and re-enabling generates a new token.
    // Take this branch only when `rest === 'sharing/'` is truthy.
    if (rest === 'sharing/') {
      // Update `c.sharing_enabled` using the expression `method === 'PUT'`.
      c.sharing_enabled = method === 'PUT'
      // Take this branch only when `c.sharing_enabled && !c.share_url` is truthy.
      if (c.sharing_enabled && !c.share_url) {
        // Keep `bytes` as the result returned by `crypto.getRandomValues` with these arguments.
        const bytes = crypto.getRandomValues(new Uint8Array(32))
        // Update `c.share_url` using the expression `config.appOrigin + '/shared/' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')`.
        c.share_url =
          config.appOrigin +
          '/shared/' +
          Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      }
      // Take this branch only when `!c.sharing_enabled` is truthy.
      if (!c.sharing_enabled) c.share_url = null
      // Call `saveAccount` with the arguments below to perform this step.
      saveAccount()
      // Return a choice between two values based on `c.sharing_enabled` to the caller.
      return c.sharing_enabled
        ? json({ enabled: true, url: c.share_url })
        : new HttpResponse(null, { status: 204 })
    }
    // Add/remove one title membership. Adding it also ensures the title is saved to the account library.
    // Keep `member` as the result returned by `rest.match` with these arguments.
    const member = rest.match(/^items\/(movie|tv)\/(\d+)\/$/)
    // Take this branch only when `member` is truthy.
    if (member) {
      // Keep `t` as the result returned by `findTitle` with these arguments.
      const t = findTitle(member[1], member[2])
      // Take this branch only when `!t` is truthy.
      if (!t) return error('not_found', 'Title unavailable.', 404)
      // Take this branch only when `method === 'DELETE'` is truthy.
      if (method === 'DELETE')
        // Update `c.items` using an array containing only items that pass the predicate.
        c.items = c.items.filter((i) => titleKey(i) !== titleKey(t))
      else {
        // Call `saveTitle` with the arguments below to perform this step.
        saveTitle(account, t)
        // Take this branch only when `!c.items.some((i) => titleKey(i) === titleKey(t))` is truthy.
        if (!c.items.some((i) => titleKey(i) === titleKey(t)))
          // Append these values to the end of `c.items`.
          c.items.push({ media_type: t.media_type, tmdb_id: t.tmdb_id })
      }
      // Update `c.item_count` using the value read from `c.items.length`.
      c.item_count = c.items.length
      // Update `c.updated_at` using the result returned by `now` with these arguments.
      c.updated_at = now()
      // Call `saveAccount` with the arguments below to perform this step.
      saveAccount()
      // Return a choice between two values based on `method === 'DELETE'` to the caller.
      return method === 'DELETE'
        ? new HttpResponse(null, { status: 204 })
        : json({ title: t, added_at: now() })
    }
  }
  // Public share reads return the collection name and title items, excluding owner/private library fields.
  // Keep `shared` as the result returned by `path.match` with these arguments.
  const shared = path.match(/^shared\/([^/]+)\/$/)
  // Take this branch only when `shared` is truthy.
  if (shared) {
    // Take this branch only when `shared[1] === 'demo'` is truthy.
    if (shared[1] === 'demo')
      // Return the result returned by `json` with these arguments to the caller.
      return json({
        // Set the `name` field to the text `'Weekend Sci-Fi'`.
        name: 'Weekend Sci-Fi',
        // The member records contained in this group or paginated response.
        items: page(
          titles
            .filter((t) => t.genres.some((g) => g.key === 'sci-fi'))
            .slice(0, 8)
            .map((title) => ({ title, added_at: null })),
          url,
        ),
      })
    // Keep `c` as the first array item matching the predicate, or undefined when nothing matches.
    const c = account.collections.find(
      (c) => c.sharing_enabled && c.share_url?.endsWith('/' + shared[1]),
    )
    // Take this branch only when `!c` is truthy.
    if (!c)
      // Return the result returned by `error` with these arguments to the caller.
      return error(
        'not_found',
        'This link is invalid or has been revoked.',
        404,
      )
    // Keep `paged` as the result returned by `page` with these arguments.
    const paged = page(items(c), url)
    // Return a choice between two values based on `paged instanceof HttpResponse` to the caller.
    return paged instanceof HttpResponse
      ? paged
      : json({ name: c.name, items: paged })
  }
  // Take this branch only when `path === 'me/guest-sync/'` is truthy.
  if (path === 'me/guest-sync/')
    // Return the result returned by `syncGuest` with these arguments to the caller.
    return syncGuest(body as unknown as Schema['SyncInput'])
  // Return the result returned by `error` with these arguments to the caller.
  return error('not_found', 'Endpoint unavailable.', 404)
}

/** Merge a frozen guest request into the demo account and save an idempotency receipt. */
function syncGuest(
  /* Input input used by this helper; its type describes the accepted values. */ input: Schema['SyncInput'],
) {
  // An identical sync ID/body replays its receipt. A changed body with the same ID returns a conflict.
  // Keep `existing` as the value looked up by `receipts.get(input.sync_id)`.
  const existing = receipts.get(input.sync_id)
  // Take this branch only when `existing` is truthy.
  if (existing)
    // Return a choice between two values based on `existing.body === JSON.stringify(input)` to the caller.
    return existing.body === JSON.stringify(input)
      ? json(existing.result)
      : error('idempotency_conflict', 'Retry the unchanged sync job.', 409)
  // Prepare the merge on a draft so validation/conflict failures before commit do not replace account state.
  // Keep `draft` as a deep copy of `account`, allowing edits without mutating the original object.
  const draft = structuredClone(account)
  // Keep `result` as an object whose named fields are explained below.
  const result: Schema['SyncResult'] = {
    // The stable ID used to recognize retries of the same guest import.
    sync_id: input.sync_id,
    // Set the `saved_created` field to the number 0.
    saved_created: 0,
    // Set the `saved_merged` field to the number 0.
    saved_merged: 0,
    // Set the `collections_created` field to the number 0.
    collections_created: 0,
    // Set the `memberships_created` field to the number 0.
    memberships_created: 0,
    // Set the `collection_mappings` field to an empty array, ready to collect items.
    collection_mappings: [],
    // Set the `rejected_titles` field to an empty array, ready to collect items.
    rejected_titles: [],
  }
  // Track which guest collection maps to which account collection, independently of editable collection names.
  // Keep `pendingMappings` as a key-to-value lookup used to group or retrieve records.
  const pendingMappings = new Map(mappings)
  // Visit each item in `input.saved_titles` using `const s`.
  for (const s of input.saved_titles) {
    // Keep `t` as the result returned by `findTitle` with these arguments.
    const t = findTitle(s.media_type, String(s.tmdb_id))
    // Take this branch only when `!t` is truthy.
    if (!t) {
      // Append these values to the end of `result.rejected_titles`.
      result.rejected_titles.push({
        // The title record or display title used by this object.
        title: { media_type: s.media_type, tmdb_id: s.tmdb_id },
        // Set the `code` field to the text `'title_unavailable'`.
        code: 'title_unavailable',
      })
      continue
    }
    // Keep `old` as the first array item matching the predicate, or undefined when nothing matches.
    const old = draft.saved.find((o) => titleKey(o.title) === titleKey(t))
    // Take this branch only when `old` is truthy.
    if (old) {
      // Evaluate `result.saved_merged++` as the next operation.
      result.saved_merged++
      // Take this branch only when `s.watched && !old.watched` is truthy.
      if (s.watched && !old.watched) {
        // Update `old.watched` using the boolean true.
        old.watched = true
        // Update `old.watched_at` using the value read from `s.watched_at`.
        old.watched_at = s.watched_at
      }
    } else {
      // Append these values to the end of `draft.saved`.
      draft.saved.push({
        // The title record or display title used by this object.
        title: t,
        // Whether this saved title has been marked watched.
        watched: s.watched,
        // The time the title was added to saved titles.
        saved_at: s.saved_at,
        // The time it was marked watched, or null when unwatched.
        watched_at: s.watched_at,
      })
      // Evaluate `result.saved_created++` as the next operation.
      result.saved_created++
    }
  }
  // Visit each item in `input.collections` using `const c`.
  for (const c of input.collections) {
    // Keep `mappingKey` as the expression `input.guest_id + ':' + c.client_id`.
    const mappingKey = input.guest_id + ':' + c.client_id
    // Keep `target` as the first array item matching the predicate, or undefined when nothing matches.
    let target = draft.collections.find(
      (x) => x.id === mappings.get(mappingKey),
    )
    // Take this branch only when `mappings.has(mappingKey) && !target` is truthy.
    if (mappings.has(mappingKey) && !target)
      // Return the result returned by `error` with these arguments to the caller.
      return error(
        'sync_source_deleted',
        'The imported collection was deleted. Create a new local collection to import it again.',
        409,
      )
    // Take this branch only when `!target` is truthy.
    if (!target) {
      // Keep `name` as the value read from `c.name`.
      // Keep `n` as the number 2.
      let name = c.name,
        n = 2
      // Repeat the following work while `draft.collections.some( (x) => x.name.toLowerCase() === name.toLowerCase(), )` remains truthy.
      while (
        draft.collections.some(
          (x) => x.name.toLowerCase() === name.toLowerCase(),
        )
      )
        // Update `name` using the expression `c.name.slice(0, 65) + ' (Imported ' + n++ + ')'`.
        name = c.name.slice(0, 65) + ' (Imported ' + n++ + ')'
      // Update `target` using an object whose named fields are explained below.
      target = {
        // Set the `id` field to the result returned by `crypto.randomUUID` with these arguments.
        id: crypto.randomUUID(),
        // Use the existing `name` variable as the field with the same name.
        name,
        // The collection kind, distinguishing editable custom groups from computed automatic groups.
        kind: 'custom',
        // The number of members reported for this collection.
        item_count: 0,
        // The member records contained in this group or paginated response.
        items: [],
        // The record creation time.
        created_at: now(),
        // The most recent record-update time.
        updated_at: now(),
        // Whether this collection currently has public sharing enabled.
        sharing_enabled: false,
        // The public link, or null when no link is available.
        share_url: null,
      }
      // Append these values to the end of `draft.collections`.
      draft.collections.push(target)
      // Assign the supplied value under key `mappingKey` in `pendingMappings`.
      pendingMappings.set(mappingKey, target.id)
      // Evaluate `result.collections_created++` as the next operation.
      result.collections_created++
    }
    // Visit each item in `c.items` using `const ref`.
    for (const ref of c.items) {
      // Keep `t` as the result returned by `findTitle` with these arguments.
      const t = findTitle(ref.media_type, String(ref.tmdb_id))
      // Take this branch only when `t && !target.items.some((i) => titleKey(i) === titleKey(t))` is truthy.
      if (t && !target.items.some((i) => titleKey(i) === titleKey(t))) {
        // Call `saveTitle` with the arguments below to perform this step.
        saveTitle(draft, t)
        // Append these values to the end of `target.items`.
        target.items.push(ref)
        // Evaluate `result.memberships_created++` as the next operation.
        result.memberships_created++
      }
    }
    // Update `target.item_count` using the value read from `target.items.length`.
    target.item_count = target.items.length
    // Append these values to the end of `result.collection_mappings`.
    result.collection_mappings.push({
      // The browser collection ID used to match the server import result.
      client_id: c.client_id,
      // Set the `collection_id` field to the value read from `target.id`.
      collection_id: target.id,
    })
  }
  // Commit the prepared account copy, persist it, then retain the result receipt for safe replay.
  // Update `account` using the value read from `draft`.
  account = draft
  // Run this callback once for every item in `pendingMappings`.
  pendingMappings.forEach((v, k) => mappings.set(k, v))
  // Call `saveAccount` with the arguments below to perform this step.
  saveAccount()
  // Assign the supplied value under key `input.sync_id` in `receipts`.
  receipts.set(input.sync_id, { body: JSON.stringify(input), result })
  // Persist this key/value pair in sessionStorage; the data argument is serialized where needed.
  sessionStorage.setItem(
    'cinescope:demo-sync:v1',
    JSON.stringify({ receipts: [...receipts], mappings: [...mappings] }),
  )
  // Return the result returned by `json` with these arguments to the caller.
  return json(result)
}
// Keep `handlers` as an array containing these ordered values.
export const handlers = [
  http.all('*/api/v1/*', ({ request }) => handle(request)),
]
/** Reset in-memory demo state between automated test scenarios. */
export function resetDemo() {
  // Update `account` using the result returned by `emptyLibrary` with these arguments.
  account = emptyLibrary()
  // Update `user` using null, representing the absence of a value.
  user = null
  // Call `receipts.clear` with the arguments below to perform this step.
  receipts.clear()
  // Call `mappings.clear` with the arguments below to perform this step.
  mappings.clear()
  // Call `snapshots.clear` with the arguments below to perform this step.
  snapshots.clear()
}
