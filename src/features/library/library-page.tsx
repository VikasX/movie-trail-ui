import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Plus, Folder, Layers, ArrowLeft, Pencil, Share2 } from 'lucide-react'
import { useLibrary, errorMessage } from '@/hooks/use-library'
import { useAppDispatch } from '@/hooks/redux'
import { setCollection, setShare } from '@/store/ui-slice'
import { MovieGrid, Poster } from '@/features/titles/movie-card'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback'
import { api } from '@/services/api'
import type { Collection, Title } from '@/types/models'
import { titleKey } from '@/types/models'
import { toast } from 'sonner'

function CollectionCard({
  collection,
  previews,
}: {
  collection: Collection
  previews: Title[]
}) {
  const dispatch = useAppDispatch()
  const user = useLibrary().user
  const result = api.useCollectionQuery({ id: collection.id }, { skip: !user })
  const posters = user
    ? result.data?.items.results.map((i) => i.title) || []
    : previews
  return (
    <article className="collection-card">
      <Link to={'/library/collections/' + encodeURIComponent(collection.id)}>
        <div className="collage">
          {posters.slice(0, 3).map((t) => (
            <div key={titleKey(t)}>
              <Poster title={t} />
            </div>
          ))}
          {!posters.length && <Folder size={38} />}
        </div>
        <h3>{collection.name}</h3>
        <p>
          {collection.item_count} titles
          {collection.kind === 'automatic' ? ' · Automatically organized' : ''}
        </p>
      </Link>
      {collection.kind === 'custom' && (
        <div className="collection-actions">
          <button
            className="icon-button"
            aria-label={'Edit ' + collection.name}
            onClick={() => dispatch(setCollection(collection))}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            aria-label={'Share ' + collection.name}
            onClick={() => dispatch(setShare(collection))}
          >
            <Share2 size={16} />
          </button>
        </div>
      )}
    </article>
  )
}
export function LibraryPage() {
  const library = useLibrary(),
    dispatch = useAppDispatch(),
    [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'all'
  const [query, setQuery] = useState('')
  const collectionView = tab === 'custom' || tab === 'automatic'
  const groups = library.groups.filter((c) => c.kind === tab)
  const titles = library.saved
    .filter((s) =>
      tab === 'watched' ? s.watched : tab === 'watchlist' ? !s.watched : true,
    )
    .map((s) => s.title)
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="container library-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PERSONAL CINEMA</p>
          <h1>My Library</h1>
          <p className="muted">Every story you saved. All in one place.</p>
        </div>
        <button
          className="button primary"
          onClick={() => dispatch(setCollection('new'))}
        >
          <Plus size={17} />
          Create Collection
        </button>
      </div>
      {!library.user && (
        <div className="notice">
          Your guest library is saved on this browser. Sign in to sync it to
          your account.
        </div>
      )}
      <div className="library-tabs" role="tablist" aria-label="Library views">
        {[
          ['all', 'All Saved Titles'],
          ['watchlist', 'Watchlist'],
          ['watched', 'Watched'],
          ['custom', 'Custom Collections'],
          ['automatic', 'Automatic Collections'],
        ].map(([k, l]) => (
          <button
            role="tab"
            aria-selected={tab === k}
            key={k}
            onClick={() => setParams(k === 'all' ? {} : { tab: k })}
          >
            {l}
          </button>
        ))}
      </div>
      {library.isLoading ? (
        <LoadingSkeleton />
      ) : library.error ? (
        <ErrorState error={library.error} retry={library.retry} />
      ) : (
        <>
          {(collectionView || tab === 'all') && (
            <section className="section">
              <div className="section-heading">
                <h2>
                  {tab === 'automatic' ? <Layers /> : <Folder />}
                  {tab === 'automatic'
                    ? 'Automatic Collections'
                    : 'Your Collections'}
                </h2>
                {tab === 'all' && (
                  <Link className="text-button" to="/library?tab=custom">
                    View all
                  </Link>
                )}
              </div>
              <div className="collection-grid">
                {(collectionView
                  ? groups
                  : library.groups
                      .filter((c) => c.kind === 'custom')
                      .slice(0, 4)
                ).map((c) => (
                  <CollectionCard
                    key={c.id}
                    collection={c}
                    previews={
                      library.user
                        ? []
                        : (library.localGroup(c.id)?.items || []).flatMap((i) =>
                            library.saved
                              .filter((s) => titleKey(s.title) === titleKey(i))
                              .map((s) => s.title),
                          )
                    }
                  />
                ))}
              </div>
              {!(
                collectionView
                  ? groups
                  : library.groups.filter((c) => c.kind === 'custom')
              ).length && (
                <EmptyState
                  title={
                    tab === 'automatic'
                      ? 'Your library will organize itself'
                      : 'Your collections start here'
                  }
                  description={
                    tab === 'automatic'
                      ? 'Save titles to discover groups by genre, decade, rating, media type, and watched status.'
                      : 'Create a collection for your next movie night.'
                  }
                />
              )}
            </section>
          )}
          {!collectionView && (
            <section className="section">
              <div className="section-heading">
                <h2>
                  {tab === 'watched'
                    ? 'Watched'
                    : tab === 'watchlist'
                      ? 'Watchlist'
                      : 'Saved Titles'}
                </h2>
                <input
                  className="library-search"
                  aria-label="Search your library"
                  placeholder="Search your library…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {titles.length ? (
                <MovieGrid titles={titles} />
              ) : (
                <EmptyState
                  title={
                    tab === 'watched'
                      ? 'No watched titles yet'
                      : 'No saved titles yet'
                  }
                  description="Explore something new and add it to your library."
                />
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
export function CollectionPage() {
  const { id = '' } = useParams(),
    library = useLibrary(),
    dispatch = useAppDispatch()
  const [paging, setPaging] = useState<{ page: number; snapshot?: string }>({
    page: 1,
  })
  const result = api.useCollectionQuery(
    { id, ...paging },
    { skip: !library.user },
  )
  const local = library.localGroup(id)
  const collection = library.user ? result.data?.collection : local
  const titles = library.user
    ? result.data?.items.results.map((i) => i.title) || []
    : (local?.items || []).flatMap((ref) =>
        library.saved
          .filter((s) => titleKey(s.title) === titleKey(ref))
          .map((s) => s.title),
      )
  if (library.user && result.isLoading)
    return (
      <div className="container">
        <LoadingSkeleton />
      </div>
    )
  if (result.error)
    return (
      <div className="container">
        <ErrorState
          error={result.error}
          retry={() => {
            setPaging({ page: 1 })
            void result.refetch()
          }}
        />
      </div>
    )
  if (!collection)
    return (
      <div className="container">
        <EmptyState
          title="Collection not found"
          description="It may have been deleted."
        />
      </div>
    )
  const remove = async (t: Title) => {
    try {
      await library.membership(collection, t, true)
      toast.success('Removed from collection')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <div className="container library-page">
      <Link to="/library?tab=custom" className="text-button">
        <ArrowLeft size={16} />
        Back to Library
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {collection.kind === 'automatic'
              ? 'AUTOMATIC COLLECTION'
              : 'YOUR COLLECTION'}
          </p>
          <h1>{collection.name}</h1>
          <p className="muted">
            {collection.item_count} titles
            {local?.description ? ' · ' + local.description : ''}
          </p>
        </div>
        {collection.kind === 'custom' && (
          <div className="inline-actions">
            <button
              className="button secondary"
              onClick={() => dispatch(setCollection(collection))}
            >
              <Pencil size={16} />
              Edit
            </button>
            <button
              className="button primary"
              onClick={() => dispatch(setShare(collection))}
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        )}
      </div>
      {collection.kind === 'automatic' && (
        <div className="notice">
          This collection updates automatically as your library changes.
        </div>
      )}
      {titles.length ? (
        <MovieGrid
          titles={titles}
          onRemove={
            collection.kind === 'custom' ? (t) => void remove(t) : undefined
          }
        />
      ) : (
        <EmptyState
          title="Make this collection yours"
          description="Add titles from Discover using Add to Collection."
        />
      )}
      {result.data?.items.next && (
        <button
          className="button secondary"
          onClick={() => {
            const u = new URL(result.data!.items.next!)
            setPaging({
              page: Number(u.searchParams.get('page')),
              snapshot: u.searchParams.get('snapshot') || undefined,
            })
          }}
        >
          Next page
        </button>
      )}
    </div>
  )
}
