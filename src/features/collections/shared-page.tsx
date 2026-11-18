/**
 * The public, read-only collection page opened by /shared/:token.
 * The route token identifies the share. The public API query supplies its name and title list.
 * Cards hide editing actions. Opening a trailer still uses the shared global trailer dialog.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useState } from 'react'
// Routing tools for links, page matching, navigation, and URL values.
import { Link, useParams } from 'react-router'
// SVG icon components used by the controls and headings below.
import { Copy, ArrowRight, Globe } from 'lucide-react'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/features/titles/movie-card`.
import { MovieGrid } from '@/features/titles/movie-card'
// Bring in the exported helpers/components from `@/components/feedback`.
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback'
// Bring in the exported helpers/components from `@/lib/config`.
import { config } from '@/lib/config'
/** Fetch the public collection identified by the token in the URL and render its read-only list. */
export function SharedPage() {
  // The opaque token comes from the React route and is sent to the public collection endpoint.
  // Keep `{ token = '' }` as the result returned by `useParams` with these arguments.
  // Keep `[paging, setPaging]` as React state initialized from `{ page: 1, }`; the first tuple value is current state and the second is its setter.
  const { token = '' } = useParams(),
    [paging, setPaging] = useState<{ page: number; snapshot?: string }>({
      // Set the `page` field to the number 1.
      page: 1,
    })
  // The shared endpoint omits credentials in services/api.ts and returns a public-safe response.
  // Keep `{ data, isLoading, error, refetch }` as the RTK Query subscription from `api.useSharedQuery`, including its cached data and loading/error state.
  const { data, isLoading, error, refetch } = api.useSharedQuery({
    // Use the existing `token` variable as the field with the same name.
    token,
    ...paging,
  })
  return (
    <div className="container shared-page">
      {/* Choose the rendered branch from `isLoading`; the ? branch is used when true and the : branch otherwise. */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState
          error={error}
          retry={() => {
            // Call `setPaging` with `{ page: 1 }` to update its state or routed value.
            setPaging({ page: 1 })
            // Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
            void refetch()
          }}
        />
      ) : (
        data && (
          <>
            {/* Present the public collection name and its share-link action. */}
            {/* Render the header element styled by `"shared-heading"`. */}
            <header className="shared-heading">
              {/* Render the p element styled by `"eyebrow"`. */}
              <p className="eyebrow">
                {/* Render the Globe component. */}
                <Globe size={15} />A SHARED COLLECTION
              </p>
              {/* Render the h1 element. */}
              <h1>{data.name}</h1>
              {/* Render the p element styled by `"muted"`. */}
              <p className="muted">
                A selection of stories worth discovering. {data.items.count}{' '}
                titles.
              </p>
              {/* Render an interactive button. */}
              {/* Clicks call `{() => void navigator.clipboard .writeText(window.location.href) .then(() => toast.success('Link copied')) ...`. */}
              <button
                className="button secondary"
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    void navigator.clipboard
                      .writeText(window.location.href)
                      .then(() => toast.success('Link copied'))
                      .catch(() =>
                        toast.error(
                          'Copy failed. Copy the URL from your address bar.',
                        ),
                      )
                }
              >
                {/* Render the Copy component. */}
                <Copy size={16} />
                Copy Share Link
              </button>
              {/* Render the right-hand content only when `config.mock` is truthy. */}
              {config.mock && (
                <p className="demo-note">
                  Demo preview. Shared demo data is available only in this
                  browser.
                </p>
              )}
            </header>
            {/* Choose the rendered branch from `data.items.results.length`; the ? branch is used when true and the : branch otherwise. */}
            {data.items.results.length ? (
              <MovieGrid
                titles={data.items.results.map((i) => i.title)}
                readOnly
              />
            ) : (
              <EmptyState title="This collection is empty" />
            )}
            {/* Render the right-hand content only when `data.items.next` is truthy. */}
            {data.items.next && (
              <button
                className="button secondary"
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () => {
                    // Keep `u` as a new URL instance initialized with these arguments.
                    const u = new URL(data.items.next!)
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
            {/* Offer a path from the shared collection into normal discovery. */}
            {/* Render the div element styled by `"shared-cta"`. */}
            <div className="shared-cta">
              {/* Render the h2 element. */}
              <h2>There’s always another great story.</h2>
              {/* Render the p element. */}
              <p>Find your next favorite with CineScope.</p>
              {/* Render a frontend link managed by React Router. */}
              {/* The destination is `"/discover"`. */}
              <Link className="button primary" to="/discover">
                Discover More Movies
                {/* Render the ArrowRight component. */}
                <ArrowRight size={16} />
              </Link>
            </div>
          </>
        )
      )}
    </div>
  )
}
