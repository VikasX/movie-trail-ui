/**
 * The guest library storage format and its update helpers.
 * Zod checks stored browser JSON before the application uses it. The v1 namespace identifies this format.
 * These functions also calculate automatic groups and prepare/reconcile an explicit account import.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Runtime schemas that validate values rather than relying only on TypeScript.
import { z } from 'zod'
// Bring in compile-time types from `@/types/models`.
import type {
  LibraryData,
  Title,
  TitleRef,
  Saved,
  LocalCollection,
  Schema,
} from '@/types/models'
// Bring in the exported helpers/components from `@/types/models`.
import { titleKey } from '@/types/models'

// Validate the smallest title identity stored in collection memberships.
// Keep `ref` as the Zod validation rule `z.object({ media_type: z.enum(['movie', 'tv']), tmdb_id: z.number().int().positive(), })`.
const ref = z.object({
  // Whether the identity belongs to a movie or a TV series.
  media_type: z.enum(['movie', 'tv']),
  // The numeric TMDB identifier, paired with media_type to identify a title.
  tmdb_id: z.number().int().positive(),
})
// Save display metadata too, allowing a guest card to render after a refresh or a different search.
// Keep `title` as the result returned by `ref.extend` with these arguments.
const title = ref.extend({
  // The title record or display title used by this object.
  title: z.string(),
  // The title in its original language.
  original_title: z.string(),
  // The synopsis shown in title details.
  overview: z.string(),
  // The release year, which can be missing.
  year: z.number().nullable(),
  // The release date supplied by the catalogue.
  release_date: z.string().nullable(),
  // The portrait image URL used on cards.
  poster_url: z.string().nullable(),
  // The wide image URL used for title backgrounds.
  backdrop_url: z.string().nullable(),
  // The genre values used for filtering or display.
  genres: z.array(z.object({ key: z.string(), name: z.string() })),
  // The original-language code used by the API.
  original_language: z.string(),
  // The catalogue rating, which may be unavailable.
  rating: z.number().nullable(),
  // The number of votes behind the rating.
  vote_count: z.number(),
  // The catalogue popularity value used for ranking.
  popularity: z.number(),
  // The running time in minutes, when known.
  runtime_minutes: z.number().nullable(),
  // Whether the running time describes a movie, an episode, or an unknown basis.
  runtime_basis: z.enum(['movie', 'episode', 'unknown']),
  // Whether the catalogue metadata is available, stale, or unavailable.
  metadata_status: z.enum(['available', 'stale', 'unavailable']),
})
// This runtime schema checks the entire document read from localStorage. TypeScript types alone cannot check saved JSON.
// Keep `storageSchema` as the Zod validation rule `z.object({ version: z.literal(1), guest_id: z.uuid(), saved: z.array( z.object({ title, watched: z.boolean(...`.
const storageSchema = z.object({
  // The local storage format version, used when validating the saved document.
  version: z.literal(1),
  // The identity of this browser guest library.
  guest_id: z.uuid(),
  // The saved-title rows kept for this guest library.
  saved: z.array(
    z.object({
      // Use the existing `title` variable as the field with the same name.
      title,
      // Whether this saved title has been marked watched.
      watched: z.boolean(),
      // The time the title was added to saved titles.
      saved_at: z.iso.datetime(),
      // The time it was marked watched, or null when unwatched.
      watched_at: z.iso.datetime().nullable(),
    }),
  ),
  // The collections belonging to this data object.
  collections: z.array(
    z.object({
      // Set the `id` field to the Zod validation rule `z.string()`.
      id: z.string(),
      // Set the `name` field to the Zod validation rule `z.string()`.
      name: z.string(),
      // The collection kind, distinguishing editable custom groups from computed automatic groups.
      kind: z.literal('custom'),
      // The member records contained in this group or paginated response.
      items: z.array(ref),
      // The descriptive text associated with this value.
      description: z.string().optional(),
      // The number of members reported for this collection.
      item_count: z.number(),
      // The record creation time.
      created_at: z.string().nullable(),
      // The most recent record-update time.
      updated_at: z.string().nullable(),
      // Whether this collection currently has public sharing enabled.
      sharing_enabled: z.boolean(),
      // The public link, or null when no link is available.
      share_url: z.string().nullable(),
    }),
  ),
  // Recently explored titles, maintained separately from saved titles.
  recent: z.array(z.object({ title, explored_at: z.string() })),
})
// The version is part of the key and the document. Future storage formats can use a new version deliberately.
// Keep `GUEST_KEY` as the text `'cinescope:guest:v1'`.
export const GUEST_KEY = 'cinescope:guest:v1'
/** Create a fresh versioned guest library with a random browser-library identity. */
export function emptyLibrary(): LibraryData {
  // Return an object whose named fields are explained below to the caller.
  return {
    // The local storage format version, used when validating the saved document.
    version: 1,
    // The identity of this browser guest library.
    guest_id: crypto.randomUUID(),
    // The saved-title rows kept for this guest library.
    saved: [],
    // The collections belonging to this data object.
    collections: [],
    // Recently explored titles, maintained separately from saved titles.
    recent: [],
  }
}
/** Parse and validate saved browser JSON, recovering to a fresh library if reading fails. */
export function readLibrary(
  /* The lookup/storage key; a default below is used when omitted. Omitting this input uses the default shown after =. */ key = GUEST_KEY,
): LibraryData {
  // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
  try {
    // JSON.parse checks JSON syntax. safeParse then checks field types and returns a success/failure result.
    // Keep `parsed` as a Zod validation result containing either validated data or validation errors.
    const parsed = storageSchema.safeParse(
      JSON.parse(localStorage.getItem(key) || 'null'),
    )
    // Take this branch only when `parsed.success` is truthy.
    if (parsed.success) return parsed.data
  } catch {
    /* Invalid or blocked storage starts a fresh in-memory library. */
  }
  // Return the result returned by `emptyLibrary` with these arguments to the caller.
  return emptyLibrary()
}
/** Write the complete library as JSON under its browser-storage key. */
export function persistLibrary(
  /* The input data this helper reads or updates, according to its type. */ data: LibraryData,
  /* The lookup/storage key; a default below is used when omitted. Omitting this input uses the default shown after =. */ key = GUEST_KEY,
) {
  // Persist this key/value pair in localStorage; the data argument is serialized where needed.
  localStorage.setItem(key, JSON.stringify(data))
}
/** Save a title once and optionally change its watched status while preserving its original save time. */
export function saveTitle(
  /* The input data this helper reads or updates, according to its type. */ data: LibraryData,
  /* The movie/TV identity or title record being processed. */ t: Title,
  /* Optional desired watched status. Undefined preserves the existing status where supported. The ? allows the caller to omit this input. */ watched?: boolean,
) {
  // Find an existing movie/TV identity before inserting, so another click cannot create a duplicate saved row.
  // Keep `old` as the first array item matching the predicate, or undefined when nothing matches.
  const old = data.saved.find((s) => titleKey(s.title) === titleKey(t))
  // Keep `now` as the result returned by `new Date().toISOString` with these arguments.
  const now = new Date().toISOString()
  // Take this branch only when `old` is truthy.
  if (old) {
    // Leaving watched unspecified preserves the existing status. false explicitly changes it back to unwatched.
    // Take this branch only when `watched !== undefined` is truthy.
    if (watched !== undefined) {
      // Update `old.watched` using the value read from `watched`.
      old.watched = watched
      // Update `old.watched_at` using a choice between two values based on `watched`.
      old.watched_at = watched ? old.watched_at || now : null
    }
  } else {
    // The guest capacity matches one supported sync payload. The account backend has its own limits.
    // Take this branch only when `data.saved.length >= 500` is truthy.
    if (data.saved.length >= 500)
      // Stop this operation by throwing the following error to its caller or catch block.
      throw new Error(
        'Your guest library has reached 500 titles. Sign in and sync to keep saving.',
      )
    // Insert this record at the start of `data.saved` so it appears first.
    data.saved.unshift({
      // The title record or display title used by this object.
      title: t,
      // Whether this saved title has been marked watched.
      watched: watched ?? false,
      // The time the title was added to saved titles.
      saved_at: now,
      // The time it was marked watched, or null when unwatched.
      watched_at: watched ? now : null,
    })
  }
}
/** Remove one composite movie/TV identity from saves and from every custom collection. */
export function removeTitle(
  /* The input data this helper reads or updates, according to its type. */ data: LibraryData,
  /* The movie/TV identity or title record being processed. */ t: TitleRef,
) {
  // Update `data.saved` using an array containing only items that pass the predicate.
  data.saved = data.saved.filter((s) => titleKey(s.title) !== titleKey(t))
  // Unsave cascades through custom memberships. Deleting only a membership elsewhere keeps the saved title.
  // Run this callback once for every item in `data.collections`.
  data.collections.forEach((c) => {
    // Update `c.items` using an array containing only items that pass the predicate.
    c.items = c.items.filter((i) => titleKey(i) !== titleKey(t))
    // Update `c.item_count` using the value read from `c.items.length`.
    c.item_count = c.items.length
  })
}
/** Build read-only groups from saved metadata without persisting duplicate collections. */
export function automaticCollections(
  /* The saved-title rows used to calculate the resulting groups. */ saved: Saved[],
): LocalCollection[] {
  // Build each automatic group once, keyed by its stable auto: identifier.
  // Keep `groups` as a key-to-value lookup used to group or retrieve records.
  const groups = new Map<string, { name: string; items: TitleRef[] }>()
  // Keep `add` as a callback that runs when it is called.
  const add = (id: string, name: string, t: Title) => {
    // Keep `g` as `groups.get(id)`, falling back to the right-hand value when the left side is falsy.
    const g = groups.get(id) || { name, items: [] }
    // Append these values to the end of `g.items`.
    g.items.push(t)
    // Assign the supplied value under key `id` in `groups`.
    groups.set(id, g)
  }
  // Visit each item in `saved` using `const s`.
  for (const s of saved) {
    // Keep `t` as the value read from `s.title`.
    const t = s.title
    // Run this callback once for every item in `t.genres`.
    t.genres.forEach((g) => add('auto:genre:' + g.key, g.name, t))
    // Take this branch only when `t.year` is truthy.
    if (t.year) {
      // Rounding 2024 down to the nearest multiple of ten produces the 2020s group.
      // Keep `decade` as the expression `Math.floor(t.year / 10) * 10`.
      const decade = Math.floor(t.year / 10) * 10
      // Call `add` with the arguments below to perform this step.
      add('auto:decade:' + decade, decade + 's', t)
    }
    // A missing rating is treated as below the threshold for this computed view.
    // Take this branch only when `(t.rating ?? 0) >= 8` is truthy.
    if ((t.rating ?? 0) >= 8) add('auto:highly-rated', 'Highly Rated', t)
    // Call `add` with the arguments below to perform this step.
    add(
      t.media_type === 'movie' ? 'auto:movies' : 'auto:tv',
      t.media_type === 'movie' ? 'Movies' : 'TV Series',
      t,
    )
    // Take this branch only when `s.watched` is truthy.
    if (s.watched) add('auto:watched', 'Watched', t)
  }
  // Return an array made by transforming every source item with this callback to the caller.
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, g]) => ({
      // Use the existing `id` variable as the field with the same name.
      id,
      // Set the `name` field to the value read from `g.name`.
      name: g.name,
      // The member records contained in this group or paginated response.
      items: g.items,
      // The number of members reported for this collection.
      item_count: g.items.length,
      // The collection kind, distinguishing editable custom groups from computed automatic groups.
      kind: 'automatic',
      // The record creation time.
      created_at: null,
      // The most recent record-update time.
      updated_at: null,
      // Whether this collection currently has public sharing enabled.
      sharing_enabled: false,
      // The public link, or null when no link is available.
      share_url: null,
    }))
}
/** Build the contract-shaped import request from a frozen guest-library snapshot. */
export function syncPayload(
  /* The input data this helper reads or updates, according to its type. */ data: LibraryData,
): Schema['SyncInput'] {
  // Return an object whose named fields are explained below to the caller.
  return {
    // The dialog freezes this request for a sync attempt. A retry reuses its sync ID and body.
    // The stable ID used to recognize retries of the same guest import.
    sync_id: crypto.randomUUID(),
    // The identity of this browser guest library.
    guest_id: data.guest_id,
    // The saved-title entries included in the import request.
    saved_titles: data.saved.map((s) => ({
      ...{ media_type: s.title.media_type, tmdb_id: s.title.tmdb_id },
      // Whether this saved title has been marked watched.
      watched: s.watched,
      // The time the title was added to saved titles.
      saved_at: s.saved_at,
      // The time it was marked watched, or null when unwatched.
      watched_at: s.watched_at,
    })),
    // Send contract fields and minimal title references. Local descriptions and poster metadata are left in the browser.
    // The collections belonging to this data object.
    collections: data.collections.map((c) => ({
      // The browser collection ID used to match the server import result.
      client_id: c.id,
      // Set the `name` field to the value read from `c.name`.
      name: c.name,
      // The member records contained in this group or paginated response.
      items: c.items.map((t) => ({
        // Whether the identity belongs to a movie or a TV series.
        media_type: t.media_type,
        // The numeric TMDB identifier, paired with media_type to identify a title.
        tmdb_id: t.tmdb_id,
      })),
    })),
  }
}
/** Keep rejected records and new edits, clearing only accepted records that still match the submitted snapshot. */
export function reconcileSync(
  /* The latest guest document, including edits made while the request was running. */ current: LibraryData,
  /* The frozen guest copy submitted in the import request. */ snapshot: LibraryData,
  /* The server result used to determine which submitted records were accepted. */ result: Schema['SyncResult'],
) {
  // Sort object keys before comparing snapshots. JSON field order should not make an unchanged record appear edited.
  // Keep `canonical` as a callback that runs when it is called.
  const canonical = (value: unknown): unknown => {
    // Take this branch only when `Array.isArray(value)` is truthy.
    if (Array.isArray(value)) return value.map(canonical)
    // Take this branch only when `value && typeof value === 'object'` is truthy.
    if (value && typeof value === 'object')
      // Return the result returned by `Object.fromEntries` with these arguments to the caller.
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, canonical(v)]),
      )
    // Return the value read from `value` to the caller.
    return value
  }
  // Keep `unchanged` as a callback that runs when it is called.
  const unchanged = (a: unknown, b: unknown) =>
    JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
  // Rejected title identities remain in guest storage so they can be retried or handled later.
  // Keep `rejected` as a collection of unique values for membership checks.
  const rejected = new Set(result.rejected_titles.map((r) => titleKey(r.title)))
  // Keep new records, rejected records, and records edited since the submitted snapshot.
  // Update `current.saved` using an array containing only items that pass the predicate.
  current.saved = current.saved.filter((s) => {
    // Keep `old` as the first array item matching the predicate, or undefined when nothing matches.
    const old = snapshot.saved.find(
      (o) => titleKey(o.title) === titleKey(s.title),
    )
    // Return `!old || rejected.has(titleKey(s.title))`, falling back to the right-hand value when the left side is falsy to the caller.
    return !old || rejected.has(titleKey(s.title)) || !unchanged(old, s)
  })
  // Keep `mapped` as a collection of unique values for membership checks.
  const mapped = new Set(result.collection_mappings.map((m) => m.client_id))
  // Remove an imported collection only if its contents still match the submitted copy and none of its titles were rejected.
  // Update `current.collections` using an array containing only items that pass the predicate.
  current.collections = current.collections.filter((c) => {
    // Keep `old` as the first array item matching the predicate, or undefined when nothing matches.
    const old = snapshot.collections.find((o) => o.id === c.id)
    // Return `!old || !mapped.has(c.id) || c.items.some((i) => rejected.has(titleKey(i)))`, falling back to the right-hand value when the left side is falsy to the caller.
    return (
      !old ||
      !mapped.has(c.id) ||
      c.items.some((i) => rejected.has(titleKey(i))) ||
      !unchanged(old, c)
    )
  })
  // Return the value read from `current` to the caller.
  return current
}
