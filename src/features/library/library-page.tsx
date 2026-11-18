/**
 * The personal library page, collection previews, and individual collection screen.
 * useLibrary chooses guest/account data. The tab query parameter chooses the current library view.
 * Automatic groups are calculated from guest saves or returned by Django for accounts.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useState } from 'react'
// Routing tools for links, page matching, navigation, and URL values.
import { Link, useParams, useSearchParams } from 'react-router'
// SVG icon components used by the controls and headings below.
import { Plus, Folder, Layers, ArrowLeft, Pencil, Share2 } from 'lucide-react'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { useLibrary, errorMessage } from '@/hooks/use-library'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import { setCollection, setShare } from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/features/titles/movie-card`.
import { MovieGrid, Poster } from '@/features/titles/movie-card'
// Bring in the exported helpers/components from `@/components/feedback`.
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in compile-time types from `@/types/models`.
import type { Collection, Title } from '@/types/models'
// Bring in the exported helpers/components from `@/types/models`.
import { titleKey } from '@/types/models'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'

/** Show a collection preview and its permitted edit/share actions. */
function CollectionCard(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    collection,
    previews,
  }: {
    // The `collection` field used by this data shape. Its type is `Collection`.
    collection: Collection
    // The `previews` field used by this data shape. Its type is `Title[]`.
    previews: Title[]
  },
) {
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  const dispatch = useAppDispatch()
  // Keep `user` as the value read from `useLibrary().user`.
  const user = useLibrary().user
  // An account collection preview gets its member titles from the API. Guest previews are passed in from local data.
  // Keep `result` as the RTK Query subscription from `api.useCollectionQuery`, including its cached data and loading/error state.
  const result = api.useCollectionQuery({ id: collection.id }, { skip: !user })
  // Keep `posters` as a choice between two values based on `user`.
  const posters = user
    ? result.data?.items.results.map((i) => i.title) || []
    : previews
  return (
    <article className="collection-card">
      {/* Render a frontend link managed by React Router. */}
      {/* The destination is `{'/library/collections/' + encodeURIComponent(collection.id)}`. */}
      <Link
        to={
          /* Use this expression as the frontend navigation destination. */ '/library/collections/' +
          encodeURIComponent(collection.id)
        }
      >
        {/* Build a visual collection preview from the first available member posters. */}
        {/* Render the div element styled by `"collage"`. */}
        <div className="collage">
          {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
          {posters.slice(0, 3).map((t) => (
            <div
              key={
                /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ titleKey(
                  t,
                )
              }
            >
              {/* Render the title poster with its missing-image fallback. */}
              {/* The title/heading input is `{t}`. */}
              <Poster
                title={
                  /* Pass the title record or heading expected by this component. */ t
                }
              />
            </div>
          ))}
          {/* Render the right-hand content only when `!posters.length` is truthy. */}
          {!posters.length && <Folder size={38} />}
        </div>
        {/* Render the h3 element. */}
        <h3>{collection.name}</h3>
        {/* Render the p element. */}
        <p>
          {/* Insert `collection.item_count` into this part of the interface. */}
          {collection.item_count} titles
          {/* Choose the rendered branch from `collection.kind === 'automatic'`; the ? branch is used when true and the : branch otherwise. */}
          {collection.kind === 'automatic' ? ' · Automatically organized' : ''}
        </p>
      </Link>
      {/* Render the right-hand content only when `collection.kind === 'custom'` is truthy. */}
      {collection.kind === 'custom' && (
        <div className="collection-actions">
          {/* Render an interactive button. */}
          {/* The accessible name is `{'Edit ' + collection.name}`. */}
          {/* Clicks call `{() => dispatch(setCollection(collection))}`. */}
          <button
            className="icon-button"
            aria-label={'Edit ' + collection.name}
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                dispatch(setCollection(collection))
            }
          >
            {/* Render the Pencil component. */}
            <Pencil size={16} />
          </button>
          {/* Render an interactive button. */}
          {/* The accessible name is `{'Share ' + collection.name}`. */}
          {/* Clicks call `{() => dispatch(setShare(collection))}`. */}
          <button
            className="icon-button"
            aria-label={'Share ' + collection.name}
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                dispatch(setShare(collection))
            }
          >
            {/* Render the Share2 component. */}
            <Share2 size={16} />
          </button>
        </div>
      )}
    </article>
  )
}
/** Choose saved-title or collection views from the library tab in the URL. */
export function LibraryPage() {
  // Keep `library` as the shared library adapter, exposing guest/account data and save/collection operations.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `[params, setParams]` as the current URL query parameters and the router function that updates them.
  const library = useLibrary(),
    dispatch = useAppDispatch(),
    [params, setParams] = useSearchParams()
  // The URL selects the library view, which can be restored by opening that URL again.
  // Keep `tab` as `params.get('tab')`, falling back to the right-hand value when the left side is falsy.
  const tab = params.get('tab') || 'all'
  // Keep `[query, setQuery]` as React state initialized from `''`; the first tuple value is current state and the second is its setter.
  const [query, setQuery] = useState('')
  // Keep `collectionView` as `tab === 'custom'`, falling back to the right-hand value when the left side is falsy.
  const collectionView = tab === 'custom' || tab === 'automatic'
  // Keep `groups` as an array containing only items that pass the predicate.
  const groups = library.groups.filter((c) => c.kind === tab)
  // Filter saved rows for the chosen tab, then apply the search typed inside the library.
  // Keep `titles` as an array containing only items that pass the predicate.
  const titles = library.saved
    .filter((s) =>
      tab === 'watched' ? s.watched : tab === 'watchlist' ? !s.watched : true,
    )
    .map((s) => s.title)
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="container library-page">
      {/* The current library or collection name and the actions available for it. */}
      {/* Render the div element styled by `"page-heading"`. */}
      <div className="page-heading">
        {/* Render the div element. */}
        <div>
          {/* Render the p element styled by `"eyebrow"`. */}
          <p className="eyebrow">YOUR PERSONAL CINEMA</p>
          {/* Render the h1 element. */}
          <h1>My Library</h1>
          {/* Render the p element styled by `"muted"`. */}
          <p className="muted">Every story you saved. All in one place.</p>
        </div>
        {/* Render an interactive button. */}
        {/* Clicks call `{() => dispatch(setCollection('new'))}`. */}
        <button
          className="button primary"
          onClick={
            /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
              dispatch(setCollection('new'))
          }
        >
          {/* Render the Plus component. */}
          <Plus size={17} />
          Create Collection
        </button>
      </div>
      {/* Render the right-hand content only when `!library.user` is truthy. */}
      {!library.user && (
        <div className="notice">
          Your guest library is saved on this browser. Sign in to sync it to
          your account.
        </div>
      )}
      {/* The tab value is stored in the URL so this view can be reopened. */}
      {/* Render the div element styled by `"library-tabs"`. */}
      {/* The accessible name is `"Library views"`. */}
      <div className="library-tabs" role="tablist" aria-label="Library views">
        {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
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
            key={
              /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ k
            }
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                setParams(k === 'all' ? {} : { tab: k })
            }
          >
            {/* Insert `l` into this part of the interface. */}
            {l}
          </button>
        ))}
      </div>
      {/* Choose the rendered branch from `library.isLoading`; the ? branch is used when true and the : branch otherwise. */}
      {library.isLoading ? (
        <LoadingSkeleton />
      ) : library.error ? (
        <ErrorState error={library.error} retry={library.retry} />
      ) : (
        <>
          {/* Render the right-hand content only when `(collectionView || tab === 'all')` is truthy. */}
          {(collectionView || tab === 'all') && (
            <section className="section">
              {/* Render the div element styled by `"section-heading"`. */}
              <div className="section-heading">
                {/* Render the h2 element. */}
                <h2>
                  {/* Choose the rendered branch from `tab === 'automatic'`; the ? branch is used when true and the : branch otherwise. */}
                  {tab === 'automatic' ? <Layers /> : <Folder />}
                  {/* Choose the rendered branch from `tab === 'automatic'`; the ? branch is used when true and the : branch otherwise. */}
                  {tab === 'automatic'
                    ? 'Automatic Collections'
                    : 'Your Collections'}
                </h2>
                {/* Render the right-hand content only when `tab === 'all'` is truthy. */}
                {tab === 'all' && (
                  <Link className="text-button" to="/library?tab=custom">
                    View all
                  </Link>
                )}
              </div>
              {/* Render the div element styled by `"collection-grid"`. */}
              <div className="collection-grid">
                {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
                {(collectionView
                  ? groups
                  : library.groups
                      .filter((c) => c.kind === 'custom')
                      .slice(0, 4)
                ).map((c) => (
                  <CollectionCard
                    key={
                      /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ c.id
                    }
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
              {/* Render the right-hand content only when `!( collectionView ? groups : library.groups.filter((c) => c.kind === 'custom') ).length` is truthy. */}
              {!(
                collectionView
                  ? groups
                  : library.groups.filter((c) => c.kind === 'custom')
              ).length && (
                <EmptyState
                  title={
                    /* Pass the title record or heading expected by this component. */
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
          {/* Render the right-hand content only when `!collectionView` is truthy. */}
          {!collectionView && (
            <section className="section">
              {/* Render the div element styled by `"section-heading"`. */}
              <div className="section-heading">
                {/* Render the h2 element. */}
                <h2>
                  {/* Choose the rendered branch from `tab === 'watched'`; the ? branch is used when true and the : branch otherwise. */}
                  {tab === 'watched'
                    ? 'Watched'
                    : tab === 'watchlist'
                      ? 'Watchlist'
                      : 'Saved Titles'}
                </h2>
                {/* Render an editable form field. */}
                {/* The accessible name is `"Search your library"`. */}
                {/* The displayed field value comes from `{query}`. */}
                {/* Field changes call `{(e) => setQuery(e.target.value)}`. */}
                <input
                  className="library-search"
                  aria-label="Search your library"
                  placeholder="Search your library…"
                  value={
                    /* This expression supplies the field’s current displayed value. */ query
                  }
                  onChange={
                    /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                      e,
                    ) => setQuery(e.target.value)
                  }
                />
              </div>
              {/* Choose the rendered branch from `titles.length`; the ? branch is used when true and the : branch otherwise. */}
              {titles.length ? (
                <MovieGrid titles={titles} />
              ) : (
                <EmptyState
                  title={
                    /* Pass the title record or heading expected by this component. */
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
/** Read the collection ID from the URL and show its guest or account title list. */
export function CollectionPage() {
  // Read the collection identifier supplied by the /library/collections/:id route.
  // Keep `{ id = '' }` as the result returned by `useParams` with these arguments.
  // Keep `library` as the shared library adapter, exposing guest/account data and save/collection operations.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  const { id = '' } = useParams(),
    library = useLibrary(),
    dispatch = useAppDispatch()
  // Keep `[paging, setPaging]` as React state initialized from `{ page: 1, }`; the first tuple value is current state and the second is its setter.
  const [paging, setPaging] = useState<{ page: number; snapshot?: string }>({
    // Set the `page` field to the number 1.
    page: 1,
  })
  // Keep `result` as the RTK Query subscription from `api.useCollectionQuery`, including its cached data and loading/error state.
  const result = api.useCollectionQuery(
    { id, ...paging },
    { skip: !library.user },
  )
  // Local lookup includes custom guest collections and computed automatic groups.
  // Keep `local` as the result returned by `library.localGroup` with these arguments.
  const local = library.localGroup(id)
  // The same screen can render a local collection or an API collection with the same core fields.
  // Keep `collection` as a choice between two values based on `library.user`.
  const collection = library.user ? result.data?.collection : local
  // Keep `titles` as a choice between two values based on `library.user`.
  const titles = library.user
    ? result.data?.items.results.map((i) => i.title) || []
    : (local?.items || []).flatMap((ref) =>
        library.saved
          .filter((s) => titleKey(s.title) === titleKey(ref))
          .map((s) => s.title),
      )
  // Take this branch only when `library.user && result.isLoading` is truthy.
  if (library.user && result.isLoading)
    return (
      <div className="container">
        {/* Show placeholder shapes while content is loading. */}
        <LoadingSkeleton />
      </div>
    )
  // Take this branch only when `result.error` is truthy.
  if (result.error)
    return (
      <div className="container">
        {/* Show a readable request failure and its retry control. */}
        <ErrorState
          error={result.error}
          retry={() => {
            // Call `setPaging` with `{ page: 1 }` to update its state or routed value.
            setPaging({ page: 1 })
            // Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
            void result.refetch()
          }}
        />
      </div>
    )
  // Take this branch only when `!collection` is truthy.
  if (!collection)
    return (
      <div className="container">
        {/* Show why this selection has no content. */}
        {/* The title/heading input is `"Collection not found"`. */}
        <EmptyState
          title="Collection not found"
          description="It may have been deleted."
        />
      </div>
    )
  // Removing membership keeps the title in the library and in any other collection.
  // Keep `remove` as a callback that runs when it is called and returns a promise.
  const remove = async (t: Title) => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Wait for `library.membership(collection, t, true)` before continuing this async operation.
      await library.membership(collection, t, true)
      // Show the user this success toast message.
      toast.success('Removed from collection')
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    }
  }
  return (
    <div className="container library-page">
      {/* Render a frontend link managed by React Router. */}
      {/* The destination is `"/library?tab=custom"`. */}
      <Link to="/library?tab=custom" className="text-button">
        {/* Render the ArrowLeft component. */}
        <ArrowLeft size={16} />
        Back to Library
      </Link>
      {/* The current library or collection name and the actions available for it. */}
      {/* Render the div element styled by `"page-heading"`. */}
      <div className="page-heading">
        {/* Render the div element. */}
        <div>
          {/* Render the p element styled by `"eyebrow"`. */}
          <p className="eyebrow">
            {/* Choose the rendered branch from `collection.kind === 'automatic'`; the ? branch is used when true and the : branch otherwise. */}
            {collection.kind === 'automatic'
              ? 'AUTOMATIC COLLECTION'
              : 'YOUR COLLECTION'}
          </p>
          {/* Render the h1 element. */}
          <h1>{collection.name}</h1>
          {/* Render the p element styled by `"muted"`. */}
          <p className="muted">
            {/* Insert `collection.item_count` into this part of the interface. */}
            {collection.item_count} titles
            {/* Choose the rendered branch from `local?.description`; the ? branch is used when true and the : branch otherwise. */}
            {local?.description ? ' · ' + local.description : ''}
          </p>
        </div>
        {/* Render the right-hand content only when `collection.kind === 'custom'` is truthy. */}
        {collection.kind === 'custom' && (
          <div className="inline-actions">
            {/* Render an interactive button. */}
            {/* Clicks call `{() => dispatch(setCollection(collection))}`. */}
            <button
              className="button secondary"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  dispatch(setCollection(collection))
              }
            >
              {/* Render the Pencil component. */}
              <Pencil size={16} />
              Edit
            </button>
            {/* Render an interactive button. */}
            {/* Clicks call `{() => dispatch(setShare(collection))}`. */}
            <button
              className="button primary"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  dispatch(setShare(collection))
              }
            >
              {/* Render the Share2 component. */}
              <Share2 size={16} />
              Share
            </button>
          </div>
        )}
      </div>
      {/* Render the right-hand content only when `collection.kind === 'automatic'` is truthy. */}
      {collection.kind === 'automatic' && (
        <div className="notice">
          This collection updates automatically as your library changes.
        </div>
      )}
      {/* Choose the rendered branch from `titles.length`; the ? branch is used when true and the : branch otherwise. */}
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
      {/* Render the right-hand content only when `result.data?.items.next` is truthy. */}
      {result.data?.items.next && (
        <button
          className="button secondary"
          onClick={
            /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () => {
              // Keep `u` as a new URL instance initialized with these arguments.
              const u = new URL(result.data!.items.next!)
              // Call `setPaging` with `{ page: Number(u.searchParams.get('page')), snapshot: u.searchParams.get('snapshot') || undefined, }` to update its state or routed value.
              setPaging({
                // Set the `page` field to the result returned by `Number` with these arguments.
                page: Number(u.searchParams.get('page')),
                // The server token retaining the same selection across pages.
                snapshot: u.searchParams.get('snapshot') || undefined,
              })
            }
          }
        >
          Next page
        </button>
      )}
    </div>
  )
}
