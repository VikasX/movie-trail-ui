/**
 * The Discover screen coordinates search, filters, recommendations, recent activity, and title results.
 * URL search parameters hold shareable filters. Local React state holds typing and temporary display choices.
 * api hooks supply server data. MovieCard/MovieGrid render it. Redux opens the trailer dialog.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useEffect, useState } from 'react'
// Routing tools for links, page matching, navigation, and URL values.
import { useSearchParams } from 'react-router'
// SVG icon components used by the controls and headings below.
import {
  Search,
  X,
  SlidersHorizontal,
  Shuffle,
  Smile,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import { openTrailer } from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/features/titles/movie-card`.
import { MovieGrid, MovieCard, Poster } from '@/features/titles/movie-card'
// Bring in the exported helpers/components from `@/components/feedback`.
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback'
// Bring in the exported helpers/components from `@/components/ui/modal`.
import { Modal } from '@/components/ui/modal'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { errorMessage } from '@/hooks/use-library'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in compile-time types from `@/types/models`.
import type { Title, Schema } from '@/types/models'
// Bring in the exported helpers/components from `@/types/models`.
import { titleKey } from '@/types/models'
// Bring in the exported helpers/components from `@/lib/filters`.
import { parseFilters, recommendationFilters } from '@/lib/filters'

/** Fetch and render one horizontal feed, such as Trending Now or New Releases. */
function Rail(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    feed,
    title,
  }: {
    // The `feed` field used by this data shape. Its type is `'trending' | 'new_releases'`.
    feed: 'trending' | 'new_releases'
    // The title record or display title used by this object. Its type is `string`.
    title: string
  },
) {
  // A query result includes the data and the states needed for loading, empty, error, and retry UI.
  // Keep `{ data, isLoading, error, refetch }` as the RTK Query subscription from `api.useTitlesQuery`, including its cached data and loading/error state.
  const { data, isLoading, error, refetch } = api.useTitlesQuery({
    // Use the existing `feed` variable as the field with the same name.
    feed,
    // The maximum number of results requested per page.
    page_size: 6,
  })
  return (
    <section className="section">
      {/* Render the div element styled by `"section-heading"`. */}
      <div className="section-heading">
        {/* Render the h2 element. */}
        <h2>
          {/* Choose the rendered branch from `feed === 'trending'`; the ? branch is used when true and the : branch otherwise. */}
          {feed === 'trending' ? <TrendingUp /> : <Sparkles />}
          {/* Insert `title` into this part of the interface. */}
          {title}
        </h2>
      </div>
      {/* Choose the rendered branch from `isLoading`; the ? branch is used when true and the : branch otherwise. */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : data?.results.length ? (
        <div className="movie-rail">
          {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
          {data.results.map((t) => (
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
                /* Pass the ordered title list used for Previous/Next trailer navigation. */ data.results
              }
              next={
                /* Pass the next-page URL so the receiving component can continue this selection. */ data.next
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No titles in this selection"
          description="Check back for newly available titles."
        />
      )}
    </section>
  )
}
/** Coordinate the Discover controls, URL filters, data requests, and result sections. */
export function DiscoverPage() {
  // params reads the current query string. setParams changes it through React Router.
  // Keep `[params, setParams]` as the current URL query parameters and the router function that updates them.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  const [params, setParams] = useSearchParams(),
    dispatch = useAppDispatch()
  // Keep `user` as the Redux value selected by `(s) => s.ui.user`; React subscribes to changes in that selected value.
  // Keep `guest` as the Redux value selected by `(s) => s.guest`; React subscribes to changes in that selected value.
  const user = useAppSelector((s) => s.ui.user),
    guest = useAppSelector((s) => s.guest)
  // Keep `{ data: meta }` as the RTK Query subscription from `api.useMetadataQuery`, including its cached data and loading/error state.
  const { data: meta } = api.useMetadataQuery()
  // Guest recent history comes from the guest slice, so the private recent endpoint is skipped for guests.
  // Keep `{ data: recent }` as the RTK Query subscription from `api.useRecentQuery`, including its cached data and loading/error state.
  const { data: recent } = api.useRecentQuery(undefined, { skip: !user })
  // Keep typing responsive before updating the URL. The effect below waits 350 milliseconds before a title search.
  // Keep `[search, setSearch]` as React state initialized from `params.get('q') || ''`; the first tuple value is current state and the second is its setter.
  const [search, setSearch] = useState(params.get('q') || '')
  // Keep `[peopleMode, setPeopleMode]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  const [peopleMode, setPeopleMode] = useState(false)
  // Keep `[advanced, setAdvanced]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  // Keep `[moodOpen, setMoodOpen]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  const [advanced, setAdvanced] = useState(false),
    [moodOpen, setMoodOpen] = useState(false)
  // A mutation hook returns a trigger function and its request state. Recommendations use a deliberate POST.
  // Keep `[recommend, recommendState]` as the RTK Query mutation tuple from `api.useRecommendMutation`; its trigger sends a request when explicitly called.
  const [recommend, recommendState] = api.useRecommendMutation()
  // Keep `[suggestions, setSuggestions]` as React state initialized from `null`; the first tuple value is current state and the second is its setter.
  const [suggestions, setSuggestions] = useState<Title[] | null>(null)
  // Keep `{ data: people, error: peopleError, refetch: retryPeople, }` as the RTK Query subscription from `api.usePeopleQuery`, including its cached data and loading/error state.
  const {
    data: people,
    error: peopleError,
    refetch: retryPeople,
  } = api.usePeopleQuery(search, {
    // When true, do not start or subscribe to this query.
    skip: !peopleMode || search.trim().length < 2,
  })
  // Changing a filter resets page/snapshot so the next request starts a fresh selection.
  // Keep `update` as a callback that runs when it is called.
  const update = (key: string, value: string) => {
    // Keep `next` as an editable set of URL query parameters copied from the supplied input.
    const next = new URLSearchParams(params)
    // Take this branch only when `value` is truthy.
    if (value) next.set(key, value)
    else next.delete(key)
    // Remove `'page'` from `next`.
    next.delete('page')
    // Remove `'snapshot'` from `next`.
    next.delete('snapshot')
    // Call `setSuggestions` with `null` to update its state or routed value.
    setSuggestions(null)
    // Call `setParams` with `next` to update its state or routed value.
    setParams(next, { replace: true })
  }
  // Run this effect after rendering and rerun it when a value in `[search, peopleMode, params, setParams]` changes.
  useEffect(() => {
    // Take this branch only when `peopleMode` is truthy.
    if (peopleMode) return
    // Debounce title text. A new keystroke cleans up this timer and starts another one.
    // Keep `timer` as the result returned by `setTimeout` with these arguments.
    const timer = setTimeout(() => {
      // Take this branch only when `search !== (params.get('q') || '')` is truthy.
      if (search !== (params.get('q') || '')) {
        // Keep `next` as an editable set of URL query parameters copied from the supplied input.
        const next = new URLSearchParams(params)
        // Title-text search and a selected person are separate API modes, so a text query clears the person fields.
        // Remove `'person_id'` from `next`.
        next.delete('person_id')
        // Remove `'person_role'` from `next`.
        next.delete('person_role')
        // Take this branch only when `search.trim()` is truthy.
        if (search.trim()) next.set('q', search.trim())
        else next.delete('q')
        // Remove `'page'` from `next`.
        next.delete('page')
        // Remove `'snapshot'` from `next`.
        next.delete('snapshot')
        // Call `setParams` with `next` to update its state or routed value.
        setParams(next, { replace: true })
        // Call `setSuggestions` with `null` to update its state or routed value.
        setSuggestions(null)
      }
    }, 350)
    // Return a callback that runs when it is called to the caller.
    return () => clearTimeout(timer)
  }, [search, peopleMode, params, setParams])
  // Run this effect after rendering when the component mounts; a returned function handles cleanup.
  useEffect(() => {
    // Register Ctrl/Cmd+K to focus search. The effect cleanup removes the keyboard listener.
    // Keep `handler` as a callback that runs when it is called.
    const handler = (e: KeyboardEvent) => {
      // Take this branch only when `(e.ctrlKey || e.metaKey) && e.key === 'k'` is truthy.
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        // Stop the browser’s default action so this handler controls the interaction.
        e.preventDefault()
        // Call `document.getElementById('discovery-search')?.focus` with the arguments below to perform this step.
        document.getElementById('discovery-search')?.focus()
      }
    }
    // Call `window.addEventListener` with the arguments below to perform this step.
    window.addEventListener('keydown', handler)
    // Return a callback that runs when it is called to the caller.
    return () => window.removeEventListener('keydown', handler)
  }, [])
  // The URL is the source for shareable filters. Convert its text values before sending request data.
  // Keep `filters` as the result returned by `parseFilters` with these arguments.
  const filters = parseFilters(params)
  // Keep `result` as the RTK Query subscription from `api.useTitlesQuery`, including its cached data and loading/error state.
  const result = api.useTitlesQuery({ ...filters, page_size: 12 })
  // Retain earlier result pages for Load More while RTK Query stores each page response separately.
  // Keep `[loaded, setLoaded]` as React state initialized from `{ key: '', titles: [], }`; the first tuple value is current state and the second is its setter.
  const [loaded, setLoaded] = useState<{ key: string; titles: Title[] }>({
    // Set the `key` field to the text `''`.
    key: '',
    // Set the `titles` field to an empty array, ready to collect items.
    titles: [],
  })
  // Keep `filterKey` as an editable set of URL query parameters copied from the supplied input.
  const filterKey = new URLSearchParams(params)
  // Remove `'page'` from `filterKey`.
  filterKey.delete('page')
  // Remove `'snapshot'` from `filterKey`.
  filterKey.delete('snapshot')
  // Ignore page and snapshot when identifying a filter selection. They change while loading more of the same selection.
  // Keep `identity` as the result returned by `filterKey.toString` with these arguments.
  const identity = filterKey.toString()
  // Run this effect after rendering and rerun it when a value in `[result.currentData, identity, params]` changes.
  useEffect(() => {
    // Take this branch only when `result.currentData` is truthy.
    if (result.currentData)
      // Retain earlier pages when the external API cache delivers a new page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded((old) => ({
        // Set the `key` field to the value read from `identity`.
        key: identity,
        // Set the `titles` field to a choice between two values based on `Number(params.get('page') || 1) > 1 && old.key === identity`.
        titles:
          Number(params.get('page') || 1) > 1 && old.key === identity
            ? [
                ...old.titles,
                ...result.currentData!.results.filter(
                  (t) => !old.titles.some((o) => titleKey(o) === titleKey(t)),
                ),
              ]
            : result.currentData!.results,
      }))
  }, [result.currentData, identity, params])
  // HTTP 410 means the server snapshot expired. The following effect resets paging to page one.
  // Keep `expired` as the right-hand expression only when `result.error && 'status' in result.error` is truthy.
  const expired =
    result.error && 'status' in result.error && result.error.status === 410
  // Run this effect after rendering and rerun it when a value in `[expired, params, setParams]` changes.
  useEffect(() => {
    // Take this branch only when `expired` is truthy.
    if (expired) {
      // Keep `next` as an editable set of URL query parameters copied from the supplied input.
      const next = new URLSearchParams(params)
      // Remove `'page'` from `next`.
      next.delete('page')
      // Remove `'snapshot'` from `next`.
      next.delete('snapshot')
      // Call `setParams` with `next` to update its state or routed value.
      setParams(next, { replace: true })
      // Show the user this info toast message.
      toast.info('Your selection expired. Loading a fresh selection.')
    }
  }, [expired, params, setParams])
  // Keep `active` as the result returned by `Boolean` with these arguments.
  // Keep `genres` as an array containing only items that pass the predicate.
  const active = Boolean(identity),
    genres = (params.get('genres') || '').split(',').filter(Boolean)
  // Show recommendation results when available, otherwise show the accumulated matching catalogue pages.
  // Keep `visible` as `suggestions`, falling back to the right-hand value when the left side is falsy.
  const visible =
    suggestions ||
    (loaded.key === identity
      ? loaded.titles
      : result.currentData?.results || [])
  // The presence of a mood chooses mood mode. Otherwise request a single surprise title and open its trailer.
  // Keep `runRecommendation` as a callback that runs when it is called and returns a promise.
  const runRecommendation = async (mood?: Schema['Mood']['key']) => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Keep `response` as the completed result of `recommend({ mode: mood ? 'mood' : 'surprise', language: 'en-US', region: 'IN', mood, limit: mood ? 10 : 1, ...`; await pauses this async function until the promise settles.
      const response = await recommend({
        // Set the `mode` field to a choice between two values based on `mood`.
        mode: mood ? 'mood' : 'surprise',
        // Set the `language` field to the text `'en-US'`.
        language: 'en-US',
        // Set the `region` field to the text `'IN'`.
        region: 'IN',
        // Use the existing `mood` variable as the field with the same name.
        mood,
        // Set the `limit` field to a choice between two values based on `mood`.
        limit: mood ? 10 : 1,
        // Set the `filters` field to the result returned by `recommendationFilters` with these arguments.
        filters: recommendationFilters(filters),
        // Set the `exclude` field to an empty array, ready to collect items.
        exclude: [],
      }).unwrap()
      // Call `setMoodOpen` with `false` to update its state or routed value.
      setMoodOpen(false)
      // Call `setSuggestions` with `response.results` to update its state or routed value.
      setSuggestions(response.results)
      // Take this branch only when `!mood && response.results.length` is truthy.
      if (!mood && response.results.length)
        // Send `openTrailer({ queue: response.results, index: 0 })` to Redux so its matching reducer/middleware can process it.
        dispatch(openTrailer({ queue: response.results, index: 0 }))
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    }
  }
  // Keep `recentTitles` as `(user ? recent?.results : guest.recent)?.map((r) => r.title)`, falling back to the right-hand value when the left side is falsy.
  const recentTitles =
    (user ? recent?.results : guest.recent)?.map((r) => r.title) || []
  // Clear both the typed search and URL filters, returning to the default discovery view.
  // Keep `reset` as a callback that runs when it is called.
  const reset = () => {
    // Call `setSearch` with `''` to update its state or routed value.
    setSearch('')
    // Call `setParams` with `{}` to update its state or routed value.
    setParams({})
    // Call `setSuggestions` with `null` to update its state or routed value.
    setSuggestions(null)
  }
  return (
    <div className="container discover-page">
      {/* Search entry and the optional people picker. */}
      {/* Render the section element styled by `"discovery-intro"`. */}
      <section className="discovery-intro">
        {/* Render the p element styled by `"eyebrow"`. */}
        <p className="eyebrow">YOUR NEXT GREAT WATCH</p>
        {/* Render the h1 element. */}
        <h1>What are we watching tonight?</h1>
        {/* Render the p element. */}
        <p>Discover stories that stay with you. Find your next favorite.</p>
        {/* Typing updates local state immediately. The title-search effect updates the URL after its delay. */}
        {/* Render the div element styled by `"search-box"`. */}
        <div className="search-box">
          {/* Render the Search component. */}
          <Search />
          {/* Render an editable form field. */}
          {/* The accessible name is `"Search titles or people"`. */}
          {/* The displayed field value comes from `{search}`. */}
          {/* Field changes call `{(e) => setSearch(e.target.value)}`. */}
          <input
            id="discovery-search"
            aria-label="Search titles or people"
            placeholder="Search movies, TV series, actors, directors..."
            value={
              /* This expression supplies the field’s current displayed value. */ search
            }
            onChange={
              /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                e,
              ) => setSearch(e.target.value)
            }
          />
          {/* Render the right-hand content only when `search` is truthy. */}
          {search && (
            <button
              aria-label="Clear search"
              className="icon-button"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  setSearch('')
              }
            >
              {/* Render the X component. */}
              <X size={18} />
            </button>
          )}
          {/* Render the kbd element. */}
          <kbd>⌘ K</kbd>
        </div>
        {/* Render the field label. */}
        <label className="search-people">
          {/* Render an editable form field. */}
          {/* The control type is `"checkbox"`. */}
          {/* The checked state comes from `{peopleMode}`. */}
          {/* Field changes call `{(e) => setPeopleMode(e.target.checked)}`. */}
          <input
            type="checkbox"
            checked={
              /* This expression controls whether the checkbox is checked; its change handler updates the backing state. */ peopleMode
            }
            onChange={
              /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                e,
              ) => setPeopleMode(e.target.checked)
            }
          />
          Search actors and directors
        </label>
        {/* Render the right-hand content only when `peopleMode && search.length >= 2` is truthy. */}
        {peopleMode && search.length >= 2 && (
          <div className="person-results">
            {/* Choose the rendered branch from `peopleError`; the ? branch is used when true and the : branch otherwise. */}
            {peopleError ? (
              <ErrorState error={peopleError} retry={retryPeople} />
            ) : people?.results.length ? (
              people.results.map((p) => (
                <div
                  key={
                    /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ p.tmdb_id
                  }
                >
                  {/* Render the span element. */}
                  <span>{p.name}</span>
                  {/* Render an interactive button. */}
                  {/* Clicks call `{() => { const next = new URLSearchParams(params) next.delete('q') next.delete('page') next.delete('snapsho...`. */}
                  <button
                    className="chip"
                    onClick={
                      /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () => {
                        // Keep `next` as an editable set of URL query parameters copied from the supplied input.
                        const next = new URLSearchParams(params)
                        // Remove `'q'` from `next`.
                        next.delete('q')
                        // Remove `'page'` from `next`.
                        next.delete('page')
                        // Remove `'snapshot'` from `next`.
                        next.delete('snapshot')
                        // Assign the supplied value under key `'person_id'` in `next`.
                        next.set('person_id', String(p.tmdb_id))
                        // Assign the supplied value under key `'person_role'` in `next`.
                        next.set(
                          'person_role',
                          p.known_for_department === 'Directing'
                            ? 'director'
                            : 'actor',
                        )
                        // Call `setParams` with `next` to update its state or routed value.
                        setParams(next)
                        // Call `setPeopleMode` with `false` to update its state or routed value.
                        setPeopleMode(false)
                        // Call `setSearch` with `''` to update its state or routed value.
                        setSearch('')
                      }
                    }
                  >
                    Select{' '}
                    {/* Choose the rendered branch from `p.known_for_department === 'Directing'`; the ? branch is used when true and the : branch otherwise. */}
                    {p.known_for_department === 'Directing'
                      ? 'director'
                      : 'actor'}
                  </button>
                </div>
              ))
            ) : (
              <p>No matching people.</p>
            )}
          </div>
        )}
      </section>
      {/* Media type, genre choices, advanced filters, and recommendation controls. */}
      {/* Render the section element styled by `"filter-panel"`. */}
      <section className="filter-panel">
        {/* Media selection and deliberate Surprise/Mood requests. */}
        {/* Render the div element styled by `"filter-top"`. */}
        <div className="filter-top">
          {/* Render the div element styled by `"segmented"`. */}
          {/* The accessible name is `"Media type"`. */}
          <div className="segmented" aria-label="Media type">
            {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
            {[
              ['all', 'All'],
              ['movie', 'Movies'],
              ['tv', 'TV Series'],
            ].map(([key, label]) => (
              <button
                aria-pressed={(params.get('media_type') || 'all') === key}
                key={
                  /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ key
                }
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    update('media_type', key === 'all' ? '' : key)
                }
              >
                {/* Insert `label` into this part of the interface. */}
                {label}
              </button>
            ))}
          </div>
          {/* Render the div element styled by `"tool-actions"`. */}
          <div className="tool-actions">
            {/* Render an interactive button. */}
            {/* The control is disabled when `{recommendState.isLoading}`. */}
            {/* Clicks call `{() => void runRecommendation()}`. */}
            <button
              className="button secondary"
              disabled={
                /* A truthy value prevents interaction with this control, such as while its request is pending. */ recommendState.isLoading
              }
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  void runRecommendation()
              }
            >
              {/* Render the Shuffle component. */}
              <Shuffle size={16} />
              Surprise Me
            </button>
            {/* Render an interactive button. */}
            {/* Clicks call `{() => setMoodOpen(true)}`. */}
            <button
              className="button secondary"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  setMoodOpen(true)
              }
            >
              {/* Render the Smile component. */}
              <Smile size={16} />
              Find by Mood
            </button>
          </div>
        </div>
        {/* Each chip toggles one canonical genre while retaining the other selected genres. */}
        {/* Render the div element styled by `"genre-row"`. */}
        <div className="genre-row">
          {/* Render an interactive button. */}
          {/* Clicks call `{() => update('genres', '')}`. */}
          <button
            className={
              /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ 'chip ' +
              (!genres.length ? 'selected' : '')
            }
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                update('genres', '')
            }
          >
            All genres
          </button>
          {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
          {meta?.genres.slice(0, 12).map((g) => (
            <button
              key={
                /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ g.key
              }
              className={
                /* Choose the CSS classes from this expression; conditional parts reflect the current state. */ 'chip ' +
                (genres.includes(g.key) ? 'selected' : '')
              }
              aria-pressed={genres.includes(g.key)}
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  update(
                    'genres',
                    genres.includes(g.key)
                      ? genres.filter((x) => x !== g.key).join(',')
                      : [...genres, g.key].join(','),
                  )
              }
            >
              {/* Insert `g.name` into this part of the interface. */}
              {g.name}
            </button>
          ))}
        </div>
        {/* Show/hide the additional controls or reset the current selection. */}
        {/* Render the div element styled by `"filter-bottom"`. */}
        <div className="filter-bottom">
          {/* Render an interactive button. */}
          {/* Clicks call `{() => setAdvanced(!advanced)}`. */}
          <button
            className="text-button"
            aria-expanded={advanced}
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                setAdvanced(!advanced)
            }
          >
            {/* Render the SlidersHorizontal component. */}
            <SlidersHorizontal size={16} />
            Advanced filters
          </button>
          {/* Render the span element styled by `"muted"`. */}
          <span className="muted">Selected genres match together</span>
          {/* Render an interactive button. */}
          {/* Clicks call `{reset}`. */}
          <button
            className="text-button"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ reset
            }
          >
            Reset filters
          </button>
        </div>
        {/* Render the right-hand content only when `advanced` is truthy. */}
        {advanced && (
          <div className="advanced-grid">
            {/* Render the field label. */}
            <label>
              From year
              {/* Render an editable form field. */}
              {/* The control type is `"number"`. */}
              {/* The displayed field value comes from `{params.get('year_from') || ''}`. */}
              {/* Field changes call `{(e) => update('year_from', e.target.value)}`. */}
              <input
                type="number"
                min="1874"
                max="2100"
                value={
                  /* This expression supplies the field’s current displayed value. */ params.get(
                    'year_from',
                  ) || ''
                }
                onChange={
                  /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                    e,
                  ) => update('year_from', e.target.value)
                }
              />
            </label>
            {/* Render the field label. */}
            <label>
              To year
              {/* Render an editable form field. */}
              {/* The control type is `"number"`. */}
              {/* The displayed field value comes from `{params.get('year_to') || ''}`. */}
              {/* Field changes call `{(e) => update('year_to', e.target.value)}`. */}
              <input
                type="number"
                min="1874"
                max="2100"
                value={
                  /* This expression supplies the field’s current displayed value. */ params.get(
                    'year_to',
                  ) || ''
                }
                onChange={
                  /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                    e,
                  ) => update('year_to', e.target.value)
                }
              />
            </label>
            {/* Render the field label. */}
            <label>
              Minimum rating
              {/* Render a dropdown field. */}
              {/* The displayed field value comes from `{params.get('min_rating') || ''}`. */}
              {/* Field changes call `{(e) => update('min_rating', e.target.value)}`. */}
              <select
                value={
                  /* This expression supplies the field’s current displayed value. */ params.get(
                    'min_rating',
                  ) || ''
                }
                onChange={
                  /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                    e,
                  ) => update('min_rating', e.target.value)
                }
              >
                {/* Provide one selectable dropdown value. */}
                {/* The displayed field value comes from `""`. */}
                <option value="">Any rating</option>
                {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                {[5, 6, 7, 8, 9].map((n) => (
                  <option
                    key={
                      /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ n
                    }
                    value={
                      /* This expression supplies the field’s current displayed value. */ n
                    }
                  >
                    {/* Insert `n` into this part of the interface. */}
                    {n}+ TMDB
                  </option>
                ))}
              </select>
            </label>
            {/* Render the field label. */}
            <label>
              Language
              {/* Render a dropdown field. */}
              {/* The displayed field value comes from `{params.get('original_language') || ''}`. */}
              {/* Field changes call `{(e) => update('original_language', e.target.value)}`. */}
              <select
                value={
                  /* This expression supplies the field’s current displayed value. */ params.get(
                    'original_language',
                  ) || ''
                }
                onChange={
                  /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                    e,
                  ) => update('original_language', e.target.value)
                }
              >
                {/* Provide one selectable dropdown value. */}
                {/* The displayed field value comes from `""`. */}
                <option value="">Any language</option>
                {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                {meta?.languages.map((l) => (
                  <option
                    key={
                      /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ l.code
                    }
                    value={
                      /* This expression supplies the field’s current displayed value. */ l.code
                    }
                  >
                    {/* Insert `l.name` into this part of the interface. */}
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            {/* Render the field label. */}
            <label>
              Minimum runtime
              {/* Render an editable form field. */}
              {/* The control type is `"number"`. */}
              {/* The displayed field value comes from `{params.get('runtime_min') || ''}`. */}
              {/* Field changes call `{(e) => update('runtime_min', e.target.value)}`. */}
              <input
                type="number"
                min="1"
                value={
                  /* This expression supplies the field’s current displayed value. */ params.get(
                    'runtime_min',
                  ) || ''
                }
                onChange={
                  /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                    e,
                  ) => update('runtime_min', e.target.value)
                }
                placeholder="Minutes"
              />
            </label>
            {/* Render the field label. */}
            <label>
              Maximum runtime
              {/* Render an editable form field. */}
              {/* The control type is `"number"`. */}
              {/* The displayed field value comes from `{params.get('runtime_max') || ''}`. */}
              {/* Field changes call `{(e) => update('runtime_max', e.target.value)}`. */}
              <input
                type="number"
                min="1"
                value={
                  /* This expression supplies the field’s current displayed value. */ params.get(
                    'runtime_max',
                  ) || ''
                }
                onChange={
                  /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                    e,
                  ) => update('runtime_max', e.target.value)
                }
                placeholder="Minutes"
              />
            </label>
            {/* Render the field label. */}
            <label>
              More genres
              {/* Render a dropdown field. */}
              {/* The displayed field value comes from `""`. */}
              {/* Field changes call `{(e) => { if (e.target.value && !genres.includes(e.target.value)) update('genres', [...genres, e.target.val...`. */}
              <select
                value=""
                onChange={
                  /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                    e,
                  ) => {
                    // Take this branch only when `e.target.value && !genres.includes(e.target.value)` is truthy.
                    if (e.target.value && !genres.includes(e.target.value))
                      // Call `update` with the arguments below to perform this step.
                      update('genres', [...genres, e.target.value].join(','))
                  }
                }
              >
                {/* Provide one selectable dropdown value. */}
                {/* The displayed field value comes from `""`. */}
                <option value="">Add genre</option>
                {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                {meta?.genres.map((g) => (
                  <option
                    key={
                      /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ g.key
                    }
                    value={
                      /* This expression supplies the field’s current displayed value. */ g.key
                    }
                  >
                    {/* Insert `g.name` into this part of the interface. */}
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>
      {/* Render the right-hand content only when `!active && !suggestions` is truthy. */}
      {!active && !suggestions && (
        <>
          {/* Render the section element styled by `"section"`. */}
          <section className="section">
            {/* Render the div element styled by `"section-heading"`. */}
            <div className="section-heading">
              {/* Render the h2 element. */}
              <h2>
                {/* Render the Clock component. */}
                <Clock />
                Recently Explored
              </h2>
            </div>
            {/* Choose the rendered branch from `recentTitles.length`; the ? branch is used when true and the : branch otherwise. */}
            {recentTitles.length ? (
              <div className="recent-strip">
                {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                {recentTitles.slice(0, 6).map((t, i) => (
                  <button
                    key={
                      /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ titleKey(
                        t,
                      )
                    }
                    onClick={
                      /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                        dispatch(openTrailer({ queue: recentTitles, index: i }))
                    }
                  >
                    {/* Render the title poster with its missing-image fallback. */}
                    {/* The title/heading input is `{t}`. */}
                    <Poster
                      title={
                        /* Pass the title record or heading expected by this component. */ t
                      }
                    />
                    {/* Render the span element. */}
                    <span>
                      {/* Insert `t.title` into this part of the interface. */}
                      {t.title}
                      {/* Render the small element. */}
                      <small>{t.year}</small>
                    </span>
                    {/* Render the PlayIcon component. */}
                    <PlayIcon />
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                Open a trailer and your recent discoveries will appear here.
              </p>
            )}
          </section>
          {/* Render the Rail component. */}
          {/* The title/heading input is `"Trending Now"`. */}
          <Rail feed="trending" title="Trending Now" />
          {/* Render the Rail component. */}
          {/* The title/heading input is `"New Releases"`. */}
          <Rail feed="new_releases" title="New Releases" />
        </>
      )}
      {/* Render the section element styled by `"section"`. */}
      <section className="section">
        {/* Render the div element styled by `"section-heading"`. */}
        <div className="section-heading">
          {/* Render the div element. */}
          <div>
            {/* Render the h2 element. */}
            <h2>
              {/* Choose the rendered branch from `suggestions`; the ? branch is used when true and the : branch otherwise. */}
              {suggestions
                ? 'Picked for you'
                : active
                  ? 'Matching Movies & TV Series'
                  : 'Browse Movies & TV Series'}
            </h2>
            {/* Render the p element styled by `"muted"`. */}
            <p className="muted">
              {/* Insert `result.data?.count || 0` into this part of the interface. */}
              {result.data?.count || 0} matches in this selection
            </p>
          </div>
          {/* Render the field label. */}
          <label className="sort-label">
            Sort by
            {/* Render a dropdown field. */}
            {/* The accessible name is `"Sort results"`. */}
            {/* The displayed field value comes from `{params.get('sort') || 'relevance'}`. */}
            {/* Field changes call `{(e) => update('sort', e.target.value)}`. */}
            <select
              aria-label="Sort results"
              value={
                /* This expression supplies the field’s current displayed value. */ params.get(
                  'sort',
                ) || 'relevance'
              }
              onChange={
                /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                  e,
                ) => update('sort', e.target.value)
              }
            >
              {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
              {[
                ['relevance', 'Recommended'],
                ['popularity_desc', 'Popularity'],
                ['rating_desc', 'TMDB rating'],
                ['release_date_desc', 'Newest'],
                ['release_date_asc', 'Oldest'],
                ['title_asc', 'Title'],
              ].map(([v, l]) => (
                <option
                  key={
                    /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ v
                  }
                  value={
                    /* This expression supplies the field’s current displayed value. */ v
                  }
                >
                  {/* Insert `l` into this part of the interface. */}
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        {/* Choose the rendered branch from `result.isLoading`; the ? branch is used when true and the : branch otherwise. */}
        {result.isLoading ? (
          <LoadingSkeleton />
        ) : result.error ? (
          <ErrorState
            error={result.error}
            retry={() => void result.refetch()}
          />
        ) : visible.length ? (
          <div aria-busy={result.isFetching}>
            {/* Render the supplied titles as a reusable grid of cards. */}
            {/* Later-page navigation uses `{suggestions ? null : result.data?.next}`. */}
            <MovieGrid
              titles={visible}
              next={
                /* Pass the next-page URL so the receiving component can continue this selection. */ suggestions
                  ? null
                  : result.data?.next
              }
            />
          </div>
        ) : (
          <EmptyState
            title="No matching titles"
            description="Try another search, mood, or combination of filters."
          />
        )}
        {/* Render the right-hand content only when `!suggestions && result.data?.next` is truthy. */}
        {!suggestions && result.data?.next && (
          <div className="load-more">
            {/* Render an interactive button. */}
            {/* The control is disabled when `{result.isFetching}`. */}
            {/* Clicks call `{() => { const next = new URL(result.data!.next!) const p = new URLSearchParams(params) p.set('page', next....`. */}
            <button
              disabled={
                /* A truthy value prevents interaction with this control, such as while its request is pending. */ result.isFetching
              }
              className="button secondary"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () => {
                  // Keep `next` as a new URL instance initialized with these arguments.
                  const next = new URL(result.data!.next!)
                  // Keep `p` as an editable set of URL query parameters copied from the supplied input.
                  const p = new URLSearchParams(params)
                  // Assign the supplied value under key `'page'` in `p`.
                  p.set('page', next.searchParams.get('page')!)
                  // Assign the supplied value under key `'snapshot'` in `p`.
                  p.set('snapshot', next.searchParams.get('snapshot')!)
                  // Call `setParams` with `p` to update its state or routed value.
                  setParams(p, { replace: true })
                }
              }
            >
              {/* Choose the rendered branch from `result.isFetching`; the ? branch is used when true and the : branch otherwise. */}
              {result.isFetching ? 'Loading…' : 'Load More Discoveries'}
            </button>
          </div>
        )}
      </section>
      {/* Render the shared accessible dialog with the content below. */}
      {/* Visibility comes from `{moodOpen}`. */}
      {/* The title/heading input is `"What are you in the mood for?"`. */}
      <Modal
        open={moodOpen}
        title="What are you in the mood for?"
        onClose={() => setMoodOpen(false)}
      >
        {/* Render the p element styled by `"muted"`. */}
        <p className="muted">
          A little inspiration, matched to your current filters.
        </p>
        {/* Render the div element styled by `"mood-grid"`. */}
        <div className="mood-grid">
          {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
          {meta?.moods.map((m) => (
            <button
              className="button secondary"
              disabled={
                /* A truthy value prevents interaction with this control, such as while its request is pending. */ recommendState.isLoading
              }
              key={
                /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ m.key
              }
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  void runRecommendation(m.key)
              }
            >
              {/* Insert `m.label` into this part of the interface. */}
              {m.label}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
/** Render the small play marker used on the compact recent-activity strip. */
function PlayIcon() {
  return <span className="recent-play">▶</span>
}
