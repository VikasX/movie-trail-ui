/**
 * Shared visual feedback for an empty list, a failed request, or a loading list.
 * Pages pass text, errors, and optional retry callbacks into these components.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// SVG icon components used by the controls and headings below.
import { Film, AlertCircle } from 'lucide-react'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { errorMessage } from '@/hooks/use-library'
/** Display an explanation when a request succeeds with no items. */
export function EmptyState(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    title = 'Nothing here yet',
    description = 'Find something you love and save it for later.',
  }: {
    // The title record or display title used by this object. The ? makes this field optional. Its type is `string`.
    title?: string
    // The descriptive text associated with this value. The ? makes this field optional. Its type is `string`.
    description?: string
  },
) {
  return (
    <div className="empty-state">
      {/* Render the Film component. */}
      <Film size={28} />
      {/* Render the h3 element. */}
      <h3>{title}</h3>
      {/* Render the p element. */}
      <p>{description}</p>
    </div>
  )
}
/** Display the request error and an optional button that calls the supplied retry function. */
export function ErrorState(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    error,
    retry,
  }: {
    // The `error` field used by this data shape. Its type is `unknown`.
    error: unknown
    // The `retry` field used by this data shape. The ? makes this field optional. Its type is `() => void`.
    retry?: () => void
  },
) {
  return (
    <div className="empty-state" role="alert">
      {/* Render the AlertCircle component. */}
      <AlertCircle />
      {/* Render the h3 element. */}
      <h3>Unable to load this selection</h3>
      {/* Render the p element. */}
      <p>{errorMessage(error)}</p>
      {/* Render the right-hand content only when `retry` is truthy. */}
      {retry && (
        <button
          className="button secondary"
          onClick={
            /* React calls this callback when the control is clicked. The arrow body below performs the action. */ retry
          }
        >
          Try again
        </button>
      )}
    </div>
  )
}
/** Display placeholder card shapes while a page waits for title data. */
export function LoadingSkeleton() {
  return (
    <div className="movie-grid" aria-label="Loading titles" role="status">
      {/* Insert `Array.from({ length: 6 }, (_, i) => ( <div key={i} className="skeleton-card" /> ))` into this part of the interface. */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={
            /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ i
          }
          className="skeleton-card"
        />
      ))}
    </div>
  )
}
