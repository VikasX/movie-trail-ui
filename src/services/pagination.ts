import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query'
import type { Schema } from '@/types/models'
type Page<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
  meta: Schema['PageMeta']
}
type FetchPage = (
  args: string | FetchArgs,
) => ReturnType<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>
export async function fetchComplete<T>(path: string, fetchPage: FetchPage) {
  let next = path + '?page_size=100'
  let combined: Page<T> | undefined
  while (next) {
    const result = await fetchPage(next)
    if (result.error) return { error: result.error }
    const page = result.data as Page<T>
    combined = combined
      ? { ...page, results: [...combined.results, ...page.results] }
      : page
    if (!page.next) break
    const url = new URL(page.next)
    next = path + '?' + url.searchParams.toString()
  }
  return { data: { ...combined!, next: null, previous: null } }
}
export async function fetchCollection(path: string, fetchPage: FetchPage) {
  let next = path + '?page_size=100'
  let combined: Schema['CollectionDetail'] | undefined
  while (next) {
    const result = await fetchPage(next)
    if (result.error) return { error: result.error }
    const data = result.data as Schema['CollectionDetail']
    combined = combined
      ? {
          collection: data.collection,
          items: {
            ...data.items,
            results: [...combined.items.results, ...data.items.results],
          },
        }
      : data
    if (!data.items.next) break
    next = path + '?' + new URL(data.items.next).searchParams.toString()
  }
  return {
    data: {
      ...combined!,
      items: { ...combined!.items, next: null, previous: null },
    },
  }
}
