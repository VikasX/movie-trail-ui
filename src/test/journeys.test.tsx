/**
 * User-journey tests that render React components in a simulated browser.
 * Testing Library clicks and types as a user would. MSW answers API requests with demo responses.
 * These tests verify interactions and data changes. Browser visual checks are a separate activity.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// The test runner’s test declarations, assertions, and lifecycle helpers.
import { beforeAll, beforeEach, afterAll, afterEach, it, expect } from 'vitest'
// Helpers that render components and query their simulated browser output.
import { render, screen, within, waitFor } from '@testing-library/react'
// Simulated user typing and clicks for interaction tests.
import userEvent from '@testing-library/user-event'
// React bindings that make the Redux store available to components.
import { Provider } from 'react-redux'
// Routing tools for links, page matching, navigation, and URL values.
import { MemoryRouter } from 'react-router'
// Bring in the exported helpers/components from `msw/node`.
import { setupServer } from 'msw/node'
// Bring in the exported helpers/components from `@/mocks/handlers`.
import { handlers, resetDemo } from '@/mocks/handlers'
// Bring in the exported helpers/components from `@/App`.
import App from '@/App'
// Bring in the exported helpers/components from `@/store`.
import { store } from '@/store'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/store/guest-slice`.
import { replaceGuest } from '@/store/guest-slice'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import {
  setUser,
  setAuth,
  setSync,
  openTrailer,
  setSave,
  setCollection,
  setShare,
} from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/features/guest/storage`.
import { emptyLibrary, readLibrary } from '@/features/guest/storage'
// Bring in the exported helpers/components from `@/services/base-api`.
import { resetCsrf } from '@/services/base-api'
// Bring in the exported helpers/components from `@/mocks/fixtures`.
import { titles } from '@/mocks/fixtures'
// Keep `server` as the result returned by `setupServer` with these arguments.
const server = setupServer(...handlers)
// Run this setup/cleanup at the lifecycle point named `beforeAll`.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// Run this setup/cleanup at the lifecycle point named `afterAll`.
afterAll(() => server.close())
// Run this setup/cleanup at the lifecycle point named `afterEach`.
afterEach(() => {
  // Call `server.resetHandlers` with the arguments below to perform this step.
  server.resetHandlers()
  // Send `api.util.resetApiState()` to Redux so its matching reducer/middleware can process it.
  store.dispatch(api.util.resetApiState())
})
// Run this setup/cleanup at the lifecycle point named `beforeEach`.
beforeEach(() => {
  // Call `localStorage.clear` with the arguments below to perform this step.
  localStorage.clear()
  // Call `sessionStorage.clear` with the arguments below to perform this step.
  sessionStorage.clear()
  // Call `resetDemo` with the arguments below to perform this step.
  resetDemo()
  // Call `resetCsrf` with the arguments below to perform this step.
  resetCsrf()
  // Send `replaceGuest(emptyLibrary())` to Redux so its matching reducer/middleware can process it.
  store.dispatch(replaceGuest(emptyLibrary()))
  // Send `setUser(null)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setUser(null))
  // Send `setAuth(null)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setAuth(null))
  // Send `setSync(false)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setSync(false))
  // Send `openTrailer(null)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(openTrailer(null))
  // Send `setSave(null)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setSave(null))
  // Send `setCollection(null)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setCollection(null))
  // Send `setShare(null)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setShare(null))
})
/** Render the application with Redux and an in-memory URL for one interaction test. */
function app(
  /* The API-relative path requested through the configured base query. Omitting this input uses the default shown after =. */ path = '/',
) {
  // Call `render` with the arguments below to perform this step.
  render(
    <Provider store={store}>
      {/* Render the MemoryRouter component. */}
      <MemoryRouter initialEntries={[path]}>
        {/* Render the App component. */}
        <App />
      </MemoryRouter>
    </Provider>,
  )
}
// Exercise the behavior described by this test name.
it('opens guest sharing, renames a collection and confirms deletion', async () => {
  // Keep `user` as the result returned by `userEvent.setup` with these arguments.
  // Keep `guest` as the result returned by `emptyLibrary` with these arguments.
  const user = userEvent.setup(),
    guest = emptyLibrary()
  // Append these values to the end of `guest.collections`.
  guest.collections.push({
    // Set the `id` field to the result returned by `crypto.randomUUID` with these arguments.
    id: crypto.randomUUID(),
    // The collection kind, distinguishing editable custom groups from computed automatic groups.
    kind: 'custom',
    // Set the `name` field to the text `'Friday Films'`.
    name: 'Friday Films',
    // The member records contained in this group or paginated response.
    items: [],
    // The number of members reported for this collection.
    item_count: 0,
    // The record creation time.
    created_at: null,
    // The most recent record-update time.
    updated_at: null,
    // Whether this collection currently has public sharing enabled.
    sharing_enabled: false,
    // The public link, or null when no link is available.
    share_url: null,
  })
  // Send `replaceGuest(guest)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(replaceGuest(guest))
  // Call `app` with the arguments below to perform this step.
  app('/library?tab=custom')
  // Wait for `user.click( await screen.findByRole('button', { name: 'Share Friday Films' }), )` before continuing this async operation.
  await user.click(
    await screen.findByRole('button', { name: 'Share Friday Films' }),
  )
  // Keep `dialog` as the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
  let dialog = await screen.findByRole('dialog')
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    within(dialog).getByRole('button', { name: 'Sign In & Sync' }),
  ).toBeInTheDocument()
  // Wait for `user.keyboard('{Escape}')` before continuing this async operation.
  await user.keyboard('{Escape}')
  // Wait for `user.click(screen.getByRole('button', { name: 'Edit Friday Films' }))` before continuing this async operation.
  await user.click(screen.getByRole('button', { name: 'Edit Friday Films' }))
  // Update `dialog` using the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
  dialog = await screen.findByRole('dialog')
  // Wait for `user.clear( within(dialog).getByRole('textbox', { name: 'Collection name' }), )` before continuing this async operation.
  await user.clear(
    within(dialog).getByRole('textbox', { name: 'Collection name' }),
  )
  // Wait for `user.type( within(dialog).getByRole('textbox', { name: 'Collection name' }), 'Saturday Films', )` before continuing this async operation.
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Collection name' }),
    'Saturday Films',
  )
  // Wait for `user.click( within(dialog).getByRole('button', { name: 'Save Collection' }), )` before continuing this async operation.
  await user.click(
    within(dialog).getByRole('button', { name: 'Save Collection' }),
  )
  // Wait for `user.click( await screen.findByRole('button', { name: 'Edit Saturday Films' }), )` before continuing this async operation.
  await user.click(
    await screen.findByRole('button', { name: 'Edit Saturday Films' }),
  )
  // Update `dialog` using the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
  dialog = await screen.findByRole('dialog')
  // Wait for `user.click( within(dialog).getByRole('button', { name: 'Delete Collection' }), )` before continuing this async operation.
  await user.click(
    within(dialog).getByRole('button', { name: 'Delete Collection' }),
  )
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    screen.getByRole('dialog', { name: 'Delete this collection?' }),
  ).toBeInTheDocument()
  // Wait for `user.click( within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete Collection', }), )` before continuing this async operation.
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      // Set the `name` field to the text `'Delete Collection'`.
      name: 'Delete Collection',
    }),
  )
  // Wait for `waitFor(() => expect(store.getState().guest.collections).toHaveLength(0), )` before continuing this async operation.
  await waitFor(() =>
    expect(store.getState().guest.collections).toHaveLength(0),
  )
})
// Exercise the behavior described by this test name.
it('navigates guest discovery, saves a title, persists and reopens the library', async () => {
  // Keep `user` as the result returned by `userEvent.setup` with these arguments.
  const user = userEvent.setup()
  // Call `app` with the arguments below to perform this step.
  app()
  // Wait for `user.click( await screen.findByRole('button', { name: 'Continue as Guest' }), )` before continuing this async operation.
  await user.click(
    await screen.findByRole('button', { name: 'Continue as Guest' }),
  )
  // Wait for `screen.findByRole('heading', { name: 'What are we watching tonight?' })` before continuing this async operation.
  await screen.findByRole('heading', { name: 'What are we watching tonight?' })
  // Keep `buttons` as the completed result of `screen.findAllByRole('button', { name: 'Save to Watchlist: Dune: Part Two', })`; await pauses this async function until the promise settles.
  const buttons = await screen.findAllByRole('button', {
    // Set the `name` field to the text `'Save to Watchlist: Dune: Part Two'`.
    name: 'Save to Watchlist: Dune: Part Two',
  })
  // Wait for `user.click(buttons[0])` before continuing this async operation.
  await user.click(buttons[0])
  // Wait for `waitFor(() => expect(readLibrary().saved).toHaveLength(1))` before continuing this async operation.
  await waitFor(() => expect(readLibrary().saved).toHaveLength(1))
  // Wait for `user.click(screen.getByRole('link', { name: 'My Library' }))` before continuing this async operation.
  await user.click(screen.getByRole('link', { name: 'My Library' }))
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    await screen.findByRole('heading', { name: 'Dune: Part Two' }),
  ).toBeInTheDocument()
  // Assert this expected result; a mismatch causes the test to fail.
  expect(store.getState().guest.saved[0].title.tmdb_id).toBe(693134)
})
// Exercise the behavior described by this test name.
it('opens trailer queue, navigates titles and closes with Escape', async () => {
  // Keep `user` as the result returned by `userEvent.setup` with these arguments.
  const user = userEvent.setup()
  // Call `app` with the arguments below to perform this step.
  app('/discover')
  // Wait for `screen.findAllByRole('heading', { name: 'Dune: Part Two' })` before continuing this async operation.
  await screen.findAllByRole('heading', { name: 'Dune: Part Two' })
  // Wait for `user.click( ( await screen.findAllByRole('button', { name: 'Watch trailer for Dune: Part Two', }) )[0], )` before continuing this async operation.
  await user.click(
    (
      await screen.findAllByRole('button', {
        // Set the `name` field to the text `'Watch trailer for Dune: Part Two'`.
        name: 'Watch trailer for Dune: Part Two',
      })
    )[0],
  )
  // Keep `dialog` as the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
  const dialog = await screen.findByRole('dialog')
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    await within(dialog).findByTitle(/Dune: Part Two — Official trailer/),
  ).toBeInTheDocument()
  // Wait for `user.click(within(dialog).getByRole('button', { name: 'Next Title' }))` before continuing this async operation.
  await user.click(within(dialog).getByRole('button', { name: 'Next Title' }))
  // Wait for `waitFor(() => expect( within(screen.getByRole('dialog')).getByRole('heading', { name: 'Past Lives', }), ).t...` before continuing this async operation.
  await waitFor(() =>
    expect(
      within(screen.getByRole('dialog')).getByRole('heading', {
        // Set the `name` field to the text `'Past Lives'`.
        name: 'Past Lives',
      }),
    ).toBeInTheDocument(),
  )
  // Assert this expected result; a mismatch causes the test to fail.
  expect(await screen.findByText('No trailer available')).toBeInTheDocument()
  // Wait for `user.keyboard('{Escape}')` before continuing this async operation.
  await user.keyboard('{Escape}')
  // Wait for `waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), )` before continuing this async operation.
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  // Assert this expected result; a mismatch causes the test to fail.
  expect(screen.queryByTitle(/Official trailer/)).not.toBeInTheDocument()
})
// Exercise the behavior described by this test name.
it('creates two collections and saves one title to both', async () => {
  // Keep `user` as the result returned by `userEvent.setup` with these arguments.
  const user = userEvent.setup()
  // Call `app` with the arguments below to perform this step.
  app('/library')
  // Visit each item in `['Weekend Picks', 'Space Stories']` using `const name`.
  for (const name of ['Weekend Picks', 'Space Stories']) {
    // Wait for `user.click(screen.getByRole('button', { name: 'Create Collection' }))` before continuing this async operation.
    await user.click(screen.getByRole('button', { name: 'Create Collection' }))
    // Keep `dialog` as the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
    const dialog = await screen.findByRole('dialog')
    // Wait for `user.type( within(dialog).getByRole('textbox', { name: 'Collection name' }), name, )` before continuing this async operation.
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Collection name' }),
      name,
    )
    // Wait for `user.click( within(dialog).getByRole('button', { name: 'Save Collection' }), )` before continuing this async operation.
    await user.click(
      within(dialog).getByRole('button', { name: 'Save Collection' }),
    )
    // Wait for `waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), )` before continuing this async operation.
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  }
  // Send `setSave(titles[0])` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setSave(titles[0]))
  // Keep `dialog` as the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
  const dialog = await screen.findByRole('dialog')
  // Wait for `user.click( within(dialog).getByRole('checkbox', { name: /Weekend Picks/ }), )` before continuing this async operation.
  await user.click(
    within(dialog).getByRole('checkbox', { name: /Weekend Picks/ }),
  )
  // Wait for `user.click( within(dialog).getByRole('checkbox', { name: /Space Stories/ }), )` before continuing this async operation.
  await user.click(
    within(dialog).getByRole('checkbox', { name: /Space Stories/ }),
  )
  // Wait for `user.click( within(dialog).getByRole('button', { name: 'Save Selections' }), )` before continuing this async operation.
  await user.click(
    within(dialog).getByRole('button', { name: 'Save Selections' }),
  )
  // Wait for `waitFor(() => expect( store.getState().guest.collections.every((c) => c.items.length === 1), ).toBe(true), )` before continuing this async operation.
  await waitFor(() =>
    expect(
      store.getState().guest.collections.every((c) => c.items.length === 1),
    ).toBe(true),
  )
  // Assert this expected result; a mismatch causes the test to fail.
  expect(readLibrary().saved).toHaveLength(1)
})
// Exercise the behavior described by this test name.
it('supports mock authentication and explicit guest sync', async () => {
  // Keep `user` as the result returned by `userEvent.setup` with these arguments.
  const user = userEvent.setup()
  // Call `app` with the arguments below to perform this step.
  app('/discover')
  // Wait for `user.click( ( await screen.findAllByRole('button', { name: 'Save to Watchlist: Dune: Part Two', }) )[0], )` before continuing this async operation.
  await user.click(
    (
      await screen.findAllByRole('button', {
        // Set the `name` field to the text `'Save to Watchlist: Dune: Part Two'`.
        name: 'Save to Watchlist: Dune: Part Two',
      })
    )[0],
  )
  // Wait for `user.click(screen.getByRole('button', { name: 'Sign In' }))` before continuing this async operation.
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
  // Keep `dialog` as the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
  let dialog = await screen.findByRole('dialog')
  // Wait for `user.type( within(dialog).getByRole('textbox', { name: 'Email' }), 'viewer@example.com', )` before continuing this async operation.
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Email' }),
    'viewer@example.com',
  )
  // Wait for `user.type( within(dialog).getByLabelText('Password'), 'demo-password-2026', )` before continuing this async operation.
  await user.type(
    within(dialog).getByLabelText('Password'),
    'demo-password-2026',
  )
  // Wait for `user.click(within(dialog).getByRole('button', { name: 'Sign In' }))` before continuing this async operation.
  await user.click(within(dialog).getByRole('button', { name: 'Sign In' }))
  // Update `dialog` using the completed result of `screen.findByRole('dialog', { name: 'Bring your movies with you?', })`; await pauses this async function until the promise settles.
  dialog = await screen.findByRole('dialog', {
    // Set the `name` field to the text `'Bring your movies with you?'`.
    name: 'Bring your movies with you?',
  })
  // Assert this expected result; a mismatch causes the test to fail.
  expect(store.getState().guest.saved).toHaveLength(1)
  // Wait for `user.click( within(dialog).getByRole('button', { name: 'Sync My Library' }), )` before continuing this async operation.
  await user.click(
    within(dialog).getByRole('button', { name: 'Sync My Library' }),
  )
  // Wait for `within(dialog).findByText(/1 titles imported/)` before continuing this async operation.
  await within(dialog).findByText(/1 titles imported/)
  // Assert this expected result; a mismatch causes the test to fail.
  expect(store.getState().guest.saved).toHaveLength(0)
  // Keep `request` as the result returned by `store.dispatch` with these arguments.
  const request = store.dispatch(api.endpoints.library.initiate({}))
  // Assert this expected result; a mismatch causes the test to fail.
  expect((await request.unwrap()).results).toHaveLength(1)
  // Release this manual RTK Query subscription when it is no longer needed.
  request.unsubscribe()
})
// Exercise the behavior described by this test name.
it('renders a public preview and rejects a revoked or invalid link', async () => {
  // Call `app` with the arguments below to perform this step.
  app('/shared/demo')
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    await screen.findByRole('heading', { name: 'Weekend Sci-Fi' }),
  ).toBeInTheDocument()
  // Wait for `screen.findByRole('heading', { name: 'Dune: Part Two' })` before continuing this async operation.
  await screen.findByRole('heading', { name: 'Dune: Part Two' })
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    screen.queryByRole('button', { name: /Save to Watchlist/ }),
  ).not.toBeInTheDocument()
  // Keep `request` as the result returned by `store.dispatch` with these arguments.
  const request = store.dispatch(
    api.endpoints.shared.initiate({ token: 'invalid' }),
  )
  // Wait for `expect(request.unwrap()).rejects.toMatchObject({ status: 404 })` before continuing this async operation.
  await expect(request.unwrap()).rejects.toMatchObject({ status: 404 })
  // Release this manual RTK Query subscription when it is no longer needed.
  request.unsubscribe()
})
// Exercise the behavior described by this test name.
it('uses immutable snapshots and restarts expired snapshot requests', async () => {
  // Keep `first` as the result returned by `store.dispatch` with these arguments.
  const first = store.dispatch(api.endpoints.titles.initiate({ page_size: 2 }))
  // Keep `data` as the completed result of `first.unwrap()`; await pauses this async function until the promise settles.
  const data = await first.unwrap()
  // Assert this expected result; a mismatch causes the test to fail.
  expect(data.results).toHaveLength(2)
  // Assert this expected result; a mismatch causes the test to fail.
  expect(data.next).toContain('snapshot=')
  // Keep `second` as the result returned by `store.dispatch` with these arguments.
  const second = store.dispatch(
    api.endpoints.titles.initiate({
      // The maximum number of results requested per page.
      page_size: 2,
      // Set the `page` field to the number 2.
      page: 2,
      // The server token retaining the same selection across pages.
      snapshot: data.meta.snapshot,
    }),
  )
  // Assert this expected result; a mismatch causes the test to fail.
  expect((await second.unwrap()).results[0].title).not.toBe(
    data.results[0].title,
  )
  // Keep `expired` as the result returned by `store.dispatch` with these arguments.
  const expired = store.dispatch(
    api.endpoints.titles.initiate({
      // The maximum number of results requested per page.
      page_size: 2,
      // Set the `page` field to the number 2.
      page: 2,
      // The server token retaining the same selection across pages.
      snapshot: crypto.randomUUID(),
    }),
  )
  // Wait for `expect(expired.unwrap()).rejects.toMatchObject({ status: 410 })` before continuing this async operation.
  await expect(expired.unwrap()).rejects.toMatchObject({ status: 410 })
  // Release this manual RTK Query subscription when it is no longer needed.
  first.unsubscribe()
  // Release this manual RTK Query subscription when it is no longer needed.
  second.unsubscribe()
  // Release this manual RTK Query subscription when it is no longer needed.
  expired.unsubscribe()
})
// Exercise the behavior described by this test name.
it('applies multi-genre filters, search and mood recommendations through mock requests', async () => {
  // Keep `user` as the result returned by `userEvent.setup` with these arguments.
  const user = userEvent.setup()
  // Call `app` with the arguments below to perform this step.
  app('/discover')
  // Wait for `screen.findAllByRole('heading', { name: 'Dune: Part Two' })` before continuing this async operation.
  await screen.findAllByRole('heading', { name: 'Dune: Part Two' })
  // Wait for `user.click(screen.getByRole('button', { name: 'Animation' }))` before continuing this async operation.
  await user.click(screen.getByRole('button', { name: 'Animation' }))
  // Wait for `user.click(screen.getByRole('button', { name: 'Family' }))` before continuing this async operation.
  await user.click(screen.getByRole('button', { name: 'Family' }))
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    await screen.findByRole('heading', { name: 'The Boy and the Heron' }),
  ).toBeInTheDocument()
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    screen.queryByRole('heading', { name: 'Dune: Part Two' }),
  ).not.toBeInTheDocument()
  // Wait for `user.click(screen.getByRole('button', { name: 'Find by Mood' }))` before continuing this async operation.
  await user.click(screen.getByRole('button', { name: 'Find by Mood' }))
  // Keep `dialog` as the completed result of `screen.findByRole('dialog')`; await pauses this async function until the promise settles.
  const dialog = await screen.findByRole('dialog')
  // Wait for `user.click(within(dialog).getByRole('button', { name: 'Family Night' }))` before continuing this async operation.
  await user.click(within(dialog).getByRole('button', { name: 'Family Night' }))
  // Wait for `waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), )` before continuing this async operation.
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  // Wait for `screen.findByRole('heading', { name: 'Picked for you' })` before continuing this async operation.
  await screen.findByRole('heading', { name: 'Picked for you' })
  // Wait for `user.click(screen.getByRole('button', { name: 'Reset filters' }))` before continuing this async operation.
  await user.click(screen.getByRole('button', { name: 'Reset filters' }))
  // Wait for `user.type( screen.getByRole('textbox', { name: 'Search titles or people' }), 'Arrival', )` before continuing this async operation.
  await user.type(
    screen.getByRole('textbox', { name: 'Search titles or people' }),
    'Arrival',
  )
  // Wait for `waitFor(() => expect( screen.queryByRole('heading', { name: 'Dune: Part Two' }), ).not.toBeInTheDocument(), )` before continuing this async operation.
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Dune: Part Two' }),
    ).not.toBeInTheDocument(),
  )
  // Assert this expected result; a mismatch causes the test to fail.
  expect(
    await screen.findByRole('heading', { name: 'Arrival' }),
  ).toBeInTheDocument()
})
// Exercise the behavior described by this test name.
it('keeps sharing read-only, revokes links and safely replays a sync job', async () => {
  // Keep `login` as the result returned by `store.dispatch` with these arguments.
  const login = store.dispatch(
    api.endpoints.login.initiate({
      // Set the `email` field to the text `'demo@example.com'`.
      email: 'demo@example.com',
      // Set the `password` field to the text `'demo-password'`.
      password: 'demo-password',
    }),
  )
  // Keep `auth` as the completed result of `login.unwrap()`; await pauses this async function until the promise settles.
  const auth = await login.unwrap()
  // Send `setUser(auth.user)` to Redux so its matching reducer/middleware can process it.
  store.dispatch(setUser(auth.user))
  // Keep `creation` as the result returned by `store.dispatch` with these arguments.
  const creation = store.dispatch(
    api.endpoints.createCollection.initiate({ name: 'Weekend' }),
  )
  // Keep `collection` as the completed result of `creation.unwrap()`; await pauses this async function until the promise settles.
  const collection = await creation.unwrap()
  // Wait for `store .dispatch( api.endpoints.membership.initiate({ id: collection.id, title: titles[0], }), ) .unwrap()` before continuing this async operation.
  await store
    .dispatch(
      api.endpoints.membership.initiate({
        // Set the `id` field to the value read from `collection.id`.
        id: collection.id,
        // The title record or display title used by this object.
        title: titles[0],
      }),
    )
    .unwrap()
  // Wait for `store .dispatch(api.endpoints.save.initiate({ title: titles[0], watched: true })) .unwrap()` before continuing this async operation.
  await store
    .dispatch(api.endpoints.save.initiate({ title: titles[0], watched: true }))
    .unwrap()
  // Keep `share` as the completed result of `store .dispatch( api.endpoints.sharing.initiate({ id: collection.id, enabled: true }), ) .unwrap()`; await pauses this async function until the promise settles.
  const share = await store
    .dispatch(
      api.endpoints.sharing.initiate({ id: collection.id, enabled: true }),
    )
    .unwrap()
  // Keep `token` as the result returned by `share!.url.split('/').at` with these arguments with a TypeScript shape assertion; the assertion adds no runtime validation.
  const token = share!.url.split('/').at(-1)!
  // Keep `publicData` as the completed result of `store .dispatch(api.endpoints.shared.initiate({ token })) .unwrap()`; await pauses this async function until the promise settles.
  const publicData = await store
    .dispatch(api.endpoints.shared.initiate({ token }))
    .unwrap()
  // Assert this expected result; a mismatch causes the test to fail.
  expect(Object.keys(publicData).sort()).toEqual(['items', 'name'])
  // Assert this expected result; a mismatch causes the test to fail.
  expect(publicData.items.results[0]).not.toHaveProperty('watched')
  // Wait for `store .dispatch( api.endpoints.sharing.initiate({ id: collection.id, enabled: false }), ) .unwrap()` before continuing this async operation.
  await store
    .dispatch(
      api.endpoints.sharing.initiate({ id: collection.id, enabled: false }),
    )
    .unwrap()
  // Wait for `expect( store .dispatch( api.endpoints.shared.initiate({ token }, { forceRefetch: true }), ) .unwrap(), ).r...` before continuing this async operation.
  await expect(
    store
      .dispatch(
        api.endpoints.shared.initiate({ token }, { forceRefetch: true }),
      )
      .unwrap(),
  ).rejects.toMatchObject({ status: 404 })
  // Keep `payload` as an object whose named fields are explained below.
  const payload = {
    // The stable ID used to recognize retries of the same guest import.
    sync_id: crypto.randomUUID(),
    // The identity of this browser guest library.
    guest_id: crypto.randomUUID(),
    // The saved-title entries included in the import request.
    saved_titles: [
      {
        // Whether the identity belongs to a movie or a TV series.
        media_type: 'movie' as const,
        // The numeric TMDB identifier, paired with media_type to identify a title.
        tmdb_id: 693134,
        // Whether this saved title has been marked watched.
        watched: false,
        // The time the title was added to saved titles.
        saved_at: new Date().toISOString(),
        // The time it was marked watched, or null when unwatched.
        watched_at: null,
      },
    ],
    // The collections belonging to this data object.
    collections: [],
  }
  // Keep `first` as the completed result of `store .dispatch(api.endpoints.sync.initiate(payload)) .unwrap()`; await pauses this async function until the promise settles.
  const first = await store
    .dispatch(api.endpoints.sync.initiate(payload))
    .unwrap()
  // Keep `replay` as the completed result of `store .dispatch(api.endpoints.sync.initiate(payload)) .unwrap()`; await pauses this async function until the promise settles.
  const replay = await store
    .dispatch(api.endpoints.sync.initiate(payload))
    .unwrap()
  // Assert this expected result; a mismatch causes the test to fail.
  expect(replay).toEqual(first)
  // Keep `saved` as the completed result of `store .dispatch(api.endpoints.library.initiate({}, { forceRefetch: true })) .unwrap()`; await pauses this async function until the promise settles.
  const saved = await store
    .dispatch(api.endpoints.library.initiate({}, { forceRefetch: true }))
    .unwrap()
  // Assert this expected result; a mismatch causes the test to fail.
  expect(saved.results[0].watched).toBe(true)
  // Wait for `expect( store .dispatch(api.endpoints.sync.initiate({ ...payload, saved_titles: [] })) .unwrap(), ).rejects...` before continuing this async operation.
  await expect(
    store
      .dispatch(api.endpoints.sync.initiate({ ...payload, saved_titles: [] }))
      .unwrap(),
  ).rejects.toMatchObject({ status: 409 })
})
