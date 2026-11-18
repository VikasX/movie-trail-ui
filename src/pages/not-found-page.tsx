/**
 * The fallback page for a frontend URL with no matching route.
 * App.tsx selects this component through its wildcard route. The button links back to CineScope.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// SVG icon components used by the controls and headings below.
import { ArrowLeft } from 'lucide-react'
// Routing tools for links, page matching, navigation, and URL values.
import { Link } from 'react-router'
// Bring in the exported helpers/components from `@/components/ui/button`.
import { Button } from '@/components/ui/button'

/** Explain an unmatched frontend route and offer a link back into the app. */
export function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16 text-center">
      {/* Render the div element. */}
      <div>
        {/* Render the p element styled by `"text-sm font-medium text-muted-foreground"`. */}
        <p className="text-sm font-medium text-muted-foreground">404</p>
        {/* Render the h1 element styled by `"mt-3 text-3xl font-semibold tracking-tight"`. */}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        {/* Render the p element styled by `"mt-3 text-muted-foreground"`. */}
        <p className="mt-3 text-muted-foreground">
          The page you’re looking for doesn’t exist.
        </p>
        {/* Render the Button component. */}
        <Button variant="outline" asChild className="mt-8">
          {/* Render a frontend link managed by React Router. */}
          {/* The destination is `"/"`. */}
          <Link to="/">
            {/* Render the ArrowLeft component. */}
            {/* Assistive-technology visibility is controlled by `"true"`. */}
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to CineScope
          </Link>
        </Button>
      </div>
    </main>
  )
}
