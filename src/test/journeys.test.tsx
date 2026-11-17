import { beforeAll, beforeEach, afterAll, afterEach, it, expect } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { setupServer } from 'msw/node'
import { handlers, resetDemo } from '@/mocks/handlers'
import App from '@/App'
import { store } from '@/store'
import { api } from '@/services/api'
import { replaceGuest } from '@/store/guest-slice'
import {
  setUser,
  setAuth,
  setSync,
  openTrailer,
  setSave,
  setCollection,
  setShare,
} from '@/store/ui-slice'
import { emptyLibrary, readLibrary } from '@/features/guest/storage'
import { resetCsrf } from '@/services/base-api'
import { titles } from '@/mocks/fixtures'
const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  store.dispatch(api.util.resetApiState())
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetDemo()
  resetCsrf()
  store.dispatch(replaceGuest(emptyLibrary()))
  store.dispatch(setUser(null))
  store.dispatch(setAuth(null))
  store.dispatch(setSync(false))
  store.dispatch(openTrailer(null))
  store.dispatch(setSave(null))
  store.dispatch(setCollection(null))
  store.dispatch(setShare(null))
})
function app(path = '/') {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>,
  )
}
it('opens guest sharing, renames a collection and confirms deletion', async () => {
  const user = userEvent.setup(),
    guest = emptyLibrary()
  guest.collections.push({
    id: crypto.randomUUID(),
    kind: 'custom',
    name: 'Friday Films',
    items: [],
    item_count: 0,
    created_at: null,
    updated_at: null,
    sharing_enabled: false,
    share_url: null,
  })
  store.dispatch(replaceGuest(guest))
  app('/library?tab=custom')
  await user.click(
    await screen.findByRole('button', { name: 'Share Friday Films' }),
  )
  let dialog = await screen.findByRole('dialog')
  expect(
    within(dialog).getByRole('button', { name: 'Sign In & Sync' }),
  ).toBeInTheDocument()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Edit Friday Films' }))
  dialog = await screen.findByRole('dialog')
  await user.clear(
    within(dialog).getByRole('textbox', { name: 'Collection name' }),
  )
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Collection name' }),
    'Saturday Films',
  )
  await user.click(
    within(dialog).getByRole('button', { name: 'Save Collection' }),
  )
  await user.click(
    await screen.findByRole('button', { name: 'Edit Saturday Films' }),
  )
  dialog = await screen.findByRole('dialog')
  await user.click(
    within(dialog).getByRole('button', { name: 'Delete Collection' }),
  )
  expect(
    screen.getByRole('dialog', { name: 'Delete this collection?' }),
  ).toBeInTheDocument()
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete Collection',
    }),
  )
  await waitFor(() =>
    expect(store.getState().guest.collections).toHaveLength(0),
  )
})
it('navigates guest discovery, saves a title, persists and reopens the library', async () => {
  const user = userEvent.setup()
  app()
  await user.click(
    await screen.findByRole('button', { name: 'Continue as Guest' }),
  )
  await screen.findByRole('heading', { name: 'What are we watching tonight?' })
  const buttons = await screen.findAllByRole('button', {
    name: 'Save to Watchlist: Dune: Part Two',
  })
  await user.click(buttons[0])
  await waitFor(() => expect(readLibrary().saved).toHaveLength(1))
  await user.click(screen.getByRole('link', { name: 'My Library' }))
  expect(
    await screen.findByRole('heading', { name: 'Dune: Part Two' }),
  ).toBeInTheDocument()
  expect(store.getState().guest.saved[0].title.tmdb_id).toBe(693134)
})
it('opens trailer queue, navigates titles and closes with Escape', async () => {
  const user = userEvent.setup()
  app('/discover')
  await screen.findAllByRole('heading', { name: 'Dune: Part Two' })
  await user.click(
    (
      await screen.findAllByRole('button', {
        name: 'Watch trailer for Dune: Part Two',
      })
    )[0],
  )
  const dialog = await screen.findByRole('dialog')
  expect(
    await within(dialog).findByTitle(/Dune: Part Two — Official trailer/),
  ).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Next Title' }))
  await waitFor(() =>
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', {
        name: 'Past Lives',
      }),
    ).toBeInTheDocument(),
  )
  expect(await screen.findByText('No trailer available')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(screen.queryByTitle(/Official trailer/)).not.toBeInTheDocument()
})
it('creates two collections and saves one title to both', async () => {
  const user = userEvent.setup()
  app('/library')
  for (const name of ['Weekend Picks', 'Space Stories']) {
    await user.click(screen.getByRole('button', { name: 'Create Collection' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Collection name' }),
      name,
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Save Collection' }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  }
  store.dispatch(setSave(titles[0]))
  const dialog = await screen.findByRole('dialog')
  await user.click(
    within(dialog).getByRole('checkbox', { name: /Weekend Picks/ }),
  )
  await user.click(
    within(dialog).getByRole('checkbox', { name: /Space Stories/ }),
  )
  await user.click(
    within(dialog).getByRole('button', { name: 'Save Selections' }),
  )
  await waitFor(() =>
    expect(
      store.getState().guest.collections.every((c) => c.items.length === 1),
    ).toBe(true),
  )
  expect(readLibrary().saved).toHaveLength(1)
})
it('supports mock authentication and explicit guest sync', async () => {
  const user = userEvent.setup()
  app('/discover')
  await user.click(
    (
      await screen.findAllByRole('button', {
        name: 'Save to Watchlist: Dune: Part Two',
      })
    )[0],
  )
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
  let dialog = await screen.findByRole('dialog')
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Email' }),
    'viewer@example.com',
  )
  await user.type(
    within(dialog).getByLabelText('Password'),
    'demo-password-2026',
  )
  await user.click(within(dialog).getByRole('button', { name: 'Sign In' }))
  dialog = await screen.findByRole('dialog', {
    name: 'Bring your movies with you?',
  })
  expect(store.getState().guest.saved).toHaveLength(1)
  await user.click(
    within(dialog).getByRole('button', { name: 'Sync My Library' }),
  )
  await within(dialog).findByText(/1 titles imported/)
  expect(store.getState().guest.saved).toHaveLength(0)
  const request = store.dispatch(api.endpoints.library.initiate({}))
  expect((await request.unwrap()).results).toHaveLength(1)
  request.unsubscribe()
})
it('renders a public preview and rejects a revoked or invalid link', async () => {
  app('/shared/demo')
  expect(
    await screen.findByRole('heading', { name: 'Weekend Sci-Fi' }),
  ).toBeInTheDocument()
  await screen.findByRole('heading', { name: 'Dune: Part Two' })
  expect(
    screen.queryByRole('button', { name: /Save to Watchlist/ }),
  ).not.toBeInTheDocument()
  const request = store.dispatch(
    api.endpoints.shared.initiate({ token: 'invalid' }),
  )
  await expect(request.unwrap()).rejects.toMatchObject({ status: 404 })
  request.unsubscribe()
})
it('uses immutable snapshots and restarts expired snapshot requests', async () => {
  const first = store.dispatch(api.endpoints.titles.initiate({ page_size: 2 }))
  const data = await first.unwrap()
  expect(data.results).toHaveLength(2)
  expect(data.next).toContain('snapshot=')
  const second = store.dispatch(
    api.endpoints.titles.initiate({
      page_size: 2,
      page: 2,
      snapshot: data.meta.snapshot,
    }),
  )
  expect((await second.unwrap()).results[0].title).not.toBe(
    data.results[0].title,
  )
  const expired = store.dispatch(
    api.endpoints.titles.initiate({
      page_size: 2,
      page: 2,
      snapshot: crypto.randomUUID(),
    }),
  )
  await expect(expired.unwrap()).rejects.toMatchObject({ status: 410 })
  first.unsubscribe()
  second.unsubscribe()
  expired.unsubscribe()
})
it('applies multi-genre filters, search and mood recommendations through mock requests', async () => {
  const user = userEvent.setup()
  app('/discover')
  await screen.findAllByRole('heading', { name: 'Dune: Part Two' })
  await user.click(screen.getByRole('button', { name: 'Animation' }))
  await user.click(screen.getByRole('button', { name: 'Family' }))
  expect(
    await screen.findByRole('heading', { name: 'The Boy and the Heron' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('heading', { name: 'Dune: Part Two' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Find by Mood' }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Family Night' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  await screen.findByRole('heading', { name: 'Picked for you' })
  await user.click(screen.getByRole('button', { name: 'Reset filters' }))
  await user.type(
    screen.getByRole('textbox', { name: 'Search titles or people' }),
    'Arrival',
  )
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Dune: Part Two' }),
    ).not.toBeInTheDocument(),
  )
  expect(
    await screen.findByRole('heading', { name: 'Arrival' }),
  ).toBeInTheDocument()
})
it('keeps sharing read-only, revokes links and safely replays a sync job', async () => {
  const login = store.dispatch(
    api.endpoints.login.initiate({
      email: 'demo@example.com',
      password: 'demo-password',
    }),
  )
  const auth = await login.unwrap()
  store.dispatch(setUser(auth.user))
  const creation = store.dispatch(
    api.endpoints.createCollection.initiate({ name: 'Weekend' }),
  )
  const collection = await creation.unwrap()
  await store
    .dispatch(
      api.endpoints.membership.initiate({
        id: collection.id,
        title: titles[0],
      }),
    )
    .unwrap()
  await store
    .dispatch(api.endpoints.save.initiate({ title: titles[0], watched: true }))
    .unwrap()
  const share = await store
    .dispatch(
      api.endpoints.sharing.initiate({ id: collection.id, enabled: true }),
    )
    .unwrap()
  const token = share!.url.split('/').at(-1)!
  const publicData = await store
    .dispatch(api.endpoints.shared.initiate({ token }))
    .unwrap()
  expect(Object.keys(publicData).sort()).toEqual(['items', 'name'])
  expect(publicData.items.results[0]).not.toHaveProperty('watched')
  await store
    .dispatch(
      api.endpoints.sharing.initiate({ id: collection.id, enabled: false }),
    )
    .unwrap()
  await expect(
    store
      .dispatch(
        api.endpoints.shared.initiate({ token }, { forceRefetch: true }),
      )
      .unwrap(),
  ).rejects.toMatchObject({ status: 404 })
  const payload = {
    sync_id: crypto.randomUUID(),
    guest_id: crypto.randomUUID(),
    saved_titles: [
      {
        media_type: 'movie' as const,
        tmdb_id: 693134,
        watched: false,
        saved_at: new Date().toISOString(),
        watched_at: null,
      },
    ],
    collections: [],
  }
  const first = await store
    .dispatch(api.endpoints.sync.initiate(payload))
    .unwrap()
  const replay = await store
    .dispatch(api.endpoints.sync.initiate(payload))
    .unwrap()
  expect(replay).toEqual(first)
  const saved = await store
    .dispatch(api.endpoints.library.initiate({}, { forceRefetch: true }))
    .unwrap()
  expect(saved.results[0].watched).toBe(true)
  await expect(
    store
      .dispatch(api.endpoints.sync.initiate({ ...payload, saved_titles: [] }))
      .unwrap(),
  ).rejects.toMatchObject({ status: 409 })
})
