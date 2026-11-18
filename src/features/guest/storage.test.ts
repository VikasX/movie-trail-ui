/**
 * Unit tests for guest storage, title identity, automatic grouping, sync reconciliation, and filters.
 * Each test supplies small input data and checks the resulting values directly.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// The test runner’s test declarations, assertions, and lifecycle helpers.
import { beforeEach, describe, it, expect } from 'vitest'
// Bring in the exported helpers/components from `./storage`.
import {
  emptyLibrary,
  saveTitle,
  removeTitle,
  automaticCollections,
  persistLibrary,
  readLibrary,
  reconcileSync,
  syncPayload,
} from './storage'
// Bring in the exported helpers/components from `@/mocks/fixtures`.
import { titles } from '@/mocks/fixtures'
// Bring in the exported helpers/components from `@/mocks/catalogue`.
import { filterTitles } from '@/mocks/catalogue'
// Bring in the exported helpers/components from `@/lib/filters`.
import { parseFilters, recommendationFilters } from '@/lib/filters'
// Group the related behavior tests under this description.
describe('guest library invariants', () => {
  // Run this setup/cleanup at the lifecycle point named `beforeEach`.
  beforeEach(() => localStorage.clear())
  // Exercise the behavior described by this test name.
  it('keeps movie and TV identities separate and preserves watched titles', () => {
    // Keep `d` as the result returned by `emptyLibrary` with these arguments.
    // Keep `movie` as the value read from `titles[0]`.
    // Keep `tv` as an object whose named fields are explained below.
    const d = emptyLibrary(),
      movie = titles[0],
      tv = { ...movie, media_type: 'tv' as const }
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(d, movie, true)
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(d, tv)
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(d, movie)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(d.saved).toHaveLength(2)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(d.saved.find((s) => s.title.media_type === 'movie')?.watched).toBe(
      true,
    )
    // Append these values to the end of `d.collections`.
    d.collections.push({
      // Set the `id` field to the result returned by `crypto.randomUUID` with these arguments.
      id: crypto.randomUUID(),
      // Set the `name` field to the text `'Picks'`.
      name: 'Picks',
      // The collection kind, distinguishing editable custom groups from computed automatic groups.
      kind: 'custom',
      // The member records contained in this group or paginated response.
      items: [movie, tv],
      // The number of members reported for this collection.
      item_count: 2,
      // The record creation time.
      created_at: null,
      // The most recent record-update time.
      updated_at: null,
      // Whether this collection currently has public sharing enabled.
      sharing_enabled: false,
      // The public link, or null when no link is available.
      share_url: null,
    })
    // Call `removeTitle` with the arguments below to perform this step.
    removeTitle(d, movie)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(d.collections[0].items).toEqual([tv])
  })
  // Exercise the behavior described by this test name.
  it('persists metadata, tolerates corrupt storage and creates all automatic groups', () => {
    // Keep `d` as the result returned by `emptyLibrary` with these arguments.
    const d = emptyLibrary()
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(d, titles[0], true)
    // Call `persistLibrary` with the arguments below to perform this step.
    persistLibrary(d)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(readLibrary()).toEqual(d)
    // Keep `ids` as an array made by transforming every source item with this callback.
    const ids = automaticCollections(d.saved).map((g) => g.id)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(ids).toEqual(
      expect.arrayContaining([
        'auto:genre:sci-fi',
        'auto:decade:2020',
        'auto:highly-rated',
        'auto:movies',
        'auto:watched',
      ]),
    )
    // Persist this key/value pair in localStorage; the data argument is serialized where needed.
    localStorage.setItem('cinescope:guest:v1', 'broken')
    // Assert this expected result; a mismatch causes the test to fail.
    expect(readLibrary().saved).toEqual([])
  })
  // Exercise the behavior described by this test name.
  it('clears accepted unchanged records while retaining rejected and concurrently edited data', () => {
    // Keep `original` as the result returned by `emptyLibrary` with these arguments.
    const original = emptyLibrary()
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(original, titles[0])
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(original, titles[1])
    // Keep `current` as a deep copy of `original`, allowing edits without mutating the original object.
    const current = structuredClone(original)
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(current, titles[0], true)
    // Call `saveTitle` with the arguments below to perform this step.
    saveTitle(current, titles[2])
    // Keep `payload` as the result returned by `syncPayload` with these arguments.
    const payload = syncPayload(original)
    // Call `reconcileSync` with the arguments below to perform this step.
    reconcileSync(current, original, {
      // The stable ID used to recognize retries of the same guest import.
      sync_id: payload.sync_id,
      // Set the `saved_created` field to the number 1.
      saved_created: 1,
      // Set the `saved_merged` field to the number 0.
      saved_merged: 0,
      // Set the `collections_created` field to the number 0.
      collections_created: 0,
      // Set the `memberships_created` field to the number 0.
      memberships_created: 0,
      // Set the `collection_mappings` field to an empty array, ready to collect items.
      collection_mappings: [],
      // Set the `rejected_titles` field to an array containing these ordered values.
      rejected_titles: [{ title: titles[1], code: 'title_unavailable' }],
    })
    // Assert this expected result; a mismatch causes the test to fail.
    expect(current.saved).toHaveLength(3)
    // Keep `clean` as a deep copy of `original`, allowing edits without mutating the original object.
    const clean = structuredClone(original)
    // Call `reconcileSync` with the arguments below to perform this step.
    reconcileSync(clean, original, {
      // The stable ID used to recognize retries of the same guest import.
      sync_id: payload.sync_id,
      // Set the `saved_created` field to the number 2.
      saved_created: 2,
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
    })
    // Assert this expected result; a mismatch causes the test to fail.
    expect(clean.saved).toHaveLength(0)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(clean.recent).toEqual(original.recent)
  })
  // Exercise the behavior described by this test name.
  it('matches every selected genre and converts URL numbers to contract JSON', () => {
    // Keep `filters` as the result returned by `parseFilters` with these arguments.
    const filters = parseFilters(
      new URLSearchParams(
        'genres=animation,family&min_rating=7&year_from=2000',
      ),
    )
    // Assert this expected result; a mismatch causes the test to fail.
    expect(recommendationFilters(filters).min_rating).toBe(7)
    // Keep `results` as the result returned by `filterTitles` with these arguments.
    const results = filterTitles(titles, filters)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(results.length).toBeGreaterThan(0)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(
      results.every((t) =>
        ['animation', 'family'].every((g) => t.genres.some((x) => x.key === g)),
      ),
    ).toBe(true)
    // Assert this expected result; a mismatch causes the test to fail.
    expect(filterTitles(titles, { q: 'no-such-film' })).toEqual([])
  })
})
