import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          The page you’re looking for doesn’t exist.
        </p>
        <Button variant="outline" asChild className="mt-8">
          <Link to="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to CineScope
          </Link>
        </Button>
      </div>
    </main>
  )
}
