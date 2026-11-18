import { describe, expect, it, vi } from 'vitest'
import { fetchCollection, fetchComplete } from './pagination'

describe('contract-compatible pagination', () => {
  it('loads library pages within the limit and preserves snapshot parameters', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          count: 2,
          previous: null,
          results: [{ id: 'first' }],
          meta: {},
          next: 'https://backend.example/api/v1/me/library/?page=2&page_size=50&snapshot=frozen',
        },
      })
      .mockResolvedValueOnce({
        data: {
          count: 2,
          previous: null,
          next: null,
          results: [{ id: 'second' }],
          meta: {},
        },
      })

    const result = await fetchComplete('me/library/', fetchPage)

    expect(fetchPage.mock.calls.map(([url]) => url)).toEqual([
      'me/library/?page_size=50',
      'me/library/?page=2&page_size=50&snapshot=frozen',
    ])
    expect(result.data?.results).toEqual([{ id: 'first' }, { id: 'second' }])
    expect(result.data?.next).toBeNull()
  })

  it('loads collection item pages within the limit and combines their items', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          collection: { id: 'collection' },
          items: {
            count: 2,
            previous: null,
            meta: {},
            results: [{ id: 'first' }],
            next: 'https://backend.example/api/v1/me/collections/collection/?page=2&page_size=50&snapshot=frozen',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          collection: { id: 'collection' },
          items: {
            count: 2,
            previous: null,
            next: null,
            meta: {},
            results: [{ id: 'second' }],
          },
        },
      })

    const result = await fetchCollection(
      'me/collections/collection/',
      fetchPage,
    )

    expect(fetchPage.mock.calls.map(([url]) => url)).toEqual([
      'me/collections/collection/?page_size=50',
      'me/collections/collection/?page=2&page_size=50&snapshot=frozen',
    ])
    expect(result.data?.items.results).toEqual([
      { id: 'first' },
      { id: 'second' },
    ])
    expect(result.data?.items.next).toBeNull()
  })
})
