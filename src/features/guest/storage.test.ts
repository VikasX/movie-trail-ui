import { beforeEach, describe, it, expect } from 'vitest'
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
import { titles } from '@/mocks/fixtures'
import { filterTitles } from '@/mocks/catalogue'
import { parseFilters, recommendationFilters } from '@/lib/filters'
describe('guest library invariants', () => {
  beforeEach(() => localStorage.clear())
  it('keeps movie and TV identities separate and preserves watched titles', () => {
    const d = emptyLibrary(),
      movie = titles[0],
      tv = { ...movie, media_type: 'tv' as const }
    saveTitle(d, movie, true)
    saveTitle(d, tv)
    saveTitle(d, movie)
    expect(d.saved).toHaveLength(2)
    expect(d.saved.find((s) => s.title.media_type === 'movie')?.watched).toBe(
      true,
    )
    d.collections.push({
      id: crypto.randomUUID(),
      name: 'Picks',
      kind: 'custom',
      items: [movie, tv],
      item_count: 2,
      created_at: null,
      updated_at: null,
      sharing_enabled: false,
      share_url: null,
    })
    removeTitle(d, movie)
    expect(d.collections[0].items).toEqual([tv])
  })
  it('persists metadata, tolerates corrupt storage and creates all automatic groups', () => {
    const d = emptyLibrary()
    saveTitle(d, titles[0], true)
    persistLibrary(d)
    expect(readLibrary()).toEqual(d)
    const ids = automaticCollections(d.saved).map((g) => g.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'auto:genre:sci-fi',
        'auto:decade:2020',
        'auto:highly-rated',
        'auto:movies',
        'auto:watched',
      ]),
    )
    localStorage.setItem('cinescope:guest:v1', 'broken')
    expect(readLibrary().saved).toEqual([])
  })
  it('clears accepted unchanged records while retaining rejected and concurrently edited data', () => {
    const original = emptyLibrary()
    saveTitle(original, titles[0])
    saveTitle(original, titles[1])
    const current = structuredClone(original)
    saveTitle(current, titles[0], true)
    saveTitle(current, titles[2])
    const payload = syncPayload(original)
    reconcileSync(current, original, {
      sync_id: payload.sync_id,
      saved_created: 1,
      saved_merged: 0,
      collections_created: 0,
      memberships_created: 0,
      collection_mappings: [],
      rejected_titles: [{ title: titles[1], code: 'title_unavailable' }],
    })
    expect(current.saved).toHaveLength(3)
    const clean = structuredClone(original)
    reconcileSync(clean, original, {
      sync_id: payload.sync_id,
      saved_created: 2,
      saved_merged: 0,
      collections_created: 0,
      memberships_created: 0,
      collection_mappings: [],
      rejected_titles: [],
    })
    expect(clean.saved).toHaveLength(0)
    expect(clean.recent).toEqual(original.recent)
  })
  it('matches every selected genre and converts URL numbers to contract JSON', () => {
    const filters = parseFilters(
      new URLSearchParams(
        'genres=animation,family&min_rating=7&year_from=2000',
      ),
    )
    expect(recommendationFilters(filters).min_rating).toBe(7)
    const results = filterTitles(titles, filters)
    expect(results.length).toBeGreaterThan(0)
    expect(
      results.every((t) =>
        ['animation', 'family'].every((g) => t.genres.some((x) => x.key === g)),
      ),
    ).toBe(true)
    expect(filterTitles(titles, { q: 'no-such-film' })).toEqual([])
  })
})
