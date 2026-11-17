import { http, HttpResponse, delay } from 'msw'
import { titles, metadata, trailerKeys } from './fixtures'
import { filterTitles } from './catalogue'
import {
  readLibrary,
  emptyLibrary,
  persistLibrary,
  saveTitle,
  removeTitle,
  automaticCollections,
} from '@/features/guest/storage'
import {
  titleKey,
  type Schema,
  type Title,
  type LocalCollection,
} from '@/types/models'
import { config } from '@/lib/config'
import { parseFilters } from '@/lib/filters'

const accountKey = 'cinescope:demo-account:v1'
let account = readLibrary(accountKey)
let user: Schema['User'] | null = JSON.parse(
  sessionStorage.getItem('cinescope:demo-user') || 'null',
)
const receipts = new Map<
  string,
  { body: string; result: Schema['SyncResult'] }
>()
const mappings = new Map<string, string>()
try {
  const saved = JSON.parse(
    sessionStorage.getItem('cinescope:demo-sync:v1') || 'null',
  ) as {
    receipts: [string, { body: string; result: Schema['SyncResult'] }][]
    mappings: [string, string][]
  } | null
  saved?.receipts.forEach(([k, v]) => receipts.set(k, v))
  saved?.mappings.forEach(([k, v]) => mappings.set(k, v))
} catch {
  /* A corrupt demo receipt cache starts empty. */
}
const snapshots = new Map<
  string,
  { results: unknown[]; signature: string; expires: number }
>()
const now = () => new Date().toISOString()
const json = (value: unknown, status = 200) =>
  value instanceof HttpResponse
    ? value
    : HttpResponse.json(value as Record<string, unknown>, {
        status,
        headers: {
          'X-Request-ID': crypto.randomUUID(),
          'Cache-Control': 'no-store',
        },
      })
const error = (code: string, message: string, status = 400) =>
  json(
    { error: { code, message, fields: {}, request_id: crypto.randomUUID() } },
    status,
  )
function saveAccount() {
  persistLibrary(account, accountKey)
}
function page<T>(rows: T[], url: URL, bounded = false) {
  const requested = url.searchParams.get('snapshot')
  const signature = new URLSearchParams(url.search)
  signature.delete('page')
  signature.delete('snapshot')
  const old = requested ? snapshots.get(requested) : undefined
  if (requested && (!old || old.expires < Date.now()))
    return error(
      'snapshot_expired',
      'This selection expired. Refresh to start again.',
      410,
    )
  if (old && old.signature !== signature.toString())
    return error('snapshot_mismatch', 'Filters changed. Restart the selection.')
  const number = Number(url.searchParams.get('page') || 1),
    size = Number(url.searchParams.get('page_size') || 12)
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  )
    return error('validation_error', 'Invalid page.')
  if (number > 1 && !requested)
    return error('snapshot_required', 'A snapshot is required.')
  const id = requested || crypto.randomUUID()
  if (!old)
    snapshots.set(id, {
      results: structuredClone(rows),
      signature: signature.toString(),
      expires: Date.now() + 300000,
    })
  const state = snapshots.get(id)!,
    results = state.results as T[]
  if (number > 1 && (number - 1) * size >= results.length)
    return error('not_found', 'Page not found.', 404)
  const link = (n: number) => {
    const u = new URL(url)
    u.searchParams.set('page', String(n))
    u.searchParams.set('snapshot', id)
    return u.href
  }
  return {
    count: results.length,
    next: number * size < results.length ? link(number + 1) : null,
    previous: number > 1 ? link(number - 1) : null,
    results: results.slice((number - 1) * size, number * size),
    meta: {
      snapshot: id,
      expires_at: new Date(state.expires).toISOString(),
      coverage: bounded ? 'bounded_candidates' : 'complete',
      candidate_limit: bounded ? 40 : null,
      warnings: [],
    },
  }
}
function findTitle(media: string, id: string) {
  return titles.find((t) => t.media_type === media && t.tmdb_id === Number(id))
}
function collectionList() {
  return [...account.collections, ...automaticCollections(account.saved)]
}
function items(c: LocalCollection) {
  return c.items.flatMap((ref) => {
    const saved = account.saved.find((s) => titleKey(s.title) === titleKey(ref))
    return saved ? [{ title: saved.title, added_at: saved.saved_at }] : []
  })
}
function detail(t: Title): Schema['TitleDetails'] {
  const key = trailerKeys[t.tmdb_id]
  const trailers: Schema['Trailer'][] = key
    ? [
        {
          id: 'trailer-' + key,
          site: 'YouTube',
          youtube_key: key,
          name: 'Official trailer',
          kind: 'Trailer',
          official: true,
          language: 'en',
          published_at: null,
          embed_url: 'https://www.youtube-nocookie.com/embed/' + key,
          watch_url: 'https://www.youtube.com/watch?v=' + key,
        },
      ]
    : []
  const director = [157336, 872585].includes(t.tmdb_id)
    ? { tmdb_id: 525, name: 'Christopher Nolan' }
    : [693134, 335984, 329865].includes(t.tmdb_id)
      ? { tmdb_id: 137427, name: 'Denis Villeneuve' }
      : null
  return {
    title: t,
    tagline: '',
    status: 'Released',
    number_of_seasons: null,
    number_of_episodes: null,
    cast: [],
    directors: director
      ? [
          {
            person: {
              ...director,
              known_for_department: 'Directing',
              profile_url: null,
            },
            role: 'director',
            character: null,
          },
        ]
      : [],
    creators: [],
    trailers,
    selected_trailer_id: trailers[0]?.id || null,
    availability: {
      region: 'IN',
      status: 'unavailable',
      link: null,
      flatrate: [],
      free: [],
      ads: [],
      rent: [],
      buy: [],
      attribution: 'JustWatch',
    },
    warnings: [
      {
        code: 'demo_metadata',
        message:
          'Representative demo metadata. Provider availability is unavailable in demo mode.',
      },
    ],
  }
}
async function handle(request: Request) {
  await delay(120)
  const url = new URL(request.url),
    path = url.pathname.split('/api/v1/')[1] || '',
    method = request.method
  const body: Record<string, unknown> = ['POST', 'PUT', 'PATCH'].includes(
    method,
  )
    ? await request.json().catch(() => ({}))
    : {}
  if (path === 'auth/csrf/') return json({ csrf_token: 'demo-masked-csrf' })
  if (
    method !== 'GET' &&
    request.headers.get('X-CSRFToken') !== 'demo-masked-csrf'
  )
    return error('csrf_failed', 'Refresh your session and retry.', 403)
  if (path === 'metadata/') return json(metadata)
  if (path === 'auth/login/' || path === 'auth/oauth/start/') {
    if (path.includes('oauth'))
      return error(
        'demo_only',
        'Google authentication is available in live mode. Use demo email sign in.',
      )
    if (body.password === 'invalid')
      return error(
        'invalid_credentials',
        'Unable to sign in with those details.',
        401,
      )
    user = {
      id: 1,
      email: String(body.email),
      display_name: String(body.email).split('@')[0],
      email_verified: true,
      providers: ['email'],
      preferences: { language: 'en-US', region: 'IN' },
    }
    sessionStorage.setItem('cinescope:demo-user', JSON.stringify(user))
    return json({ user, csrf_token: 'demo-masked-csrf' })
  }
  if (path === 'auth/logout/') {
    user = null
    sessionStorage.removeItem('cinescope:demo-user')
    return new HttpResponse(null, { status: 204 })
  }
  if (path.startsWith('auth/'))
    return json(
      {
        detail:
          'If eligible, instructions have been sent. This is a demo; no email is delivered.',
      },
      202,
    )
  if (path.startsWith('me/') && !user)
    return error('authentication_required', 'Sign in to continue.', 401)
  if (path === 'me/') {
    if (method === 'PATCH' && user) {
      user = { ...user, ...body } as Schema['User']
      sessionStorage.setItem('cinescope:demo-user', JSON.stringify(user))
    }
    return json(user)
  }
  if (path === 'people/') {
    const people = [
      {
        tmdb_id: 525,
        name: 'Christopher Nolan',
        known_for_department: 'Directing',
        profile_url: null,
      },
      {
        tmdb_id: 137427,
        name: 'Denis Villeneuve',
        known_for_department: 'Directing',
        profile_url: null,
      },
      {
        tmdb_id: 1190668,
        name: 'Timothée Chalamet',
        known_for_department: 'Acting',
        profile_url: null,
      },
    ]
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
  if (path === 'titles/') {
    const params = parseFilters(url.searchParams)
    if (params.q === 'error')
      return error(
        'upstream_unavailable',
        'Demo upstream unavailable. Clear “error” to retry.',
        503,
      )
    if (params.q && params.person_id)
      return error('validation_error', 'Choose a title search or a person.')
    if (
      params.year_from &&
      params.year_to &&
      Number(params.year_from) > Number(params.year_to)
    )
      return error('validation_error', 'Start year must precede end year.')
    return json(page(filterTitles(titles, params), url, true))
  }
  const detailMatch = path.match(/^titles\/(movie|tv)\/(\d+)\/$/)
  if (detailMatch) {
    const t = findTitle(detailMatch[1], detailMatch[2])
    return t ? json(detail(t)) : error('not_found', 'Title unavailable.', 404)
  }
  if (path === 'recommendations/') {
    const input = body as unknown as Schema['RecommendationInput'],
      filters = input.filters || { media_type: 'all' }
    let list = filterTitles(titles, {
      ...filters,
      genres: filters.genres,
    })
    const exclude = new Set((input.exclude || []).map(titleKey))
    list = list.filter((t) => !exclude.has(titleKey(t)))
    if (input.mode === 'personalized' && !user)
      return error('authentication_required', 'Sign in to continue.', 401)
    if (input.mode === 'mood') {
      const mood = metadata.moods.find((m) => m.key === input.mood)
      if (!mood) return error('validation_error', 'Select a supported mood.')
      list = list.filter((t) =>
        input.mood === 'family_night'
          ? mood.genre_keys.every((g) => t.genres.some((x) => x.key === g))
          : mood.genre_keys.some((g) => t.genres.some((x) => x.key === g)),
      )
    }
    if (input.mode === 'surprise')
      list = list.length ? [list[Math.floor(Math.random() * list.length)]] : []
    return json({
      mode: input.mode,
      basis:
        input.mode === 'surprise'
          ? 'random_candidates'
          : input.mode === 'mood'
            ? 'mood_mapping'
            : 'popular_fallback',
      mapping_version: 'moods-v2',
      results: list.slice(0, input.limit || 10),
      warnings: [],
    })
  }
  if (path === 'me/library/') return json(page(account.saved, url))
  const libraryMatch = path.match(/^me\/library\/(movie|tv)\/(\d+)\/$/)
  if (libraryMatch) {
    const t = findTitle(libraryMatch[1], libraryMatch[2])
    if (!t) return error('not_found', 'Title unavailable.', 404)
    if (method === 'DELETE') {
      removeTitle(account, t)
      saveAccount()
      return new HttpResponse(null, { status: 204 })
    }
    saveTitle(account, t, Boolean(body.watched))
    saveAccount()
    return json(account.saved.find((s) => titleKey(s.title) === titleKey(t)))
  }
  if (path === 'me/recent/') return json(page(account.recent, url))
  const recent = path.match(/^me\/recent\/(movie|tv)\/(\d+)\/$/)
  if (recent) {
    const t = findTitle(recent[1], recent[2])
    if (!t) return error('not_found', 'Title unavailable.', 404)
    const item = { title: t, explored_at: now() }
    account.recent = [
      item,
      ...account.recent.filter((r) => titleKey(r.title) !== titleKey(t)),
    ].slice(0, 50)
    saveAccount()
    return json(item)
  }
  if (path === 'me/collections/') {
    if (method === 'GET')
      return json(
        page(
          collectionList().map(({ items: _items, ...c }) => c),
          url,
        ),
      )
    const name = String(body.name || '').trim()
    if (!name || name.length > 80)
      return error(
        'validation_error',
        'Use a name between 1 and 80 characters.',
      )
    if (
      account.collections.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return error('name_conflict', 'A collection already has that name.', 409)
    const c: LocalCollection = {
      id: crypto.randomUUID(),
      kind: 'custom',
      name,
      items: [],
      item_count: 0,
      created_at: now(),
      updated_at: now(),
      sharing_enabled: false,
      share_url: null,
    }
    account.collections.unshift(c)
    saveAccount()
    const { items: _items, description: _description, ...created } = c
    return json(created, 201)
  }
  const cm = path.match(/^me\/collections\/([^/]+)\/(.*)$/)
  if (cm) {
    const id = decodeURIComponent(cm[1]),
      rest = cm[2],
      c = collectionList().find((c) => c.id === id)
    if (!c) return error('not_found', 'Collection unavailable.', 404)
    if (c.kind === 'automatic' && method !== 'GET')
      return error(
        'immutable_collection',
        'Automatic collections are read-only.',
        403,
      )
    if (!rest) {
      if (method === 'GET') {
        const { items: _items, description: _description, ...collection } = c
        const paged = page(items(c), url)
        return paged instanceof HttpResponse
          ? paged
          : json({ collection, items: paged })
      }
      if (method === 'DELETE') {
        account.collections = account.collections.filter((x) => x.id !== id)
        saveAccount()
        return new HttpResponse(null, { status: 204 })
      }
      const name = String(body.name || '').trim()
      if (!name || name.length > 80)
        return error(
          'validation_error',
          'Use a name between 1 and 80 characters.',
        )
      if (
        account.collections.some(
          (x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return error('name_conflict', 'Name already used.', 409)
      c.name = name
      c.updated_at = now()
      saveAccount()
      const { items: _items, description: _description, ...updated } = c
      return json(updated)
    }
    if (rest === 'sharing/') {
      c.sharing_enabled = method === 'PUT'
      if (c.sharing_enabled && !c.share_url) {
        const bytes = crypto.getRandomValues(new Uint8Array(32))
        c.share_url =
          config.appOrigin +
          '/shared/' +
          Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      }
      if (!c.sharing_enabled) c.share_url = null
      saveAccount()
      return c.sharing_enabled
        ? json({ enabled: true, url: c.share_url })
        : new HttpResponse(null, { status: 204 })
    }
    const member = rest.match(/^items\/(movie|tv)\/(\d+)\/$/)
    if (member) {
      const t = findTitle(member[1], member[2])
      if (!t) return error('not_found', 'Title unavailable.', 404)
      if (method === 'DELETE')
        c.items = c.items.filter((i) => titleKey(i) !== titleKey(t))
      else {
        saveTitle(account, t)
        if (!c.items.some((i) => titleKey(i) === titleKey(t)))
          c.items.push({ media_type: t.media_type, tmdb_id: t.tmdb_id })
      }
      c.item_count = c.items.length
      c.updated_at = now()
      saveAccount()
      return method === 'DELETE'
        ? new HttpResponse(null, { status: 204 })
        : json({ title: t, added_at: now() })
    }
  }
  const shared = path.match(/^shared\/([^/]+)\/$/)
  if (shared) {
    if (shared[1] === 'demo')
      return json({
        name: 'Weekend Sci-Fi',
        items: page(
          titles
            .filter((t) => t.genres.some((g) => g.key === 'sci-fi'))
            .slice(0, 8)
            .map((title) => ({ title, added_at: null })),
          url,
        ),
      })
    const c = account.collections.find(
      (c) => c.sharing_enabled && c.share_url?.endsWith('/' + shared[1]),
    )
    if (!c)
      return error(
        'not_found',
        'This link is invalid or has been revoked.',
        404,
      )
    const paged = page(items(c), url)
    return paged instanceof HttpResponse
      ? paged
      : json({ name: c.name, items: paged })
  }
  if (path === 'me/guest-sync/')
    return syncGuest(body as unknown as Schema['SyncInput'])
  return error('not_found', 'Endpoint unavailable.', 404)
}

function syncGuest(input: Schema['SyncInput']) {
  const existing = receipts.get(input.sync_id)
  if (existing)
    return existing.body === JSON.stringify(input)
      ? json(existing.result)
      : error('idempotency_conflict', 'Retry the unchanged sync job.', 409)
  const draft = structuredClone(account)
  const result: Schema['SyncResult'] = {
    sync_id: input.sync_id,
    saved_created: 0,
    saved_merged: 0,
    collections_created: 0,
    memberships_created: 0,
    collection_mappings: [],
    rejected_titles: [],
  }
  const pendingMappings = new Map(mappings)
  for (const s of input.saved_titles) {
    const t = findTitle(s.media_type, String(s.tmdb_id))
    if (!t) {
      result.rejected_titles.push({
        title: { media_type: s.media_type, tmdb_id: s.tmdb_id },
        code: 'title_unavailable',
      })
      continue
    }
    const old = draft.saved.find((o) => titleKey(o.title) === titleKey(t))
    if (old) {
      result.saved_merged++
      if (s.watched && !old.watched) {
        old.watched = true
        old.watched_at = s.watched_at
      }
    } else {
      draft.saved.push({
        title: t,
        watched: s.watched,
        saved_at: s.saved_at,
        watched_at: s.watched_at,
      })
      result.saved_created++
    }
  }
  for (const c of input.collections) {
    const mappingKey = input.guest_id + ':' + c.client_id
    let target = draft.collections.find(
      (x) => x.id === mappings.get(mappingKey),
    )
    if (mappings.has(mappingKey) && !target)
      return error(
        'sync_source_deleted',
        'The imported collection was deleted. Create a new local collection to import it again.',
        409,
      )
    if (!target) {
      let name = c.name,
        n = 2
      while (
        draft.collections.some(
          (x) => x.name.toLowerCase() === name.toLowerCase(),
        )
      )
        name = c.name.slice(0, 65) + ' (Imported ' + n++ + ')'
      target = {
        id: crypto.randomUUID(),
        name,
        kind: 'custom',
        item_count: 0,
        items: [],
        created_at: now(),
        updated_at: now(),
        sharing_enabled: false,
        share_url: null,
      }
      draft.collections.push(target)
      pendingMappings.set(mappingKey, target.id)
      result.collections_created++
    }
    for (const ref of c.items) {
      const t = findTitle(ref.media_type, String(ref.tmdb_id))
      if (t && !target.items.some((i) => titleKey(i) === titleKey(t))) {
        saveTitle(draft, t)
        target.items.push(ref)
        result.memberships_created++
      }
    }
    target.item_count = target.items.length
    result.collection_mappings.push({
      client_id: c.client_id,
      collection_id: target.id,
    })
  }
  account = draft
  pendingMappings.forEach((v, k) => mappings.set(k, v))
  saveAccount()
  receipts.set(input.sync_id, { body: JSON.stringify(input), result })
  sessionStorage.setItem(
    'cinescope:demo-sync:v1',
    JSON.stringify({ receipts: [...receipts], mappings: [...mappings] }),
  )
  return json(result)
}
export const handlers = [
  http.all('*/api/v1/*', ({ request }) => handle(request)),
]
export function resetDemo() {
  account = emptyLibrary()
  user = null
  receipts.clear()
  mappings.clear()
  snapshots.clear()
}
