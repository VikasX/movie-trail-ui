/**
 * The movie-details and YouTube trailer overlay.
 * The selected title and queue come from Redux. Details come from the details API query.
 * Changing the title remounts TrailerContent and replaces its iframe. Closing removes the dialog and player.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useEffect, useState } from 'react'
// SVG icon components used by the controls and headings below.
import {
  SkipBack,
  SkipForward,
  Bookmark,
  FolderPlus,
  Check,
} from 'lucide-react'
// Bring in the exported helpers/components from `@/components/ui/modal`.
import { Modal } from '@/components/ui/modal'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { useLibrary } from '@/hooks/use-library'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import { openTrailer, setSave } from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/types/models`.
import { titleKey, type Title } from '@/types/models'
// Bring in the exported helpers/components from `@/components/feedback`.
import { ErrorState } from '@/components/feedback'
// Bring in the exported helpers/components from `@/lib/filters`.
import { parseFilters } from '@/lib/filters'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { errorMessage } from '@/hooks/use-library'
// Bring in the exported helpers/components from `@/store`.
import { store } from '@/store'
// Routing tools for links, page matching, navigation, and URL values.
import { useLocation } from 'react-router'
/** Read the current Redux trailer selection and mount its content using the selected title as a key. */
export function TrailerModal() {
  // A null Redux selection means there is no active trailer overlay.
  // Keep `current` as the Redux value selected by `(s) => s.ui.trailer`; React subscribes to changes in that selected value.
  const current = useAppSelector((s) => s.ui.trailer)
  // Take this branch only when `!current` is truthy.
  if (!current) return null
  return (
    <TrailerContent
      key={
        /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ titleKey(
          current.queue[current.index],
        )
      }
      title={
        /* Pass the title record or heading expected by this component. */ current
          .queue[current.index]
      }
      queue={
        /* Pass the ordered title list used for Previous/Next trailer navigation. */ current.queue
      }
      index={current.index}
    />
  )
}
/** Load details, record exploration, render one player, and manage queue/video navigation. */
function TrailerContent(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    title,
    queue,
    index,
  }: {
    // The title record or display title used by this object. Its type is `Title`.
    title: Title
    // The `queue` field used by this data shape. Its type is `Title[]`.
    queue: Title[]
    // The `index` field used by this data shape. Its type is `number`.
    index: number
  },
) {
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `library` as the shared library adapter, exposing guest/account data and save/collection operations.
  const dispatch = useAppDispatch(),
    library = useLibrary()
  // Keep `next` as the Redux value selected by `(s) => s.ui.trailer?.next`; React subscribes to changes in that selected value.
  const next = useAppSelector((s) => s.ui.trailer?.next)
  // Public shared collections allow viewing details/trailers while hiding the personal editing buttons here.
  // Keep `readOnly` as the result returned by `useLocation().pathname.startsWith` with these arguments.
  const readOnly = useLocation().pathname.startsWith('/shared/')
  // Keep `{ data, isFetching, error, refetch }` as the RTK Query subscription from `api.useDetailsQuery`, including its cached data and loading/error state.
  const { data, isFetching, error, refetch } = api.useDetailsQuery(title)
  // Keep `[explore]` as the RTK Query mutation tuple from `api.useExploreMutation`; its trigger sends a request when explicitly called.
  const [explore] = api.useExploreMutation()
  // Keep `[video, setVideo]` as React state initialized from `0`; the first tuple value is current state and the second is its setter.
  // Keep `[skipping, setSkipping]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  const [video, setVideo] = useState(0),
    [skipping, setSkipping] = useState(false)
  // Record deliberate title exploration in the account API or guest history when the selected identity changes.
  // Run this effect after rendering and rerun it when a value in `[title.media_type, title.tmdb_id]` changes.
  useEffect(() => {
    // Take this branch only when `library.user` is truthy.
    if (library.user) {
      // Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
      void explore(title)
        .unwrap()
        .catch(() => {})
    } else
      // Call `library.update` with the arguments below to perform this step.
      library.update((d) => {
        // Update `d.recent` using the result returned by `[ { title, explored_at: new Date().toISOString() }, ...d.recent.filter((r) => titleKey(r.title) !== titleKe...` with these arguments.
        d.recent = [
          { title, explored_at: new Date().toISOString() },
          ...d.recent.filter((r) => titleKey(r.title) !== titleKey(title)),
        ].slice(0, 50)
      })
    // Composite identity defines one exploration, independently of library mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title.media_type, title.tmdb_id])
  // Avoid showing cached details for a different title while a new selection is loading.
  // Keep `detail` as a choice between two values based on `data && titleKey(data.title) === titleKey(title)`.
  const detail =
    data && titleKey(data.title) === titleKey(title) ? data : undefined
  // Only accepted YouTube keys are used to build the embed URL. An empty list produces the unavailable state.
  // Keep `trailers` as `detail?.trailers.filter( (v) => v.site === 'YouTube' && /^[A-Za-z0-9_-]{11}$/.test(v.youtube_key), )`, falling back to the right-hand value when the left side is falsy.
  const trailers =
    detail?.trailers.filter(
      (v) => v.site === 'YouTube' && /^[A-Za-z0-9_-]{11}$/.test(v.youtube_key),
    ) || []
  // video is the index of a video within this title. index is the separate position of this title in the queue.
  // Keep `selected` as the value read from `trailers[video]`.
  const selected = trailers[video]
  // Keep `saved` as the first array item matching the predicate, or undefined when nothing matches.
  const saved = library.saved.find((s) => titleKey(s.title) === titleKey(title))
  // Selecting a neighbouring title updates Redux, which gives TrailerContent a new React key.
  // Keep `change` as a callback that runs when it is called.
  const change = (n: number) => dispatch(openTrailer({ queue, index: n, next }))
  // Move within the loaded queue, or fetch its next discovery page when the user reaches the end.
  // Keep `advance` as a callback that runs when it is called and returns a promise.
  const advance = async () => {
    // Take this branch only when `index < queue.length - 1` is truthy.
    if (index < queue.length - 1) {
      // Call `change` with the arguments below to perform this step.
      change(index + 1)
      return
    }
    // Take this branch only when `!next` is truthy.
    if (!next) return
    // Call `setSkipping` with `true` to update its state or routed value.
    setSkipping(true)
    // Keep `request` as the result returned by `dispatch` with these arguments.
    const request = dispatch(
      api.endpoints.titles.initiate(parseFilters(new URL(next).searchParams)),
    )
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Keep `page` as the completed result of `request.unwrap()`; await pauses this async function until the promise settles.
      const page = await request.unwrap()
      // Take this branch only when `page.results.length && store.getState().ui.trailer?.queue[ store.getState().ui.trailer!.index ] === title` is truthy.
      if (
        page.results.length &&
        store.getState().ui.trailer?.queue[
          store.getState().ui.trailer!.index
        ] === title
      )
        // Send `openTrailer({ queue: [...queue, ...page.results], index: queue.length, next: page.next, })` to Redux so its matching reducer/middleware can process it.
        dispatch(
          openTrailer({
            // Set the `queue` field to an array containing these ordered values.
            queue: [...queue, ...page.results],
            // Set the `index` field to the value read from `queue.length`.
            index: queue.length,
            // The next page address, or null when this is the last page.
            next: page.next,
          }),
        )
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    } finally {
      // Release this manual query subscription when the lookup finishes. RTK Query still controls the normal cache lifetime.
      // Release this manual RTK Query subscription when it is no longer needed.
      request.unsubscribe()
      // Call `setSkipping` with `false` to update its state or routed value.
      setSkipping(false)
    }
  }
  // Walk later titles, requesting more queue pages when needed, until a details response contains a trailer.
  // Keep `nextAvailable` as a callback that runs when it is called and returns a promise.
  const nextAvailable = async () => {
    // Call `setSkipping` with `true` to update its state or routed value.
    setSkipping(true)
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Keep `candidates` as an array containing these ordered values.
      const candidates = [...queue]
      // Keep `nextPage` as the value read from `next`.
      let nextPage = next
      // Keep `i` as the expression `index + 1`.
      let i = index + 1
      // Repeat the following work while `i < candidates.length || nextPage` remains truthy.
      while (i < candidates.length || nextPage) {
        // Take this branch only when `!store.getState().ui.trailer` is truthy.
        if (!store.getState().ui.trailer) return
        // Take this branch only when `i >= candidates.length && nextPage` is truthy.
        if (i >= candidates.length && nextPage) {
          // Keep `request` as the result returned by `dispatch` with these arguments.
          const request = dispatch(
            api.endpoints.titles.initiate(
              parseFilters(new URL(nextPage).searchParams),
            ),
          )
          // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
          try {
            // Keep `page` as the completed result of `request.unwrap()`; await pauses this async function until the promise settles.
            const page = await request.unwrap()
            // Append these values to the end of `candidates`.
            candidates.push(...page.results)
            // Update `nextPage` using the value read from `page.next`.
            nextPage = page.next
          } finally {
            // Release this manual RTK Query subscription when it is no longer needed.
            request.unsubscribe()
          }
          // Take this branch only when `i >= candidates.length` is truthy.
          if (i >= candidates.length) break
        }
        // Keep `request` as the result returned by `dispatch` with these arguments.
        const request = dispatch(api.endpoints.details.initiate(candidates[i]))
        // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
        try {
          // Keep `d` as the completed result of `request.unwrap()`; await pauses this async function until the promise settles.
          const d = await request.unwrap()
          // Take this branch only when `d.trailers.length` is truthy.
          if (d.trailers.length) {
            // Take this branch only when `store.getState().ui.trailer` is truthy.
            if (store.getState().ui.trailer)
              // Send `openTrailer({ queue: candidates, index: i, next: nextPage })` to Redux so its matching reducer/middleware can process it.
              dispatch(
                openTrailer({ queue: candidates, index: i, next: nextPage }),
              )
            return
          }
        } finally {
          // Release this manual RTK Query subscription when it is no longer needed.
          request.unsubscribe()
        }
        // Evaluate `i++` as the next operation.
        i++
      }
      // Show the user this info toast message.
      toast.info('No more trailers are available in this selection.')
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    } finally {
      // Call `setSkipping` with `false` to update its state or routed value.
      setSkipping(false)
    }
  }
  return (
    <Modal
      open
      title={
        /* Pass the title record or heading expected by this component. */ title.title
      }
      wide
      onClose={() => dispatch(openTrailer(null))}
    >
      {/* Queue navigation changes the selected title, while the underlying page remains mounted. */}
      {/* Render the div element styled by `"trailer-toolbar"`. */}
      <div className="trailer-toolbar">
        {/* Render the span element. */}
        <span>
          Title {index + 1} of {queue.length}
        </span>
        {/* Render the div element styled by `"inline-actions"`. */}
        <div className="inline-actions">
          {/* Render an interactive button. */}
          {/* The control is disabled when `{index === 0}`. */}
          {/* Clicks call `{() => change(index - 1)}`. */}
          <button
            className="button secondary"
            disabled={
              /* A truthy value prevents interaction with this control, such as while its request is pending. */ index ===
              0
            }
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                change(index - 1)
            }
          >
            {/* Render the SkipBack component. */}
            <SkipBack size={16} />
            Previous Title
          </button>
          {/* Render an interactive button. */}
          {/* The control is disabled when `{skipping || (index === queue.length - 1 && !next)}`. */}
          {/* Clicks call `{() => void advance()}`. */}
          <button
            className="button secondary"
            disabled={
              /* A truthy value prevents interaction with this control, such as while its request is pending. */ skipping ||
              (index === queue.length - 1 && !next)
            }
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                void advance()
            }
          >
            Next Title
            {/* Render the SkipForward component. */}
            <SkipForward size={16} />
          </button>
          {/* Render an interactive button. */}
          {/* The control is disabled when `{skipping || (index === queue.length - 1 && !next)}`. */}
          {/* Clicks call `{() => void nextAvailable()}`. */}
          <button
            className="text-button"
            disabled={
              /* A truthy value prevents interaction with this control, such as while its request is pending. */ skipping ||
              (index === queue.length - 1 && !next)
            }
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                void nextAvailable()
            }
          >
            {/* Choose the rendered branch from `skipping`; the ? branch is used when true and the : branch otherwise. */}
            {skipping ? 'Finding…' : 'Next available trailer'}
          </button>
        </div>
      </div>
      {/* Choose the rendered branch from `error`; the ? branch is used when true and the : branch otherwise. */}
      {error ? (
        <ErrorState error={error} retry={refetch} />
      ) : isFetching ? (
        <div className="detail-loading" role="status">
          Loading movie details…
        </div>
      ) : (
        detail && (
          <div className="trailer-layout">
            {/* Render the div element. */}
            <div>
              {/* Render the div element styled by `"video-player"`. */}
              <div className="video-player">
                {/* Choose the rendered branch from `selected`; the ? branch is used when true and the : branch otherwise. */}
                {selected ? (
                  <iframe
                    key={
                      /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ titleKey(
                        title,
                      ) + selected.id
                    }
                    src={
                      /* Use this expression as the image/player resource URL. */
                      'https://www.youtube-nocookie.com/embed/' +
                      selected.youtube_key +
                      '?autoplay=1&rel=0'
                    }
                    title={
                      /* Pass the title record or heading expected by this component. */ title.title +
                      ' — ' +
                      selected.name
                    }
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  <div className="empty-state">
                    {/* Render the h3 element. */}
                    <h3>No trailer available</h3>
                    {/* Render the p element. */}
                    <p>Details are still available for this title.</p>
                  </div>
                )}
              </div>
              {/* Render the right-hand content only when `trailers.length > 1` is truthy. */}
              {trailers.length > 1 && (
                <div className="inline-actions video-choices">
                  {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                  {trailers.map((v, i) => (
                    <button
                      key={
                        /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ v.id
                      }
                      className={
                        /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ 'chip ' +
                        (i === video ? 'selected' : '')
                      }
                      onClick={
                        /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                          setVideo(i)
                      }
                    >
                      {/* Insert `v.name` into this part of the interface. */}
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Show only provider information supplied by the details response. */}
              {/* Render the div element styled by `"availability"`. */}
              <div className="availability">
                {/* Render the h3 element. */}
                <h3>Where to Watch</h3>
                {/* Render the p element styled by `"muted"`. */}
                <p className="muted">
                  {/* Choose the rendered branch from `detail.availability.status === 'available'`; the ? branch is used when true and the : branch otherwise. */}
                  {detail.availability.status === 'available'
                    ? 'Availability for ' + detail.availability.region
                    : detail.availability.status === 'not_available'
                      ? 'No providers are currently listed for this region.'
                      : 'Provider availability is temporarily unavailable.'}
                </p>
                {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                {(['flatrate', 'free', 'ads', 'rent', 'buy'] as const).map(
                  (k) => (
                    <div
                      key={
                        /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ k
                      }
                    >
                      {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                      {detail.availability[k].map((p) => (
                        <span
                          className="chip"
                          key={
                            /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ p.id
                          }
                        >
                          {/* Insert `p.name` into this part of the interface. */}
                          {p.name} · {k}
                        </span>
                      ))}
                    </div>
                  ),
                )}
                {/* Render the right-hand content only when `detail.availability.link` is truthy. */}
                {detail.availability.link && (
                  <a
                    className="text-button"
                    href={
                      /* Use this expression as the link destination. */ detail
                        .availability.link
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Availability on TMDB
                  </a>
                )}
                {/* Render the small element styled by `"muted"`. */}
                <small className="muted">
                  Watch provider data by JustWatch
                </small>
              </div>
            </div>
            {/* The details panel combines public metadata with personal saved/watched controls. */}
            {/* Render the div element styled by `"detail-info"`. */}
            <div className="detail-info">
              {/* Render the p element styled by `"eyebrow"`. */}
              <p className="eyebrow">
                {/* Choose the rendered branch from `title.media_type === 'tv'`; the ? branch is used when true and the : branch otherwise. */}
                {title.media_type === 'tv' ? 'TV SERIES' : 'MOVIE'}
              </p>
              {/* Render the h2 element. */}
              <h2>{title.title}</h2>
              {/* Render the p element styled by `"detail-meta"`. */}
              <p className="detail-meta">
                {/* Insert `title.year || 'Year unknown'` into this part of the interface. */}
                {title.year || 'Year unknown'} · TMDB{' '}
                {/* Insert `title.rating?.toFixed(1) || '—'` into this part of the interface. */}
                {title.rating?.toFixed(1) || '—'} ·{' '}
                {/* Choose the rendered branch from `title.runtime_minutes`; the ? branch is used when true and the : branch otherwise. */}
                {title.runtime_minutes
                  ? title.runtime_minutes +
                    ' min' +
                    (title.media_type === 'tv' ? ' / episode' : '')
                  : 'Runtime unavailable'}
              </p>
              {/* Render the div element styled by `"inline-actions"`. */}
              <div className="inline-actions">
                {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                {title.genres.map((g) => (
                  <span
                    className="chip"
                    key={
                      /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ g.key
                    }
                  >
                    {/* Insert `g.name` into this part of the interface. */}
                    {g.name}
                  </span>
                ))}
              </div>
              {/* Render the p element styled by `"synopsis"`. */}
              <p className="synopsis">
                {/* Insert `title.overview || 'Synopsis unavailable.'` into this part of the interface. */}
                {title.overview || 'Synopsis unavailable.'}
              </p>
              {/* Render the right-hand content only when `!readOnly` is truthy. */}
              {!readOnly && (
                <div className="detail-buttons">
                  {/* Render an interactive button. */}
                  {/* Clicks call `{() => void ( saved ? library.remove(title) : library.save(title) ).catch(() => {}) }`. */}
                  <button
                    className="button primary"
                    onClick={
                      /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                        void (
                          saved ? library.remove(title) : library.save(title)
                        ).catch(() => {})
                    }
                  >
                    {/* Render the Bookmark component. */}
                    <Bookmark size={17} />
                    {/* Choose the rendered branch from `saved`; the ? branch is used when true and the : branch otherwise. */}
                    {saved ? 'Remove from Watchlist' : 'Save to Watchlist'}
                  </button>
                  {/* Render an interactive button. */}
                  {/* Clicks call `{() => dispatch(setSave(title))}`. */}
                  <button
                    className="button secondary"
                    onClick={
                      /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                        dispatch(setSave(title))
                    }
                  >
                    {/* Render the FolderPlus component. */}
                    <FolderPlus size={17} />
                    Add to Collection
                  </button>
                  {/* Render an interactive button. */}
                  {/* Clicks call `{() => void library.save(title, !saved?.watched).catch(() => {}) }`. */}
                  <button
                    className="button secondary"
                    onClick={
                      /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                        void library
                          .save(title, !saved?.watched)
                          .catch(() => {})
                    }
                  >
                    {/* Render the Check component. */}
                    <Check size={17} />
                    {/* Choose the rendered branch from `saved?.watched`; the ? branch is used when true and the : branch otherwise. */}
                    {saved?.watched ? 'Watched · undo' : 'Mark as Watched'}
                  </button>
                </div>
              )}
              {/* Missing director/creator/cast data receives a readable fallback. */}
              {/* Render the div element styled by `"credit-block"`. */}
              <div className="credit-block">
                {/* Render the h3 element. */}
                <h3>{title.media_type === 'tv' ? 'Creators' : 'Director'}</h3>
                {/* Render the p element. */}
                <p>
                  {/* Insert `(title.media_type === 'tv' ? detail.creators : detail.directors ) .map((c) => c.person.name) .join(', ') ||...` into this part of the interface. */}
                  {(title.media_type === 'tv'
                    ? detail.creators
                    : detail.directors
                  )
                    .map((c) => c.person.name)
                    .join(', ') || 'Not available'}
                </p>
                {/* Render the h3 element. */}
                <h3>Main Cast</h3>
                {/* Render the p element. */}
                <p>
                  {/* Insert `detail.cast.map((c) => c.person.name).join(', ') || 'Cast information is unavailable.'` into this part of the interface. */}
                  {detail.cast.map((c) => c.person.name).join(', ') ||
                    'Cast information is unavailable.'}
                </p>
              </div>
              {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
              {detail.warnings.map((w) => (
                <p
                  key={
                    /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ w.code
                  }
                  className="muted small"
                >
                  {/* Insert `w.message` into this part of the interface. */}
                  {w.message}
                </p>
              ))}
            </div>
          </div>
        )
      )}
    </Modal>
  )
}
