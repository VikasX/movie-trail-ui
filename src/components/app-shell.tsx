/**
 * The shared header, navigation, and footer surrounding application pages.
 * Outlet is the place where React Router inserts the current child page.
 * This component also handles the mobile menu, theme choice, sign-out, and manual guest-sync entry.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useState } from 'react'
// Routing tools for links, page matching, navigation, and URL values.
import { NavLink, Link, Outlet, useLocation } from 'react-router'
// SVG icon components used by the controls and headings below.
import { Film, Menu, X, LogOut, Sun, Moon } from 'lucide-react'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import { setAuth, setUser, setSync } from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/services/base-api`.
import { baseApi } from '@/services/base-api'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/lib/config`.
import { config } from '@/lib/config'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { errorMessage } from '@/hooks/use-library'
/** Provide shared page navigation and render the active nested route inside Outlet. */
export function AppShell() {
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `user` as the Redux value selected by `(s) => s.ui.user`; React subscribes to changes in that selected value.
  // Keep `guest` as the Redux value selected by `(s) => s.guest`; React subscribes to changes in that selected value.
  const dispatch = useAppDispatch(),
    user = useAppSelector((s) => s.ui.user),
    guest = useAppSelector((s) => s.guest)
  // Keep `[logout]` as the RTK Query mutation tuple from `api.useLogoutMutation`; its trigger sends a request when explicitly called.
  // Keep `[menu, setMenu]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  // Keep `[light, setLight]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  const [logout] = api.useLogoutMutation(),
    [menu, setMenu] = useState(false),
    [light, setLight] = useState(false)
  // Keep `location` as the result returned by `useLocation` with these arguments.
  const location = useLocation()
  // Invalidate the Django session first, then clear the user view and private RTK Query cache. Guest storage remains available.
  // Keep `signOut` as a callback that runs when it is called and returns a promise.
  const signOut = async () => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Wait for `logout().unwrap()` before continuing this async operation.
      await logout().unwrap()
      // Send `setUser(null)` to Redux so its matching reducer/middleware can process it.
      dispatch(setUser(null))
      // Send `baseApi.util.resetApiState()` to Redux so its matching reducer/middleware can process it.
      dispatch(baseApi.util.resetApiState())
      // Show the user this success toast message.
      toast.success('Signed out')
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    }
  }
  // Build one set of route links for desktop navigation and the mobile menu.
  // Keep `links` as the value read from `<> {[ ['/discover', 'Discover'], ['/library', 'My Library'], ['/library?tab=custom', 'Collections'], ].map(...`.
  const links = (
    <>
      {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
      {[
        ['/discover', 'Discover'],
        ['/library', 'My Library'],
        ['/library?tab=custom', 'Collections'],
      ].map(([path, label]) => (
        <NavLink
          key={
            /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ label
          }
          to={
            /* Use this expression as the frontend navigation destination. */ path
          }
          onClick={
            /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
              setMenu(false)
          }
          className={
            /* Choose the CSS classes from this expression; conditional parts reflect the current state. */
            label === 'Collections'
              ? location.search.includes('custom')
                ? 'active'
                : ''
              : undefined
          }
        >
          {/* Insert `label` into this part of the interface. */}
          {label}
        </NavLink>
      ))}
    </>
  )
  return (
    <>
      {/* Shared navigation for application pages. */}
      {/* Render the header element styled by `"app-header"`. */}
      <header className="app-header">
        {/* Render the div element styled by `"header-inner"`. */}
        <div className="header-inner">
          {/* Render a frontend link managed by React Router. */}
          {/* The destination is `"/discover"`. */}
          <Link className="brand" to="/discover">
            {/* Render the Film component. */}
            <Film size={25} />
            {/* Render the span element. */}
            <span>CineScope</span>
          </Link>
          {/* Render the nav element styled by `"desktop-nav"`. */}
          <nav className="desktop-nav">{links}</nav>
          {/* Choose guest/account actions from the current user view. */}
          {/* Render the div element styled by `"header-actions"`. */}
          <div className="header-actions">
            {/* Render the span element styled by `"session-badge"`. */}
            <span className="session-badge">
              {/* Choose the rendered branch from `config.mock && user`; the ? branch is used when true and the : branch otherwise. */}
              {config.mock && user ? 'Demo · ' : ''}
              {/* Choose the rendered branch from `user`; the ? branch is used when true and the : branch otherwise. */}
              {user ? user.display_name : 'Guest Session'}
            </span>
            {/* Choose the rendered branch from `user`; the ? branch is used when true and the : branch otherwise. */}
            {user ? (
              <>
                {/* Render an interactive button. */}
                {/* The accessible name is `"Sign Out"`. */}
                {/* Clicks call `{() => void signOut()}`. */}
                <button
                  aria-label="Sign Out"
                  className="icon-button"
                  onClick={
                    /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                      void signOut()
                  }
                >
                  {/* Render the LogOut component. */}
                  <LogOut size={18} />
                </button>
                {/* Render the right-hand content only when `(guest.saved.length > 0 || guest.collections.length > 0)` is truthy. */}
                {(guest.saved.length > 0 || guest.collections.length > 0) && (
                  <button
                    className="text-button sync-header"
                    onClick={
                      /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                        dispatch(setSync(true))
                    }
                  >
                    Sync guest data
                  </button>
                )}
              </>
            ) : (
              <button
                className="button secondary signin-button"
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    dispatch(setAuth('login'))
                }
              >
                Sign In
              </button>
            )}
            {/* Render an interactive button. */}
            {/* The accessible name is `"Toggle theme"`. */}
            {/* Clicks call `{() => { setLight(!light) document.documentElement.classList.toggle('light', !light) }}`. */}
            <button
              aria-label="Toggle theme"
              className="icon-button"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () => {
                  // Call `setLight` with `!light` to update its state or routed value.
                  setLight(!light)
                  // Call `document.documentElement.classList.toggle` with the arguments below to perform this step.
                  document.documentElement.classList.toggle('light', !light)
                }
              }
            >
              {/* Choose the rendered branch from `light`; the ? branch is used when true and the : branch otherwise. */}
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {/* Render an interactive button. */}
            {/* The accessible name is `{menu ? 'Close navigation' : 'Open navigation'}`. */}
            {/* Clicks call `{() => setMenu(!menu)}`. */}
            <button
              aria-label={menu ? 'Close navigation' : 'Open navigation'}
              className="icon-button mobile-menu"
              aria-expanded={menu}
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  setMenu(!menu)
              }
            >
              {/* Choose the rendered branch from `menu`; the ? branch is used when true and the : branch otherwise. */}
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {/* Render the right-hand content only when `menu` is truthy. */}
        {menu && <nav className="mobile-nav">{links}</nav>}
      </header>
      {/* Outlet below receives the page selected by the nested route. */}
      {/* Render the main element styled by `"app-main"`. */}
      <main className="app-main">
        {/* Render the child page matched by the current route. */}
        <Outlet />
      </main>
      {/* Shared product attribution and a visible demo-mode label when applicable. */}
      {/* Render the footer element styled by `"app-footer"`. */}
      <footer className="app-footer">
        {/* Render the span element. */}
        <span>CineScope · Discover your next favorite.</span>
        {/* Render the p element. */}
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        {/* Render the a element. */}
        {/* The destination URL is `"https://www.themoviedb.org"`. */}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          TMDB
        </a>
        {/* Render the span element. */}
        <span>Watch provider data by JustWatch</span>
        {/* Render the right-hand content only when `config.mock` is truthy. */}
        {config.mock && <span>Demo mode · Representative sample content</span>}
      </footer>
    </>
  )
}
