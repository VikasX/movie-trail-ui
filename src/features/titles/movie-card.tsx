import { Bookmark, Check, FolderPlus, Play, Star, Film } from 'lucide-react'
import { useAppDispatch } from '@/hooks/redux'
import { useLibrary } from '@/hooks/use-library'
import { openTrailer, setSave } from '@/store/ui-slice'
import { titleKey, type Title } from '@/types/models'
import { useState } from 'react'
export function Poster({ title }: { title: Title }) {
  const [failed, setFailed] = useState(false)
  return title.poster_url && !failed ? (
    <img
      src={title.poster_url}
      alt={title.title + ' poster'}
      loading="lazy"
      onError={() => {
        setFailed(true)
      }}
    />
  ) : (
    <div className="poster-fallback">
      <Film />
      <span>{title.title}</span>
    </div>
  )
}
export function MovieCard({
  title,
  queue,
  next,
  readOnly = false,
  onRemove,
}: {
  title: Title
  queue: Title[]
  next?: string | null
  readOnly?: boolean
  onRemove?: () => void
}) {
  const dispatch = useAppDispatch(),
    library = useLibrary()
  const saved = library.saved.find((s) => titleKey(s.title) === titleKey(title))
  const ignore = (promise: Promise<unknown>) => {
    void promise.catch(() => {})
  }
  return (
    <article className="movie-card">
      <button
        className="poster"
        aria-label={'Watch trailer for ' + title.title}
        onClick={() =>
          dispatch(
            openTrailer({
              queue,
              next,
              index: queue.findIndex((t) => titleKey(t) === titleKey(title)),
            }),
          )
        }
      >
        <Poster title={title} />
        <span className="poster-play">
          <Play fill="currentColor" />
        </span>
        <span className="rating">
          <Star size={12} fill="currentColor" />
          {title.rating?.toFixed(1) || '—'}
          <span className="sr-only"> TMDB</span>
        </span>
        {!readOnly && saved?.watched && (
          <span className="watched-badge">
            <Check size={12} />
            Watched
          </span>
        )}
      </button>
      <div className="card-content">
        <div className="card-meta">
          <span>{title.year || 'Year unknown'}</span>
          <span>{title.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
        </div>
        <h3>{title.title}</h3>
        <p className="card-genres">
          {title.genres
            .slice(0, 2)
            .map((g) => g.name)
            .join(' · ') || 'Genre unavailable'}
        </p>
        <div className="card-actions">
          <button
            className="text-button"
            onClick={() =>
              dispatch(
                openTrailer({
                  queue,
                  next,
                  index: queue.findIndex(
                    (t) => titleKey(t) === titleKey(title),
                  ),
                }),
              )
            }
          >
            <Play size={15} />
            Trailer
          </button>
          {!readOnly && (
            <div className="action-icons">
              <button
                className={'icon-button ' + (saved ? 'active' : '')}
                aria-label={
                  (saved ? 'Remove from' : 'Save to') +
                  ' Watchlist: ' +
                  title.title
                }
                onClick={() =>
                  ignore(saved ? library.remove(title) : library.save(title))
                }
              >
                <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
              </button>
              <button
                className="icon-button"
                aria-label={'Add to Collection: ' + title.title}
                onClick={() => dispatch(setSave(title))}
              >
                <FolderPlus size={17} />
              </button>
              <button
                className={'icon-button ' + (saved?.watched ? 'active' : '')}
                aria-label={
                  (saved?.watched
                    ? 'Mark as Unwatched: '
                    : 'Mark as Watched: ') + title.title
                }
                onClick={() => ignore(library.save(title, !saved?.watched))}
              >
                <Check size={17} />
              </button>
            </div>
          )}
        </div>
        {onRemove && (
          <button className="text-button muted" onClick={onRemove}>
            Remove from collection
          </button>
        )}
      </div>
    </article>
  )
}
export function MovieGrid({
  titles,
  next,
  readOnly = false,
  onRemove,
}: {
  titles: Title[]
  next?: string | null
  readOnly?: boolean
  onRemove?: (t: Title) => void
}) {
  return (
    <div className="movie-grid">
      {titles.map((t) => (
        <MovieCard
          key={titleKey(t)}
          title={t}
          queue={titles}
          next={next}
          readOnly={readOnly}
          onRemove={onRemove ? () => onRemove(t) : undefined}
        />
      ))}
    </div>
  )
}
