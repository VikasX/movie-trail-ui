/**
 * This file connects URLs to pages and decides which global dialogs are visible.
 * A lazy import downloads a page or dialog when React first needs that component.
 * The actual page content lives in src/features. Read main.tsx before this file.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Routing tools for links, page matching, navigation, and URL values.
import { Route, Routes } from 'react-router'
// Bring in the exported helpers/components from `@/components/app-shell`.
import { AppShell } from '@/components/app-shell'
// React hooks and component/type helpers used to build this file’s interface.
import { lazy, Suspense } from 'react'
// Bring in the exported helpers/components from `@/features/auth/session-bootstrap`.
import { SessionBootstrap } from '@/features/auth/session-bootstrap'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppSelector } from '@/hooks/redux'
// Toast notifications shown after an operation succeeds or fails.
import { Toaster } from 'sonner'
// Bring in the exported helpers/components from `@/pages/not-found-page`.
import { NotFoundPage } from '@/pages/not-found-page'
// Each lazy callback imports a module and adapts its named export to the default export expected by React.lazy.
// Keep `WelcomePage` as the result returned by `lazy` with these arguments.
const WelcomePage = lazy(() =>
  import('@/features/auth/auth').then((m) => ({ default: m.WelcomePage })),
)
// Keep `AuthDialog` as the result returned by `lazy` with these arguments.
const AuthDialog = lazy(() =>
  import('@/features/auth/auth').then((m) => ({ default: m.AuthDialog })),
)
// Keep `AuthTokenPage` as the result returned by `lazy` with these arguments.
const AuthTokenPage = lazy(() =>
  import('@/features/auth/auth').then((m) => ({ default: m.AuthTokenPage })),
)
// Keep `DiscoverPage` as the result returned by `lazy` with these arguments.
const DiscoverPage = lazy(() =>
  import('@/features/discover/discover-page').then((m) => ({
    // Set the `default` field to the value read from `m.DiscoverPage`.
    default: m.DiscoverPage,
  })),
)
// Keep `LibraryPage` as the result returned by `lazy` with these arguments.
const LibraryPage = lazy(() =>
  import('@/features/library/library-page').then((m) => ({
    // Set the `default` field to the value read from `m.LibraryPage`.
    default: m.LibraryPage,
  })),
)
// Keep `CollectionPage` as the result returned by `lazy` with these arguments.
const CollectionPage = lazy(() =>
  import('@/features/library/library-page').then((m) => ({
    // Set the `default` field to the value read from `m.CollectionPage`.
    default: m.CollectionPage,
  })),
)
// Keep `SharedPage` as the result returned by `lazy` with these arguments.
const SharedPage = lazy(() =>
  import('@/features/collections/shared-page').then((m) => ({
    // Set the `default` field to the value read from `m.SharedPage`.
    default: m.SharedPage,
  })),
)
// Keep `CollectionDialogs` as the result returned by `lazy` with these arguments.
const CollectionDialogs = lazy(() =>
  import('@/features/collections/dialogs').then((m) => ({
    // Set the `default` field to the value read from `m.CollectionDialogs`.
    default: m.CollectionDialogs,
  })),
)
// Keep `TrailerModal` as the result returned by `lazy` with these arguments.
const TrailerModal = lazy(() =>
  import('@/features/titles/trailer-modal').then((m) => ({
    // Set the `default` field to the value read from `m.TrailerModal`.
    default: m.TrailerModal,
  })),
)

/** Choose a page from the URL and mount the global overlays selected in Redux. */
export default function App() {
  // Selecting Redux state subscribes this component to changes, so opening a dialog causes React to render it here.
  // Keep `ui` as the Redux value selected by `(s) => s.ui`; React subscribes to changes in that selected value.
  const ui = useAppSelector((s) => s.ui)
  return (
    <>
      {/* Restore session information while the visible page loads. */}
      {/* Render the SessionBootstrap component. */}
      <SessionBootstrap />
      {/* Render the Suspense component. */}
      <Suspense
        fallback={
          <div className="container" role="status">
            Loading CineScope…
          </div>
        }
      >
        {/* Choose the matching page. AppShell supplies the layout around its nested routes. */}
        {/* Match the current browser path against the routes inside. */}
        <Routes>
          {/* Declare a frontend path and the element rendered for that route. */}
          <Route path="/" element={<WelcomePage />} />
          {/* Declare a frontend path and the element rendered for that route. */}
          <Route element={<AppShell />}>
            {/* Declare a frontend path and the element rendered for that route. */}
            <Route path="/discover" element={<DiscoverPage />} />
            {/* Declare a frontend path and the element rendered for that route. */}
            <Route path="/library" element={<LibraryPage />} />
            {/* Declare a frontend path and the element rendered for that route. */}
            <Route
              path="/library/collections/:id"
              element={<CollectionPage />}
            />
            {/* Declare a frontend path and the element rendered for that route. */}
            <Route path="/shared/:token" element={<SharedPage />} />
            {/* Declare a frontend path and the element rendered for that route. */}
            <Route path="/auth/verify" element={<AuthTokenPage />} />
            {/* Declare a frontend path and the element rendered for that route. */}
            <Route
              path="/auth/reset-password"
              element={<AuthTokenPage reset />}
            />
            {/* Declare a frontend path and the element rendered for that route. */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      {/* Render the Suspense component. */}
      <Suspense fallback={null}>
        {/* Render the right-hand content only when `ui.trailer` is truthy. */}
        {ui.trailer && <TrailerModal />}
        {/* Render the right-hand content only when `(ui.collection || ui.save || ui.share || ui.sync)` is truthy. */}
        {(ui.collection || ui.save || ui.share || ui.sync) && (
          <CollectionDialogs />
        )}
        {/* Render the right-hand content only when `ui.auth` is truthy. */}
        {ui.auth && <AuthDialog />}
      </Suspense>
      {/* Mount one shared place for all success/error notifications. */}
      {/* Render the Toaster component. */}
      <Toaster theme="dark" richColors closeButton />
    </>
  )
}
