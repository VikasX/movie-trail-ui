import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Copy, ArrowRight, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { MovieGrid } from '@/features/titles/movie-card'
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/feedback'
import { config } from '@/lib/config'
export function SharedPage() {
  const { token = '' } = useParams(),
    [paging, setPaging] = useState<{ page: number; snapshot?: string }>({
      page: 1,
    })
  const { data, isLoading, error, refetch } = api.useSharedQuery({
    token,
    ...paging,
  })
  return (
    <div className="container shared-page">
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState
          error={error}
          retry={() => {
            setPaging({ page: 1 })
            void refetch()
          }}
        />
      ) : (
        data && (
          <>
            <header className="shared-heading">
              <p className="eyebrow">
                <Globe size={15} />A SHARED COLLECTION
              </p>
              <h1>{data.name}</h1>
              <p className="muted">
                A selection of stories worth discovering. {data.items.count}{' '}
                titles.
              </p>
              <button
                className="button secondary"
                onClick={() =>
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
                <Copy size={16} />
                Copy Share Link
              </button>
              {config.mock && (
                <p className="demo-note">
                  Demo preview. Shared demo data is available only in this
                  browser.
                </p>
              )}
            </header>
            {data.items.results.length ? (
              <MovieGrid
                titles={data.items.results.map((i) => i.title)}
                readOnly
              />
            ) : (
              <EmptyState title="This collection is empty" />
            )}
            {data.items.next && (
              <button
                className="button secondary"
                onClick={() => {
                  const u = new URL(data.items.next!)
                  setPaging({
                    page: Number(u.searchParams.get('page')),
                    snapshot: u.searchParams.get('snapshot') || undefined,
                  })
                }}
              >
                Next page
              </button>
            )}
            <div className="shared-cta">
              <h2>There’s always another great story.</h2>
              <p>Find your next favorite with CineScope.</p>
              <Link className="button primary" to="/discover">
                Discover More Movies
                <ArrowRight size={16} />
              </Link>
            </div>
          </>
        )
      )}
    </div>
  )
}
