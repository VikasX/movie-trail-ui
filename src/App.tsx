import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/app-shell'
import { lazy, Suspense } from 'react'
import { SessionBootstrap } from '@/features/auth/session-bootstrap'
import { useAppSelector } from '@/hooks/redux'
import { Toaster } from 'sonner'
import { NotFoundPage } from '@/pages/not-found-page'
const WelcomePage = lazy(() =>
  import('@/features/auth/auth').then((m) => ({ default: m.WelcomePage })),
)
const AuthDialog = lazy(() =>
  import('@/features/auth/auth').then((m) => ({ default: m.AuthDialog })),
)
const AuthTokenPage = lazy(() =>
  import('@/features/auth/auth').then((m) => ({ default: m.AuthTokenPage })),
)
const DiscoverPage = lazy(() =>
  import('@/features/discover/discover-page').then((m) => ({
    default: m.DiscoverPage,
  })),
)
const LibraryPage = lazy(() =>
  import('@/features/library/library-page').then((m) => ({
    default: m.LibraryPage,
  })),
)
const CollectionPage = lazy(() =>
  import('@/features/library/library-page').then((m) => ({
    default: m.CollectionPage,
  })),
)
const SharedPage = lazy(() =>
  import('@/features/collections/shared-page').then((m) => ({
    default: m.SharedPage,
  })),
)
const CollectionDialogs = lazy(() =>
  import('@/features/collections/dialogs').then((m) => ({
    default: m.CollectionDialogs,
  })),
)
const TrailerModal = lazy(() =>
  import('@/features/titles/trailer-modal').then((m) => ({
    default: m.TrailerModal,
  })),
)

export default function App() {
  const ui = useAppSelector((s) => s.ui)
  return (
    <>
      <SessionBootstrap />
      <Suspense
        fallback={
          <div className="container" role="status">
            Loading CineScope…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route element={<AppShell />}>
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route
              path="/library/collections/:id"
              element={<CollectionPage />}
            />
            <Route path="/shared/:token" element={<SharedPage />} />
            <Route path="/auth/verify" element={<AuthTokenPage />} />
            <Route
              path="/auth/reset-password"
              element={<AuthTokenPage reset />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        {ui.trailer && <TrailerModal />}
        {(ui.collection || ui.save || ui.share || ui.sync) && (
          <CollectionDialogs />
        )}
        {ui.auth && <AuthDialog />}
      </Suspense>
      <Toaster theme="dark" richColors closeButton />
    </>
  )
}
