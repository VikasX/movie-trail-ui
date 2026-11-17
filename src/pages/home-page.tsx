import { CircleCheck, Clapperboard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAppSelector } from '@/hooks/redux'

export function HomePage() {
  const showReadyStatus = useAppSelector((state) => state.ui.showReadyStatus)

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
          <Clapperboard className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          CineScope
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg">
          Discover movies and TV series. Find your next favorite.
        </p>
        {showReadyStatus && (
          <Badge
            variant="outline"
            className="mt-8 h-auto gap-2 rounded-full px-3 py-1.5 font-normal"
            role="status"
          >
            <CircleCheck
              className="size-3.5 text-emerald-600"
              aria-hidden="true"
            />
            Frontend is ready
          </Badge>
        )}
      </div>
    </main>
  )
}
