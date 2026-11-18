/**
 * URL query values arrive as text. These helpers prepare typed request values.
 * parseFilters converts numbers and comma-separated genres for discovery.
 * recommendationFilters selects the smaller set of fields allowed by the recommendation contract.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in compile-time types from `@/types/models`.
import type { Filters, Schema } from '@/types/models'
/** Convert URL text into the numeric and array values used by API requests. */
export function parseFilters(
  /* The URL query parameters to read. */ params: URLSearchParams,
): Filters {
  // Keep `result` as an empty object, ready to collect named fields.
  const result: Record<string, unknown> = {}
  // Copy query entries first. Number conversion below handles fields whose API type is numeric.
  // Run this callback once for every item in `params`.
  params.forEach((v, k) => {
    // Update `result[k]` using the value read from `v`.
    result[k] = v
  })
  // Visit each item in `[ 'year_from', 'year_to', 'min_rating', 'runtime_min', 'runtime_max', 'person_id', 'page', 'page_size', ]` using `const key`.
  for (const key of [
    'year_from',
    'year_to',
    'min_rating',
    'runtime_min',
    'runtime_max',
    'person_id',
    'page',
    'page_size',
  ]) {
    // Take this branch only when `params.has(key)` is truthy.
    if (params.has(key)) result[key] = Number(params.get(key))
  }
  // A URL stores genres as one comma-separated string. The request model uses an array of genre keys.
  // Take this branch only when `params.has('genres')` is truthy.
  if (params.has('genres'))
    // Update `result.genres` using an array containing only items that pass the predicate.
    result.genres = params.get('genres')!.split(',').filter(Boolean)
  // Return the value read from `result` with a TypeScript shape assertion; the assertion adds no runtime validation to the caller.
  return result as Filters
}
/** Build the allowed recommendation-filter object from discovery filters. */
export function recommendationFilters(
  /* The discovery filter values to convert or narrow. */ filters: Filters,
): Schema['Filters'] {
  // Recommendation requests accept these filter dimensions. Search text, people IDs, paging, and feed fields are omitted.
  // Return an object whose named fields are explained below to the caller.
  return {
    // Whether the identity belongs to a movie or a TV series.
    media_type: filters.media_type || 'all',
    // The genre values used for filtering or display.
    genres: filters.genres,
    // Set the `year_from` field to the value read from `filters.year_from`.
    year_from: filters.year_from,
    // Set the `year_to` field to the value read from `filters.year_to`.
    year_to: filters.year_to,
    // Set the `min_rating` field to the value read from `filters.min_rating`.
    min_rating: filters.min_rating,
    // The original-language code used by the API.
    original_language: filters.original_language,
    // Set the `runtime_min` field to the value read from `filters.runtime_min`.
    runtime_min: filters.runtime_min,
    // Set the `runtime_max` field to the value read from `filters.runtime_max`.
    runtime_max: filters.runtime_max,
  }
}
