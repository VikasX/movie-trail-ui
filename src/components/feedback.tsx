import { Film, AlertCircle } from 'lucide-react'
import { errorMessage } from '@/hooks/use-library'
export function EmptyState({
  title = 'Nothing here yet',
  description = 'Find something you love and save it for later.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="empty-state">
      <Film size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown
  retry?: () => void
}) {
  return (
    <div className="empty-state" role="alert">
      <AlertCircle />
      <h3>Unable to load this selection</h3>
      <p>{errorMessage(error)}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}
export function LoadingSkeleton() {
  return (
    <div className="movie-grid" aria-label="Loading titles" role="status">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  )
}
