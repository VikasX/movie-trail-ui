/**
 * The demo implementation of catalogue filtering and sorting.
 * It works on fixture titles and follows the supported filter names used by the live API.
 * Django performs the equivalent catalogue work in live mode.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in compile-time types from `@/types/models`.
import type { Title, Filters } from '@/types/models'
/** Apply the demo filters together and sort only the resulting fixture selection. */
export function filterTitles(
  /* Input titles used by this helper; its type describes the accepted values. */ titles: Title[],
  /* Input p used by this helper; its type describes the accepted values. */ p: Filters,
): Title[] {
  // Every filter condition must pass. The selected genres also use every, implementing AND matching.
  // Keep `list` as an array containing only items that pass the predicate.
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
  // The demo contains a small fixed person-to-title mapping for exercising the people-search UI.
  // Take this branch only when `p.person_id` is truthy.
  if (p.person_id)
    // Update `list` using an array containing only items that pass the predicate.
    list = list.filter((t) =>
      p.person_id === 525
        ? [157336, 872585].includes(t.tmdb_id)
        : p.person_id === 137427
          ? [693134, 335984, 329865].includes(t.tmdb_id)
          : [693134].includes(t.tmdb_id),
    )
  // Keep only fixtures released within the last 90 days. Historical fixtures can make this feed empty.
  // Take this branch only when `p.feed === 'new_releases'` is truthy.
  if (p.feed === 'new_releases') {
    // Keep `since` as a Date object for time comparisons or timestamp formatting.
    const since = new Date()
    // Call `since.setDate` with the arguments below to perform this step.
    since.setDate(since.getDate() - 90)
    // Update `list` using an array containing only items that pass the predicate.
    list = list.filter(
      (t) =>
        t.release_date &&
        new Date(t.release_date) >= since &&
        new Date(t.release_date) <= new Date(),
    )
  }
  // Sort the eligible selection and use a stable composite identity when values tie.
  // Return the result returned by `list.sort` with these arguments to the caller.
  return list.sort((a, b) => {
    // Keep `sort` as `p.sort`, falling back to the right-hand value when the left side is falsy.
    const sort = p.sort || 'relevance'
    // Keep `value` as a choice between two values based on `sort === 'rating_desc'`.
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
    // Return `value || a.media_type.localeCompare(b.media_type)`, falling back to the right-hand value when the left side is falsy to the caller.
    return (
      value || a.media_type.localeCompare(b.media_type) || a.tmdb_id - b.tmdb_id
    )
  })
}
