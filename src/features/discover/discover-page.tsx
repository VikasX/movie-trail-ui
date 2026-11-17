import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
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
import { api } from '@/services/api'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { openTrailer } from '@/store/ui-slice'
import { MovieGrid, MovieCard, Poster } from '@/features/titles/movie-card'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback'
import { Modal } from '@/components/ui/modal'
import { errorMessage } from '@/hooks/use-library'
import { toast } from 'sonner'
import type { Title, Schema } from '@/types/models'
import { titleKey } from '@/types/models'
import { parseFilters, recommendationFilters } from '@/lib/filters'

function Rail({
  feed,
  title,
}: {
  feed: 'trending' | 'new_releases'
  title: string
}) {
  const { data, isLoading, error, refetch } = api.useTitlesQuery({
    feed,
    page_size: 6,
  })
  return (
    <section className="section">
      <div className="section-heading">
        <h2>
          {feed === 'trending' ? <TrendingUp /> : <Sparkles />}
          {title}
        </h2>
      </div>
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : data?.results.length ? (
        <div className="movie-rail">
          {data.results.map((t) => (
            <MovieCard
              key={titleKey(t)}
              title={t}
              queue={data.results}
              next={data.next}
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
export function DiscoverPage() {
  const [params, setParams] = useSearchParams(),
    dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.ui.user),
    guest = useAppSelector((s) => s.guest)
  const { data: meta } = api.useMetadataQuery()
  const { data: recent } = api.useRecentQuery(undefined, { skip: !user })
  const [search, setSearch] = useState(params.get('q') || '')
  const [peopleMode, setPeopleMode] = useState(false)
  const [advanced, setAdvanced] = useState(false),
    [moodOpen, setMoodOpen] = useState(false)
  const [recommend, recommendState] = api.useRecommendMutation()
  const [suggestions, setSuggestions] = useState<Title[] | null>(null)
  const {
    data: people,
    error: peopleError,
    refetch: retryPeople,
  } = api.usePeopleQuery(search, {
    skip: !peopleMode || search.trim().length < 2,
  })
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    next.delete('snapshot')
    setSuggestions(null)
    setParams(next, { replace: true })
  }
  useEffect(() => {
    if (peopleMode) return
    const timer = setTimeout(() => {
      if (search !== (params.get('q') || '')) {
        const next = new URLSearchParams(params)
        next.delete('person_id')
        next.delete('person_role')
        if (search.trim()) next.set('q', search.trim())
        else next.delete('q')
        next.delete('page')
        next.delete('snapshot')
        setParams(next, { replace: true })
        setSuggestions(null)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [search, peopleMode, params, setParams])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('discovery-search')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const filters = parseFilters(params)
  const result = api.useTitlesQuery({ ...filters, page_size: 12 })
  const [loaded, setLoaded] = useState<{ key: string; titles: Title[] }>({
    key: '',
    titles: [],
  })
  const filterKey = new URLSearchParams(params)
  filterKey.delete('page')
  filterKey.delete('snapshot')
  const identity = filterKey.toString()
  useEffect(() => {
    if (result.currentData)
      // Retain earlier pages when the external API cache delivers a new page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded((old) => ({
        key: identity,
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
  const expired =
    result.error && 'status' in result.error && result.error.status === 410
  useEffect(() => {
    if (expired) {
      const next = new URLSearchParams(params)
      next.delete('page')
      next.delete('snapshot')
      setParams(next, { replace: true })
      toast.info('Your selection expired. Loading a fresh selection.')
    }
  }, [expired, params, setParams])
  const active = Boolean(identity),
    genres = (params.get('genres') || '').split(',').filter(Boolean)
  const visible =
    suggestions ||
    (loaded.key === identity
      ? loaded.titles
      : result.currentData?.results || [])
  const runRecommendation = async (mood?: Schema['Mood']['key']) => {
    try {
      const response = await recommend({
        mode: mood ? 'mood' : 'surprise',
        language: 'en-US',
        region: 'IN',
        mood,
        limit: mood ? 10 : 1,
        filters: recommendationFilters(filters),
        exclude: [],
      }).unwrap()
      setMoodOpen(false)
      setSuggestions(response.results)
      if (!mood && response.results.length)
        dispatch(openTrailer({ queue: response.results, index: 0 }))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const recentTitles =
    (user ? recent?.results : guest.recent)?.map((r) => r.title) || []
  const reset = () => {
    setSearch('')
    setParams({})
    setSuggestions(null)
  }
  return (
    <div className="container discover-page">
      <section className="discovery-intro">
        <p className="eyebrow">YOUR NEXT GREAT WATCH</p>
        <h1>What are we watching tonight?</h1>
        <p>Discover stories that stay with you. Find your next favorite.</p>
        <div className="search-box">
          <Search />
          <input
            id="discovery-search"
            aria-label="Search titles or people"
            placeholder="Search movies, TV series, actors, directors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              aria-label="Clear search"
              className="icon-button"
              onClick={() => setSearch('')}
            >
              <X size={18} />
            </button>
          )}
          <kbd>⌘ K</kbd>
        </div>
        <label className="search-people">
          <input
            type="checkbox"
            checked={peopleMode}
            onChange={(e) => setPeopleMode(e.target.checked)}
          />
          Search actors and directors
        </label>
        {peopleMode && search.length >= 2 && (
          <div className="person-results">
            {peopleError ? (
              <ErrorState error={peopleError} retry={retryPeople} />
            ) : people?.results.length ? (
              people.results.map((p) => (
                <div key={p.tmdb_id}>
                  <span>{p.name}</span>
                  <button
                    className="chip"
                    onClick={() => {
                      const next = new URLSearchParams(params)
                      next.delete('q')
                      next.delete('page')
                      next.delete('snapshot')
                      next.set('person_id', String(p.tmdb_id))
                      next.set(
                        'person_role',
                        p.known_for_department === 'Directing'
                          ? 'director'
                          : 'actor',
                      )
                      setParams(next)
                      setPeopleMode(false)
                      setSearch('')
                    }}
                  >
                    Select{' '}
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
      <section className="filter-panel">
        <div className="filter-top">
          <div className="segmented" aria-label="Media type">
            {[
              ['all', 'All'],
              ['movie', 'Movies'],
              ['tv', 'TV Series'],
            ].map(([key, label]) => (
              <button
                aria-pressed={(params.get('media_type') || 'all') === key}
                key={key}
                onClick={() => update('media_type', key === 'all' ? '' : key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="tool-actions">
            <button
              className="button secondary"
              disabled={recommendState.isLoading}
              onClick={() => void runRecommendation()}
            >
              <Shuffle size={16} />
              Surprise Me
            </button>
            <button
              className="button secondary"
              onClick={() => setMoodOpen(true)}
            >
              <Smile size={16} />
              Find by Mood
            </button>
          </div>
        </div>
        <div className="genre-row">
          <button
            className={'chip ' + (!genres.length ? 'selected' : '')}
            onClick={() => update('genres', '')}
          >
            All genres
          </button>
          {meta?.genres.slice(0, 12).map((g) => (
            <button
              key={g.key}
              className={'chip ' + (genres.includes(g.key) ? 'selected' : '')}
              aria-pressed={genres.includes(g.key)}
              onClick={() =>
                update(
                  'genres',
                  genres.includes(g.key)
                    ? genres.filter((x) => x !== g.key).join(',')
                    : [...genres, g.key].join(','),
                )
              }
            >
              {g.name}
            </button>
          ))}
        </div>
        <div className="filter-bottom">
          <button
            className="text-button"
            aria-expanded={advanced}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={16} />
            Advanced filters
          </button>
          <span className="muted">Selected genres match together</span>
          <button className="text-button" onClick={reset}>
            Reset filters
          </button>
        </div>
        {advanced && (
          <div className="advanced-grid">
            <label>
              From year
              <input
                type="number"
                min="1874"
                max="2100"
                value={params.get('year_from') || ''}
                onChange={(e) => update('year_from', e.target.value)}
              />
            </label>
            <label>
              To year
              <input
                type="number"
                min="1874"
                max="2100"
                value={params.get('year_to') || ''}
                onChange={(e) => update('year_to', e.target.value)}
              />
            </label>
            <label>
              Minimum rating
              <select
                value={params.get('min_rating') || ''}
                onChange={(e) => update('min_rating', e.target.value)}
              >
                <option value="">Any rating</option>
                {[5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>
                    {n}+ TMDB
                  </option>
                ))}
              </select>
            </label>
            <label>
              Language
              <select
                value={params.get('original_language') || ''}
                onChange={(e) => update('original_language', e.target.value)}
              >
                <option value="">Any language</option>
                {meta?.languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minimum runtime
              <input
                type="number"
                min="1"
                value={params.get('runtime_min') || ''}
                onChange={(e) => update('runtime_min', e.target.value)}
                placeholder="Minutes"
              />
            </label>
            <label>
              Maximum runtime
              <input
                type="number"
                min="1"
                value={params.get('runtime_max') || ''}
                onChange={(e) => update('runtime_max', e.target.value)}
                placeholder="Minutes"
              />
            </label>
            <label>
              More genres
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !genres.includes(e.target.value))
                    update('genres', [...genres, e.target.value].join(','))
                }}
              >
                <option value="">Add genre</option>
                {meta?.genres.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>
      {!active && !suggestions && (
        <>
          <section className="section">
            <div className="section-heading">
              <h2>
                <Clock />
                Recently Explored
              </h2>
            </div>
            {recentTitles.length ? (
              <div className="recent-strip">
                {recentTitles.slice(0, 6).map((t, i) => (
                  <button
                    key={titleKey(t)}
                    onClick={() =>
                      dispatch(openTrailer({ queue: recentTitles, index: i }))
                    }
                  >
                    <Poster title={t} />
                    <span>
                      {t.title}
                      <small>{t.year}</small>
                    </span>
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
          <Rail feed="trending" title="Trending Now" />
          <Rail feed="new_releases" title="New Releases" />
        </>
      )}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>
              {suggestions
                ? 'Picked for you'
                : active
                  ? 'Matching Movies & TV Series'
                  : 'Browse Movies & TV Series'}
            </h2>
            <p className="muted">
              {result.data?.count || 0} matches in this selection
            </p>
          </div>
          <label className="sort-label">
            Sort by
            <select
              aria-label="Sort results"
              value={params.get('sort') || 'relevance'}
              onChange={(e) => update('sort', e.target.value)}
            >
              {[
                ['relevance', 'Recommended'],
                ['popularity_desc', 'Popularity'],
                ['rating_desc', 'TMDB rating'],
                ['release_date_desc', 'Newest'],
                ['release_date_asc', 'Oldest'],
                ['title_asc', 'Title'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        {result.isLoading ? (
          <LoadingSkeleton />
        ) : result.error ? (
          <ErrorState
            error={result.error}
            retry={() => void result.refetch()}
          />
        ) : visible.length ? (
          <div aria-busy={result.isFetching}>
            <MovieGrid
              titles={visible}
              next={suggestions ? null : result.data?.next}
            />
          </div>
        ) : (
          <EmptyState
            title="No matching titles"
            description="Try another search, mood, or combination of filters."
          />
        )}
        {!suggestions && result.data?.next && (
          <div className="load-more">
            <button
              disabled={result.isFetching}
              className="button secondary"
              onClick={() => {
                const next = new URL(result.data!.next!)
                const p = new URLSearchParams(params)
                p.set('page', next.searchParams.get('page')!)
                p.set('snapshot', next.searchParams.get('snapshot')!)
                setParams(p, { replace: true })
              }}
            >
              {result.isFetching ? 'Loading…' : 'Load More Discoveries'}
            </button>
          </div>
        )}
      </section>
      <Modal
        open={moodOpen}
        title="What are you in the mood for?"
        onClose={() => setMoodOpen(false)}
      >
        <p className="muted">
          A little inspiration, matched to your current filters.
        </p>
        <div className="mood-grid">
          {meta?.moods.map((m) => (
            <button
              className="button secondary"
              disabled={recommendState.isLoading}
              key={m.key}
              onClick={() => void runRecommendation(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
function PlayIcon() {
  return <span className="recent-play">▶</span>
}
