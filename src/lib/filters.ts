import type { Filters, Schema } from '@/types/models'
export function parseFilters(params: URLSearchParams): Filters {
  const result: Record<string, unknown> = {}
  params.forEach((v, k) => {
    result[k] = v
  })
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
    if (params.has(key)) result[key] = Number(params.get(key))
  }
  if (params.has('genres'))
    result.genres = params.get('genres')!.split(',').filter(Boolean)
  return result as Filters
}
export function recommendationFilters(filters: Filters): Schema['Filters'] {
  return {
    media_type: filters.media_type || 'all',
    genres: filters.genres,
    year_from: filters.year_from,
    year_to: filters.year_to,
    min_rating: filters.min_rating,
    original_language: filters.original_language,
    runtime_min: filters.runtime_min,
    runtime_max: filters.runtime_max,
  }
}
