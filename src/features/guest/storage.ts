import { z } from 'zod'
import type {
  LibraryData,
  Title,
  TitleRef,
  Saved,
  LocalCollection,
  Schema,
} from '@/types/models'
import { titleKey } from '@/types/models'

const ref = z.object({
  media_type: z.enum(['movie', 'tv']),
  tmdb_id: z.number().int().positive(),
})
const title = ref.extend({
  title: z.string(),
  original_title: z.string(),
  overview: z.string(),
  year: z.number().nullable(),
  release_date: z.string().nullable(),
  poster_url: z.string().nullable(),
  backdrop_url: z.string().nullable(),
  genres: z.array(z.object({ key: z.string(), name: z.string() })),
  original_language: z.string(),
  rating: z.number().nullable(),
  vote_count: z.number(),
  popularity: z.number(),
  runtime_minutes: z.number().nullable(),
  runtime_basis: z.enum(['movie', 'episode', 'unknown']),
  metadata_status: z.enum(['available', 'stale', 'unavailable']),
})
const storageSchema = z.object({
  version: z.literal(1),
  guest_id: z.uuid(),
  saved: z.array(
    z.object({
      title,
      watched: z.boolean(),
      saved_at: z.iso.datetime(),
      watched_at: z.iso.datetime().nullable(),
    }),
  ),
  collections: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.literal('custom'),
      items: z.array(ref),
      description: z.string().optional(),
      item_count: z.number(),
      created_at: z.string().nullable(),
      updated_at: z.string().nullable(),
      sharing_enabled: z.boolean(),
      share_url: z.string().nullable(),
    }),
  ),
  recent: z.array(z.object({ title, explored_at: z.string() })),
})
export const GUEST_KEY = 'cinescope:guest:v1'
export function emptyLibrary(): LibraryData {
  return {
    version: 1,
    guest_id: crypto.randomUUID(),
    saved: [],
    collections: [],
    recent: [],
  }
}
export function readLibrary(key = GUEST_KEY): LibraryData {
  try {
    const parsed = storageSchema.safeParse(
      JSON.parse(localStorage.getItem(key) || 'null'),
    )
    if (parsed.success) return parsed.data
  } catch {
    /* Invalid or blocked storage starts a fresh in-memory library. */
  }
  return emptyLibrary()
}
export function persistLibrary(data: LibraryData, key = GUEST_KEY) {
  localStorage.setItem(key, JSON.stringify(data))
}
export function saveTitle(data: LibraryData, t: Title, watched?: boolean) {
  const old = data.saved.find((s) => titleKey(s.title) === titleKey(t))
  const now = new Date().toISOString()
  if (old) {
    if (watched !== undefined) {
      old.watched = watched
      old.watched_at = watched ? old.watched_at || now : null
    }
  } else {
    if (data.saved.length >= 500)
      throw new Error(
        'Your guest library has reached 500 titles. Sign in and sync to keep saving.',
      )
    data.saved.unshift({
      title: t,
      watched: watched ?? false,
      saved_at: now,
      watched_at: watched ? now : null,
    })
  }
}
export function removeTitle(data: LibraryData, t: TitleRef) {
  data.saved = data.saved.filter((s) => titleKey(s.title) !== titleKey(t))
  data.collections.forEach((c) => {
    c.items = c.items.filter((i) => titleKey(i) !== titleKey(t))
    c.item_count = c.items.length
  })
}
export function automaticCollections(saved: Saved[]): LocalCollection[] {
  const groups = new Map<string, { name: string; items: TitleRef[] }>()
  const add = (id: string, name: string, t: Title) => {
    const g = groups.get(id) || { name, items: [] }
    g.items.push(t)
    groups.set(id, g)
  }
  for (const s of saved) {
    const t = s.title
    t.genres.forEach((g) => add('auto:genre:' + g.key, g.name, t))
    if (t.year) {
      const decade = Math.floor(t.year / 10) * 10
      add('auto:decade:' + decade, decade + 's', t)
    }
    if ((t.rating ?? 0) >= 8) add('auto:highly-rated', 'Highly Rated', t)
    add(
      t.media_type === 'movie' ? 'auto:movies' : 'auto:tv',
      t.media_type === 'movie' ? 'Movies' : 'TV Series',
      t,
    )
    if (s.watched) add('auto:watched', 'Watched', t)
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, g]) => ({
      id,
      name: g.name,
      items: g.items,
      item_count: g.items.length,
      kind: 'automatic',
      created_at: null,
      updated_at: null,
      sharing_enabled: false,
      share_url: null,
    }))
}
export function syncPayload(data: LibraryData): Schema['SyncInput'] {
  return {
    sync_id: crypto.randomUUID(),
    guest_id: data.guest_id,
    saved_titles: data.saved.map((s) => ({
      ...{ media_type: s.title.media_type, tmdb_id: s.title.tmdb_id },
      watched: s.watched,
      saved_at: s.saved_at,
      watched_at: s.watched_at,
    })),
    collections: data.collections.map((c) => ({
      client_id: c.id,
      name: c.name,
      items: c.items.map((t) => ({
        media_type: t.media_type,
        tmdb_id: t.tmdb_id,
      })),
    })),
  }
}
export function reconcileSync(
  current: LibraryData,
  snapshot: LibraryData,
  result: Schema['SyncResult'],
) {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, canonical(v)]),
      )
    return value
  }
  const unchanged = (a: unknown, b: unknown) =>
    JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
  const rejected = new Set(result.rejected_titles.map((r) => titleKey(r.title)))
  current.saved = current.saved.filter((s) => {
    const old = snapshot.saved.find(
      (o) => titleKey(o.title) === titleKey(s.title),
    )
    return !old || rejected.has(titleKey(s.title)) || !unchanged(old, s)
  })
  const mapped = new Set(result.collection_mappings.map((m) => m.client_id))
  current.collections = current.collections.filter((c) => {
    const old = snapshot.collections.find((o) => o.id === c.id)
    return (
      !old ||
      !mapped.has(c.id) ||
      c.items.some((i) => rejected.has(titleKey(i))) ||
      !unchanged(old, c)
    )
  })
  return current
}
