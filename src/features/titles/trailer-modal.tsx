import { useEffect, useState } from 'react'
import {
  SkipBack,
  SkipForward,
  Bookmark,
  FolderPlus,
  Check,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { api } from '@/services/api'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { useLibrary } from '@/hooks/use-library'
import { openTrailer, setSave } from '@/store/ui-slice'
import { titleKey, type Title } from '@/types/models'
import { ErrorState } from '@/components/feedback'
import { parseFilters } from '@/lib/filters'
import { toast } from 'sonner'
import { errorMessage } from '@/hooks/use-library'
import { store } from '@/store'
import { useLocation } from 'react-router'
export function TrailerModal() {
  const current = useAppSelector((s) => s.ui.trailer)
  if (!current) return null
  return (
    <TrailerContent
      key={titleKey(current.queue[current.index])}
      title={current.queue[current.index]}
      queue={current.queue}
      index={current.index}
    />
  )
}
function TrailerContent({
  title,
  queue,
  index,
}: {
  title: Title
  queue: Title[]
  index: number
}) {
  const dispatch = useAppDispatch(),
    library = useLibrary()
  const next = useAppSelector((s) => s.ui.trailer?.next)
  const readOnly = useLocation().pathname.startsWith('/shared/')
  const { data, isFetching, error, refetch } = api.useDetailsQuery(title)
  const [explore] = api.useExploreMutation()
  const [video, setVideo] = useState(0),
    [skipping, setSkipping] = useState(false)
  useEffect(() => {
    if (library.user) {
      void explore(title)
        .unwrap()
        .catch(() => {})
    } else
      library.update((d) => {
        d.recent = [
          { title, explored_at: new Date().toISOString() },
          ...d.recent.filter((r) => titleKey(r.title) !== titleKey(title)),
        ].slice(0, 50)
      })
    // Composite identity defines one exploration, independently of library mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title.media_type, title.tmdb_id])
  const detail =
    data && titleKey(data.title) === titleKey(title) ? data : undefined
  const trailers =
    detail?.trailers.filter(
      (v) => v.site === 'YouTube' && /^[A-Za-z0-9_-]{11}$/.test(v.youtube_key),
    ) || []
  const selected = trailers[video]
  const saved = library.saved.find((s) => titleKey(s.title) === titleKey(title))
  const change = (n: number) => dispatch(openTrailer({ queue, index: n, next }))
  const advance = async () => {
    if (index < queue.length - 1) {
      change(index + 1)
      return
    }
    if (!next) return
    setSkipping(true)
    const request = dispatch(
      api.endpoints.titles.initiate(parseFilters(new URL(next).searchParams)),
    )
    try {
      const page = await request.unwrap()
      if (
        page.results.length &&
        store.getState().ui.trailer?.queue[
          store.getState().ui.trailer!.index
        ] === title
      )
        dispatch(
          openTrailer({
            queue: [...queue, ...page.results],
            index: queue.length,
            next: page.next,
          }),
        )
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      request.unsubscribe()
      setSkipping(false)
    }
  }
  const nextAvailable = async () => {
    setSkipping(true)
    try {
      const candidates = [...queue]
      let nextPage = next
      let i = index + 1
      while (i < candidates.length || nextPage) {
        if (!store.getState().ui.trailer) return
        if (i >= candidates.length && nextPage) {
          const request = dispatch(
            api.endpoints.titles.initiate(
              parseFilters(new URL(nextPage).searchParams),
            ),
          )
          try {
            const page = await request.unwrap()
            candidates.push(...page.results)
            nextPage = page.next
          } finally {
            request.unsubscribe()
          }
          if (i >= candidates.length) break
        }
        const request = dispatch(api.endpoints.details.initiate(candidates[i]))
        try {
          const d = await request.unwrap()
          if (d.trailers.length) {
            if (store.getState().ui.trailer)
              dispatch(
                openTrailer({ queue: candidates, index: i, next: nextPage }),
              )
            return
          }
        } finally {
          request.unsubscribe()
        }
        i++
      }
      toast.info('No more trailers are available in this selection.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSkipping(false)
    }
  }
  return (
    <Modal
      open
      title={title.title}
      wide
      onClose={() => dispatch(openTrailer(null))}
    >
      <div className="trailer-toolbar">
        <span>
          Title {index + 1} of {queue.length}
        </span>
        <div className="inline-actions">
          <button
            className="button secondary"
            disabled={index === 0}
            onClick={() => change(index - 1)}
          >
            <SkipBack size={16} />
            Previous Title
          </button>
          <button
            className="button secondary"
            disabled={skipping || (index === queue.length - 1 && !next)}
            onClick={() => void advance()}
          >
            Next Title
            <SkipForward size={16} />
          </button>
          <button
            className="text-button"
            disabled={skipping || (index === queue.length - 1 && !next)}
            onClick={() => void nextAvailable()}
          >
            {skipping ? 'Finding…' : 'Next available trailer'}
          </button>
        </div>
      </div>
      {error ? (
        <ErrorState error={error} retry={refetch} />
      ) : isFetching ? (
        <div className="detail-loading" role="status">
          Loading movie details…
        </div>
      ) : (
        detail && (
          <div className="trailer-layout">
            <div>
              <div className="video-player">
                {selected ? (
                  <iframe
                    key={titleKey(title) + selected.id}
                    src={
                      'https://www.youtube-nocookie.com/embed/' +
                      selected.youtube_key +
                      '?autoplay=1&rel=0'
                    }
                    title={title.title + ' — ' + selected.name}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  <div className="empty-state">
                    <h3>No trailer available</h3>
                    <p>Details are still available for this title.</p>
                  </div>
                )}
              </div>
              {trailers.length > 1 && (
                <div className="inline-actions video-choices">
                  {trailers.map((v, i) => (
                    <button
                      key={v.id}
                      className={'chip ' + (i === video ? 'selected' : '')}
                      onClick={() => setVideo(i)}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="availability">
                <h3>Where to Watch</h3>
                <p className="muted">
                  {detail.availability.status === 'available'
                    ? 'Availability for ' + detail.availability.region
                    : detail.availability.status === 'not_available'
                      ? 'No providers are currently listed for this region.'
                      : 'Provider availability is temporarily unavailable.'}
                </p>
                {(['flatrate', 'free', 'ads', 'rent', 'buy'] as const).map(
                  (k) => (
                    <div key={k}>
                      {detail.availability[k].map((p) => (
                        <span className="chip" key={p.id}>
                          {p.name} · {k}
                        </span>
                      ))}
                    </div>
                  ),
                )}
                {detail.availability.link && (
                  <a
                    className="text-button"
                    href={detail.availability.link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Availability on TMDB
                  </a>
                )}
                <small className="muted">
                  Watch provider data by JustWatch
                </small>
              </div>
            </div>
            <div className="detail-info">
              <p className="eyebrow">
                {title.media_type === 'tv' ? 'TV SERIES' : 'MOVIE'}
              </p>
              <h2>{title.title}</h2>
              <p className="detail-meta">
                {title.year || 'Year unknown'} · TMDB{' '}
                {title.rating?.toFixed(1) || '—'} ·{' '}
                {title.runtime_minutes
                  ? title.runtime_minutes +
                    ' min' +
                    (title.media_type === 'tv' ? ' / episode' : '')
                  : 'Runtime unavailable'}
              </p>
              <div className="inline-actions">
                {title.genres.map((g) => (
                  <span className="chip" key={g.key}>
                    {g.name}
                  </span>
                ))}
              </div>
              <p className="synopsis">
                {title.overview || 'Synopsis unavailable.'}
              </p>
              {!readOnly && (
                <div className="detail-buttons">
                  <button
                    className="button primary"
                    onClick={() =>
                      void (
                        saved ? library.remove(title) : library.save(title)
                      ).catch(() => {})
                    }
                  >
                    <Bookmark size={17} />
                    {saved ? 'Remove from Watchlist' : 'Save to Watchlist'}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => dispatch(setSave(title))}
                  >
                    <FolderPlus size={17} />
                    Add to Collection
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      void library.save(title, !saved?.watched).catch(() => {})
                    }
                  >
                    <Check size={17} />
                    {saved?.watched ? 'Watched · undo' : 'Mark as Watched'}
                  </button>
                </div>
              )}
              <div className="credit-block">
                <h3>{title.media_type === 'tv' ? 'Creators' : 'Director'}</h3>
                <p>
                  {(title.media_type === 'tv'
                    ? detail.creators
                    : detail.directors
                  )
                    .map((c) => c.person.name)
                    .join(', ') || 'Not available'}
                </p>
                <h3>Main Cast</h3>
                <p>
                  {detail.cast.map((c) => c.person.name).join(', ') ||
                    'Cast information is unavailable.'}
                </p>
              </div>
              {detail.warnings.map((w) => (
                <p key={w.code} className="muted small">
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
