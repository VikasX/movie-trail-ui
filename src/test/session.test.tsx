import { StrictMode } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { SessionBootstrap } from '@/features/auth/session-bootstrap'
import { AppShell } from '@/components/app-shell'
import { CollectionDialogs } from '@/features/collections/dialogs'
import { store } from '@/store'
import { api } from '@/services/api'
import { resetCsrf } from '@/services/base-api'
import { setAuth, setSync, setUser } from '@/store/ui-slice'
import { replaceGuest } from '@/store/guest-slice'
import { emptyLibrary, saveTitle } from '@/features/guest/storage'
import { titles } from '@/mocks/fixtures'
import type { User } from '@/types/models'

const account: User = {
  id: 1,
  email: 'viewer@example.com',
  display_name: 'Google Viewer',
  email_verified: true,
  providers: ['google'],
  preferences: { language: 'en-US', region: 'IN' },
}
let authenticated = true
let meRequests = 0
const server = setupServer(
  http.get('http://localhost/api/v1/auth/csrf/', () =>
    HttpResponse.json({ csrf_token: 'fresh-masked-token' }),
  ),
  http.get('http://localhost/api/v1/me/', () => {
    meRequests++
    return authenticated
      ? HttpResponse.json(account)
      : HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }),
  http.post('http://localhost/api/v1/auth/logout/', ({ request }) => {
    expect(request.credentials).toBe('include')
    expect(request.headers.get('X-CSRFToken')).toBe('fresh-masked-token')
    authenticated = false
    return new HttpResponse(null, { status: 204 })
  }),
)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  authenticated = true
  meRequests = 0
  store.dispatch(setUser(null))
  store.dispatch(setAuth(null))
  store.dispatch(setSync(false))
  store.dispatch(replaceGuest(emptyLibrary()))
  store.dispatch(api.util.resetApiState())
  resetCsrf()
})
afterEach(() => server.resetHandlers())

function mount(path = '/discover?auth=success', strict = false) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <SessionBootstrap />
            <AppShell />
            <CollectionDialogs />
          </>
        ),
      },
    ],
    { initialEntries: [path] },
  )
  const content = (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
  render(strict ? <StrictMode>{content}</StrictMode> : content)
  return router
}

it.each([false, true])(
  'restores an OAuth session on first return (StrictMode=%s)',
  async (strict) => {
    const requests: string[] = []
    server.use(
      http.get('http://localhost/api/v1/auth/csrf/', async () => {
        requests.push('csrf')
        // A real asynchronous bootstrap exposes resets that cancel the initial /me/ request.
        await Promise.resolve()
        return HttpResponse.json({ csrf_token: 'fresh-masked-token' })
      }),
    )
    const router = mount('/discover?auth=success&tab=movies', strict)
    expect(await screen.findByText(/Google Viewer/)).toBeInTheDocument()
    expect(store.getState().ui.user).toEqual(account)
    expect(
      screen.queryByRole('button', { name: 'Sign In' }),
    ).not.toBeInTheDocument()
    expect(meRequests).toBeGreaterThan(0)
    expect(requests.length).toBeGreaterThan(0)
    expect(router.state.location.search).toBe('?tab=movies')
  },
)

it('refetches a cached guest session when OAuth returns to a mounted application', async () => {
  authenticated = false
  const guest = emptyLibrary()
  saveTitle(guest, titles[0])
  store.dispatch(replaceGuest(guest))
  const router = mount('/discover')
  await waitFor(() =>
    expect(api.endpoints.me.select()(store.getState()).isError).toBe(true),
  )
  expect(screen.getByText('Guest Session')).toBeInTheDocument()
  const before = meRequests
  authenticated = true
  await act(() => router.navigate('/discover?auth=success'))
  expect(await screen.findByText(/Google Viewer/)).toBeInTheDocument()
  expect(meRequests).toBeGreaterThan(before)
  expect(store.getState().ui.sync).toBe(true)
  expect(
    await screen.findByRole('dialog', { name: 'Bring your movies with you?' }),
  ).toBeInTheDocument()
  expect(store.getState().guest.saved).toHaveLength(1)
  act(() => {
    store.dispatch(setSync(false))
  })
  await act(() => router.navigate('/library'))
  expect(store.getState().ui.sync).toBe(false)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('offers guest sync once after a fresh OAuth return', async () => {
  const guest = emptyLibrary()
  saveTitle(guest, titles[0])
  store.dispatch(replaceGuest(guest))
  mount()
  await screen.findByText(/Google Viewer/)
  expect(store.getState().ui.sync).toBe(true)
  act(() => {
    store.dispatch(setSync(false))
  })
  await act(async () => {
    const updated = structuredClone(store.getState().guest)
    saveTitle(updated, titles[1])
    store.dispatch(replaceGuest(updated))
    await store.dispatch(
      api.endpoints.me.initiate(undefined, {
        subscribe: false,
        forceRefetch: true,
      }),
    )
  })
  expect(store.getState().ui.sync).toBe(false)
})

it('does not authenticate a failed OAuth return or offer guest sync', async () => {
  authenticated = false
  const router = mount('/discover?auth=cancelled')
  await waitFor(() =>
    expect(api.endpoints.me.select()(store.getState()).isError).toBe(true),
  )
  expect(store.getState().ui.user).toBeNull()
  expect(store.getState().ui.sync).toBe(false)
  expect(router.state.location.search).toBe('')
})

it('requires a server session even when the URL claims OAuth success', async () => {
  authenticated = false
  mount()
  await waitFor(() =>
    expect(api.endpoints.me.select()(store.getState()).isError).toBe(true),
  )
  expect(store.getState().ui.user).toBeNull()
  expect(store.getState().ui.sync).toBe(false)
  expect(screen.getByText('Guest Session')).toBeInTheDocument()
})

it('does not restore retained user data when /me/ rejects an expired session', async () => {
  mount('/discover')
  await screen.findByText(/Google Viewer/)
  await waitFor(() =>
    expect(api.endpoints.me.select()(store.getState()).isSuccess).toBe(true),
  )
  authenticated = false
  await act(async () => {
    await store.dispatch(
      api.endpoints.me.initiate(undefined, {
        subscribe: false,
        forceRefetch: true,
      }),
    )
  })
  expect(await screen.findByText('Guest Session')).toBeInTheDocument()
  expect(store.getState().ui.user).toBeNull()
})

it('shows the guest navbar immediately after secure logout and discards cached user data', async () => {
  mount('/discover')
  await screen.findByText(/Google Viewer/)
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Sign Out' }))
  expect(await screen.findByText('Guest Session')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  expect(store.getState().ui.user).toBeNull()
  await waitFor(() =>
    expect(api.endpoints.me.select()(store.getState()).isError).toBe(true),
  )
  expect(api.endpoints.me.select()(store.getState()).data).toBeUndefined()
})
