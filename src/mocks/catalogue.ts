import type { Title, Filters } from '@/types/models'
export function filterTitles(titles: Title[], p: Filters): Title[] {
  let list = titles.filter(
    (t) =>
      (!p.media_type ||
        p.media_type === 'all' ||
        p.media_type === t.media_type) &&
      (!p.q || t.title.toLowerCase().includes(p.q.toLowerCase())) &&
      (!p.genres ||
        String(p.genres)
          .split(',')
          .every((g) => t.genres.some((x) => x.key === g))) &&
      (!p.year_from || (t.year !== null && t.year >= Number(p.year_from))) &&
      (!p.year_to || (t.year !== null && t.year <= Number(p.year_to))) &&
      (!p.min_rating ||
        (t.rating !== null && t.rating >= Number(p.min_rating))) &&
      (!p.original_language || t.original_language === p.original_language) &&
      (!p.runtime_min ||
        (t.runtime_minutes !== null &&
          t.runtime_minutes >= Number(p.runtime_min))) &&
      (!p.runtime_max ||
        (t.runtime_minutes !== null &&
          t.runtime_minutes <= Number(p.runtime_max))),
  )
  if (p.person_id)
    list = list.filter((t) =>
      p.person_id === 525
        ? [157336, 872585].includes(t.tmdb_id)
        : p.person_id === 137427
          ? [693134, 335984, 329865].includes(t.tmdb_id)
          : [693134].includes(t.tmdb_id),
    )
  if (p.feed === 'new_releases') {
    const since = new Date()
    since.setDate(since.getDate() - 90)
    list = list.filter(
      (t) =>
        t.release_date &&
        new Date(t.release_date) >= since &&
        new Date(t.release_date) <= new Date(),
    )
  }
  return list.sort((a, b) => {
    const sort = p.sort || 'relevance'
    const value =
      sort === 'rating_desc'
        ? (b.rating ?? -1) - (a.rating ?? -1)
        : sort === 'release_date_desc'
          ? (b.year ?? 0) - (a.year ?? 0)
          : sort === 'release_date_asc'
            ? (a.year ?? 9999) - (b.year ?? 9999)
            : sort === 'title_asc'
              ? a.title.localeCompare(b.title)
              : b.popularity - a.popularity
    return (
      value || a.media_type.localeCompare(b.media_type) || a.tmdb_id - b.tmdb_id
    )
  })
}
