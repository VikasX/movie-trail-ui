/**
 * Helpers that collect every page of a private library or collection response.
 * Django returns a snapshot and a next-page URL. We retain its query parameters while using our configured API path.
 * These helpers return a single combined result to the endpoint that called them.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in compile-time types from `@reduxjs/toolkit/query`.
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query'
// Bring in compile-time types from `@/types/models`.
import type { Schema } from '@/types/models'
import { safePageUrl } from '@/lib/security'

// Django's API contract allows at most 50 items per page, including public shares.
export const PAGE_SIZE = 50
// T stands for the type of one row. The same page shape can contain saved titles or collection summaries.
// Define `Page` as a compile-time type alias for the shape below; it creates no runtime object.
type Page<T> = {
  // The total matching row count reported by this response. Its type is `number`.
  count: number
  // The next page address, or null when this is the last page. Its type is `string | null`.
  next: string | null
  // The previous page address, or null on the first page. Its type is `string | null`.
  previous: string | null
  // The records in this page of results. Its type is `T[]`.
  results: T[]
  // Extra API information such as snapshot or attribution data. Its type is `Schema['PageMeta']`.
  meta: Schema['PageMeta']
}
// The endpoint passes its configured baseQuery function, preserving cookies and CSRF behavior.
// Define `FetchPage` as a compile-time type alias for the shape below; it creates no runtime object.
type FetchPage = (
  args: string | FetchArgs,
) => ReturnType<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>
/** Read a flat paginated list until next is null, then return all collected rows. */
export async function fetchComplete<T>(
  /* The API-relative path requested through the configured base query. */ path: string,
  /* The endpoint-provided request function, retaining shared cookie/CSRF handling. */ fetchPage: FetchPage,
) {
  // Start within the API limit; subsequent requests keep the server's snapshot parameters.
  let next = path + '?page_size=' + PAGE_SIZE
  // Keep `combined` as an initially empty value.
  let combined: Page<T> | undefined
  const seen = new Set<string>()
  // Request another page only while the previous response provides one.
  // Repeat the following work while `next` remains truthy.
  while (next) {
    if (seen.has(next) || seen.size >= 1000)
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'Invalid pagination response.',
        },
      }
    seen.add(next)
    // Stop on a request error so callers can show a retry instead of treating a partial list as complete.
    // Keep `result` as the completed result of `fetchPage(next)`; await pauses this async function until the promise settles.
    const result = await fetchPage(next)
    // Take this branch only when `result.error` is truthy.
    if (result.error) return { error: result.error }
    // Keep `page` as the value read from `result.data` with a TypeScript shape assertion; the assertion adds no runtime validation.
    const page = result.data as Page<T>
    if (!page || !Array.isArray(page.results))
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'Invalid page response.',
        },
      }
    // Update `combined` using a choice between two values based on `combined`.
    combined = combined
      ? { ...page, results: [...combined.results, ...page.results] }
      : page
    // Take this branch only when `!page.next` is truthy.
    if (!page.next) break
    // Keep the server-issued page/snapshot parameters while retaining the configured API path and origin.
    // Keep `url` as a new URL instance initialized with these arguments.
    const url = safePageUrl(page.next)
    if (!url)
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'Invalid pagination response.',
        },
      }
    // Update `next` using the expression `path + '?' + url.searchParams.toString()`.
    next = path + '?' + url.searchParams.toString()
  }
  // Return an object whose named fields are explained below to the caller.
  return { data: { ...combined!, next: null, previous: null } }
}
/** Read the nested collection/items response until all item pages have been collected. */
// Collection detail wraps its page inside items, so its merge follows that nested response shape.
export async function fetchCollection(
  /* The API-relative path requested through the configured base query. */ path: string,
  /* The endpoint-provided request function, retaining shared cookie/CSRF handling. */ fetchPage: FetchPage,
) {
  // Collection item pages use the same maximum as the library and collection lists.
  let next = path + '?page_size=' + PAGE_SIZE
  // Keep `combined` as an initially empty value.
  let combined: Schema['CollectionDetail'] | undefined
  const seen = new Set<string>()
  // Repeat the following work while `next` remains truthy.
  while (next) {
    if (seen.has(next) || seen.size >= 1000)
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'Invalid pagination response.',
        },
      }
    seen.add(next)
    // Keep `result` as the completed result of `fetchPage(next)`; await pauses this async function until the promise settles.
    const result = await fetchPage(next)
    // Take this branch only when `result.error` is truthy.
    if (result.error) return { error: result.error }
    // Keep `data` as the value read from `result.data` with a TypeScript shape assertion; the assertion adds no runtime validation.
    const data = result.data as Schema['CollectionDetail']
    if (!data?.items || !Array.isArray(data.items.results))
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'Invalid page response.',
        },
      }
    // Update `combined` using a choice between two values based on `combined`.
    combined = combined
      ? {
          // Set the `collection` field to the value read from `data.collection`.
          collection: data.collection,
          // The member records contained in this group or paginated response.
          items: {
            ...data.items,
            // The records in this page of results.
            results: [...combined.items.results, ...data.items.results],
          },
        }
      : data
    // Take this branch only when `!data.items.next` is truthy.
    if (!data.items.next) break
    // Update `next` using the expression `path + '?' + new URL(data.items.next).searchParams.toString()`.
    const url = safePageUrl(data.items.next)
    if (!url)
      return {
        error: {
          status: 'CUSTOM_ERROR' as const,
          error: 'Invalid pagination response.',
        },
      }
    next = path + '?' + url.searchParams.toString()
  }
  // Return an object whose named fields are explained below to the caller.
  return {
    // Set the `data` field to an object whose named fields are explained below.
    data: {
      ...combined!,
      // The member records contained in this group or paginated response.
      items: { ...combined!.items, next: null, previous: null },
    },
  }
}
