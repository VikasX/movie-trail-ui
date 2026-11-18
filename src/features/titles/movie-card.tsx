/**
 * Reusable poster, movie/TV card, and grid components used across the application.
 * A card receives title data through props, reads saved status through useLibrary, and dispatches dialog actions.
 * The queue prop tells the trailer overlay which neighbouring titles it can browse.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// SVG icon components used by the controls and headings below.
import { Bookmark, Check, FolderPlus, Play, Star, Film } from 'lucide-react'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { useLibrary } from '@/hooks/use-library'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import { openTrailer, setSave } from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/types/models`.
import { titleKey, type Title } from '@/types/models'
// React hooks and component/type helpers used to build this file’s interface.
import { useState } from 'react'
import { safeImageUrl } from '@/lib/security'
/** Render the supplied poster, falling back to a title illustration if it is missing or fails. */
export function Poster(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    title,
  }: { title: Title },
) {
  // Remember a failed image request for this poster component so the title fallback can be rendered.
  // Keep `[failed, setFailed]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  const [failed, setFailed] = useState(false)
  const poster = safeImageUrl(title.poster_url)
  return poster && !failed ? (
    <img
      src={/* Only allowlisted HTTPS image URLs reach the browser. */ poster}
      alt={title.title + ' poster'}
      loading="lazy"
      onError={
        /* React calls this callback if the resource fails to load. */ () => {
          // Call `setFailed` with `true` to update its state or routed value.
          setFailed(true)
        }
      }
    />
  ) : (
    <div className="poster-fallback">
      {/* Render the Film component. */}
      <Film />
      {/* Render the span element. */}
      <span>{title.title}</span>
    </div>
  )
}
/** Render a title and connect its trailer, save, collection, and watched buttons. */
export function MovieCard(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    title,
    queue,
    next,
    readOnly = false,
    onRemove,
  }: {
    // The title record or display title used by this object. Its type is `Title`.
    title: Title
    // The `queue` field used by this data shape. Its type is `Title[]`.
    queue: Title[]
    // The next page address, or null when this is the last page. The ? makes this field optional. Its type is `string | null`.
    next?: string | null
    // The `readOnly` field used by this data shape. The ? makes this field optional. Its type is `boolean`.
    readOnly?: boolean
    // The `onRemove` field used by this data shape. The ? makes this field optional. Its type is `() => void`.
    onRemove?: () => void
  },
) {
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `library` as the shared library adapter, exposing guest/account data and save/collection operations.
  const dispatch = useAppDispatch(),
    library = useLibrary()
  // Overlay personal saved/watched status onto the public catalogue title data.
  // Keep `saved` as the first array item matching the predicate, or undefined when nothing matches.
  const saved = library.saved.find((s) => titleKey(s.title) === titleKey(title))
  // Library operations already display error toasts. Catch their rejected promises at the click boundary.
  // Keep `ignore` as a callback that runs when it is called.
  const ignore = (promise: Promise<unknown>) => {
    // Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
    void promise.catch(() => {})
  }
  return (
    <article className="movie-card">
      {/* Render an interactive button. */}
      {/* The accessible name is `{'Watch trailer for ' + title.title}`. */}
      {/* Clicks call `{() => dispatch( openTrailer({ queue, next, index: queue.findIndex((t) => titleKey(t) === titleKey(title)),...`. */}
      <button
        className="poster"
        aria-label={'Watch trailer for ' + title.title}
        onClick={
          /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
            dispatch(
              openTrailer({
                // Use the existing `queue` variable as the field with the same name.
                queue,
                // Use the existing `next` variable as the field with the same name.
                next,
                // Set the `index` field to the result returned by `queue.findIndex` with these arguments.
                index: queue.findIndex((t) => titleKey(t) === titleKey(title)),
              }),
            )
        }
      >
        {/* Render the title poster with its missing-image fallback. */}
        {/* The title/heading input is `{title}`. */}
        <Poster
          title={
            /* Pass the title record or heading expected by this component. */ title
          }
        />
        {/* Render the span element styled by `"poster-play"`. */}
        <span className="poster-play">
          {/* Render the Play component. */}
          <Play fill="currentColor" />
        </span>
        {/* Render the span element styled by `"rating"`. */}
        <span className="rating">
          {/* Render the Star component. */}
          <Star size={12} fill="currentColor" />
          {/* Insert `title.rating?.toFixed(1) || '—'` into this part of the interface. */}
          {title.rating?.toFixed(1) || '—'}
          {/* Render the span element styled by `"sr-only"`. */}
          <span className="sr-only"> TMDB</span>
        </span>
        {/* Render the right-hand content only when `!readOnly && saved?.watched` is truthy. */}
        {!readOnly && saved?.watched && (
          <span className="watched-badge">
            {/* Render the Check component. */}
            <Check size={12} />
            Watched
          </span>
        )}
      </button>
      {/* Render the title metadata and controls beneath the poster. */}
      {/* Render the div element styled by `"card-content"`. */}
      <div className="card-content">
        {/* Render the div element styled by `"card-meta"`. */}
        <div className="card-meta">
          {/* Render the span element. */}
          <span>{title.year || 'Year unknown'}</span>
          {/* Render the span element. */}
          <span>{title.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
        </div>
        {/* Render the h3 element. */}
        <h3>{title.title}</h3>
        {/* Render the p element styled by `"card-genres"`. */}
        <p className="card-genres">
          {/* Insert `title.genres .slice(0, 2) .map((g) => g.name) .join(' · ') || 'Genre unavailable'` into this part of the interface. */}
          {title.genres
            .slice(0, 2)
            .map((g) => g.name)
            .join(' · ') || 'Genre unavailable'}
        </p>
        {/* Trailer is always available as a details entry point. Personal actions are hidden for read-only cards. */}
        {/* Render the div element styled by `"card-actions"`. */}
        <div className="card-actions">
          {/* Render an interactive button. */}
          {/* Clicks call `{() => dispatch( openTrailer({ queue, next, index: queue.findIndex( (t) => titleKey(t) === titleKey(title),...`. */}
          <button
            className="text-button"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                dispatch(
                  openTrailer({
                    // Use the existing `queue` variable as the field with the same name.
                    queue,
                    // Use the existing `next` variable as the field with the same name.
                    next,
                    // Set the `index` field to the result returned by `queue.findIndex` with these arguments.
                    index: queue.findIndex(
                      (t) => titleKey(t) === titleKey(title),
                    ),
                  }),
                )
            }
          >
            {/* Render the Play component. */}
            <Play size={15} />
            Trailer
          </button>
          {/* Render the right-hand content only when `!readOnly` is truthy. */}
          {!readOnly && (
            <div className="action-icons">
              {/* Render an interactive button. */}
              {/* The accessible name is `{ (saved ? 'Remove from' : 'Save to') + ' Watchlist: ' + title.title }`. */}
              {/* Clicks call `{() => ignore(saved ? library.remove(title) : library.save(title)) }`. */}
              <button
                className={
                  /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ 'icon-button ' +
                  (saved ? 'active' : '')
                }
                aria-label={
                  (saved ? 'Remove from' : 'Save to') +
                  ' Watchlist: ' +
                  title.title
                }
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    ignore(saved ? library.remove(title) : library.save(title))
                }
              >
                {/* Render the Bookmark component. */}
                <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
              </button>
              {/* Render an interactive button. */}
              {/* The accessible name is `{'Add to Collection: ' + title.title}`. */}
              {/* Clicks call `{() => dispatch(setSave(title))}`. */}
              <button
                className="icon-button"
                aria-label={'Add to Collection: ' + title.title}
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    dispatch(setSave(title))
                }
              >
                {/* Render the FolderPlus component. */}
                <FolderPlus size={17} />
              </button>
              {/* Render an interactive button. */}
              {/* The accessible name is `{ (saved?.watched ? 'Mark as Unwatched: ' : 'Mark as Watched: ') + title.title }`. */}
              {/* Clicks call `{() => ignore(library.save(title, !saved?.watched))}`. */}
              <button
                className={
                  /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ 'icon-button ' +
                  (saved?.watched ? 'active' : '')
                }
                aria-label={
                  (saved?.watched
                    ? 'Mark as Unwatched: '
                    : 'Mark as Watched: ') + title.title
                }
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    ignore(library.save(title, !saved?.watched))
                }
              >
                {/* Render the Check component. */}
                <Check size={17} />
              </button>
            </div>
          )}
        </div>
        {/* Render the right-hand content only when `onRemove` is truthy. */}
        {onRemove && (
          <button
            className="text-button muted"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ onRemove
            }
          >
            Remove from collection
          </button>
        )}
      </div>
    </article>
  )
}
/** Render the same card component for every title, sharing the list as the trailer queue. */
export function MovieGrid(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    titles,
    next,
    readOnly = false,
    onRemove,
  }: {
    // The `titles` field used by this data shape. Its type is `Title[]`.
    titles: Title[]
    // The next page address, or null when this is the last page. The ? makes this field optional. Its type is `string | null`.
    next?: string | null
    // The `readOnly` field used by this data shape. The ? makes this field optional. Its type is `boolean`.
    readOnly?: boolean
    // The `onRemove` field used by this data shape. The ? makes this field optional. Its type is `(t: Title) => void`.
    onRemove?: (t: Title) => void
  },
) {
  return (
    <div className="movie-grid">
      {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
      {titles.map((t) => (
        <MovieCard
          key={
            /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ titleKey(
              t,
            )
          }
          title={
            /* Pass the title record or heading expected by this component. */ t
          }
          queue={
            /* Pass the ordered title list used for Previous/Next trailer navigation. */ titles
          }
          next={
            /* Pass the next-page URL so the receiving component can continue this selection. */ next
          }
          readOnly={
            /* Hide personal editing actions when this value is truthy. */ readOnly
          }
          onRemove={onRemove ? () => onRemove(t) : undefined}
        />
      ))}
    </div>
  )
}
