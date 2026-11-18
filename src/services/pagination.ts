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
  // Keep `next` as the expression `path + '?page_size=100'`.
  let next = path + '?page_size=100'
  // Keep `combined` as an initially empty value.
  let combined: Page<T> | undefined
  // Request another page only while the previous response provides one.
  // Repeat the following work while `next` remains truthy.
  while (next) {
    // Stop on a request error so callers can show a retry instead of treating a partial list as complete.
    // Keep `result` as the completed result of `fetchPage(next)`; await pauses this async function until the promise settles.
    const result = await fetchPage(next)
    // Take this branch only when `result.error` is truthy.
    if (result.error) return { error: result.error }
    // Keep `page` as the value read from `result.data` with a TypeScript shape assertion; the assertion adds no runtime validation.
    const page = result.data as Page<T>
    // Update `combined` using a choice between two values based on `combined`.
    combined = combined
      ? { ...page, results: [...combined.results, ...page.results] }
      : page
    // Take this branch only when `!page.next` is truthy.
    if (!page.next) break
    // Keep the server-issued page/snapshot parameters while retaining the configured API path and origin.
    // Keep `url` as a new URL instance initialized with these arguments.
    const url = new URL(page.next)
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
  // Keep `next` as the expression `path + '?page_size=100'`.
  let next = path + '?page_size=100'
  // Keep `combined` as an initially empty value.
  let combined: Schema['CollectionDetail'] | undefined
  // Repeat the following work while `next` remains truthy.
  while (next) {
    // Keep `result` as the completed result of `fetchPage(next)`; await pauses this async function until the promise settles.
    const result = await fetchPage(next)
    // Take this branch only when `result.error` is truthy.
    if (result.error) return { error: result.error }
    // Keep `data` as the value read from `result.data` with a TypeScript shape assertion; the assertion adds no runtime validation.
    const data = result.data as Schema['CollectionDetail']
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
    next = path + '?' + new URL(data.items.next).searchParams.toString()
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
