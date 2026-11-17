import { useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router'
import { Film, Menu, X, LogOut, Sun, Moon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { setAuth, setUser, setSync } from '@/store/ui-slice'
import { baseApi } from '@/services/base-api'
import { api } from '@/services/api'
import { config } from '@/lib/config'
import { toast } from 'sonner'
import { errorMessage } from '@/hooks/use-library'
export function AppShell() {
  const dispatch = useAppDispatch(),
    user = useAppSelector((s) => s.ui.user),
    guest = useAppSelector((s) => s.guest)
  const [logout] = api.useLogoutMutation(),
    [menu, setMenu] = useState(false),
    [light, setLight] = useState(false)
  const location = useLocation()
  const signOut = async () => {
    try {
      await logout().unwrap()
      dispatch(setUser(null))
      dispatch(baseApi.util.resetApiState())
      toast.success('Signed out')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const links = (
    <>
      {[
        ['/discover', 'Discover'],
        ['/library', 'My Library'],
        ['/library?tab=custom', 'Collections'],
      ].map(([path, label]) => (
        <NavLink
          key={label}
          to={path}
          onClick={() => setMenu(false)}
          className={
            label === 'Collections'
              ? location.search.includes('custom')
                ? 'active'
                : ''
              : undefined
          }
        >
          {label}
        </NavLink>
      ))}
    </>
  )
  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" to="/discover">
            <Film size={25} />
            <span>CineScope</span>
          </Link>
          <nav className="desktop-nav">{links}</nav>
          <div className="header-actions">
            <span className="session-badge">
              {config.mock && user ? 'Demo · ' : ''}
              {user ? user.display_name : 'Guest Session'}
            </span>
            {user ? (
              <>
                <button
                  aria-label="Sign Out"
                  className="icon-button"
                  onClick={() => void signOut()}
                >
                  <LogOut size={18} />
                </button>
                {(guest.saved.length > 0 || guest.collections.length > 0) && (
                  <button
                    className="text-button sync-header"
                    onClick={() => dispatch(setSync(true))}
                  >
                    Sync guest data
                  </button>
                )}
              </>
            ) : (
              <button
                className="button secondary signin-button"
                onClick={() => dispatch(setAuth('login'))}
              >
                Sign In
              </button>
            )}
            <button
              aria-label="Toggle theme"
              className="icon-button"
              onClick={() => {
                setLight(!light)
                document.documentElement.classList.toggle('light', !light)
              }}
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              aria-label={menu ? 'Close navigation' : 'Open navigation'}
              className="icon-button mobile-menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && <nav className="mobile-nav">{links}</nav>}
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>CineScope · Discover your next favorite.</span>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          TMDB
        </a>
        <span>Watch provider data by JustWatch</span>
        {config.mock && <span>Demo mode · Representative sample content</span>}
      </footer>
    </>
  )
}
