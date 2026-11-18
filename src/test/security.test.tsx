/** Security regression tests exercise untrusted data and the real shared request/store code. */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { BaseQueryApi } from '@reduxjs/toolkit/query'
import {
  safeImageUrl,
  isYoutubeId,
  safeOAuthUrl,
  safeTmdbUrl,
  sameOriginApiBase,
  pageFromUrl,
  collectionPath,
  shareToken,
} from '@/lib/security'
import {
  emptyLibrary,
  GUEST_KEY,
  MAX_GUEST_BYTES,
  persistLibrary,
  readLibrary,
  readSyncJob,
  saveTitle,
  syncPayload,
} from '@/features/guest/storage'
import { store } from '@/store'
import { api } from '@/services/api'
import { baseQuery, resetCsrf } from '@/services/base-api'
import { setUser, setShare, setSync, openTrailer } from '@/store/ui-slice'
import { replaceGuest } from '@/store/guest-slice'
import { MovieCard } from '@/features/titles/movie-card'
import { TrailerModal } from '@/features/titles/trailer-modal'
import { titles } from '@/mocks/fixtures'
import { errorMessage } from '@/hooks/use-library'
import type { Schema, User } from '@/types/models'
import { z } from '@/lib/validation'
import { LibraryPage } from '@/features/library/library-page'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  store.dispatch(setUser(null))
  store.dispatch(setShare(null))
  store.dispatch(setSync(false))
  store.dispatch(openTrailer(null))
  store.dispatch(api.util.resetApiState())
  store.dispatch(replaceGuest(emptyLibrary()))
  localStorage.clear()
  sessionStorage.clear()
  resetCsrf()
})
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

const account = (id: number): User => ({
  id,
  email: 'viewer@example.com',
  display_name: 'Viewer',
  email_verified: true,
  providers: ['email'],
  preferences: { language: 'en-US', region: 'IN' },
})
function wrap(element: React.ReactNode) {
  return render(
    <Provider store={store}>
      <MemoryRouter>{element}</MemoryRouter>
    </Provider>,
  )
}
function context(): BaseQueryApi {
  return {
    signal: new AbortController().signal,
    abort() {},
    dispatch: store.dispatch,
    getState: store.getState,
    extra: undefined,
    endpoint: 'securityProbe',
    type: 'mutation',
  }
}

describe('URL destinations', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '//evil.example/track',
    'https://image.tmdb.org.evil.example/t/p/x',
    'https://image.tmdb.org@evil.example/t/p/x',
    'http://image.tmdb.org/t/p/x',
    'https://evil.example/poster.jpg',
    'not a url',
  ])('rejects unsafe images and availability links: %s', (value) => {
    expect(safeImageUrl(value)).toBeUndefined()
    expect(safeTmdbUrl(value)).toBeUndefined()
  })
  it('preserves legitimate TMDB and demo images and TMDB watch links', () => {
    expect(
      safeImageUrl('https://image.tmdb.org/t/p/w500/poster.jpg'),
    ).toContain('/w500/')
    expect(safeImageUrl(titles[0].poster_url)).toBeTruthy()
    expect(
      safeTmdbUrl('https://www.themoviedb.org/movie/550/watch?locale=IN'),
    ).toContain('/watch')
  })
  it.each([
    '../watch',
    'abcdefghij',
    'abcdefghijkl',
    'abc<script>',
    'https://youtube.com/watch?v=x',
    'abc_def-gh!',
  ])('rejects invalid video IDs: %s', (id) =>
    expect(isYoutubeId(id)).toBe(false),
  )
  it('accepts real YouTube IDs', () =>
    expect(isYoutubeId('dQw4w9WgXcQ')).toBe(true))
  it.each([
    'javascript:alert(1)',
    'https://accounts.google.com.evil.example/o/oauth2/v2/auth',
    'https://evil.example/',
    'https://accounts.google.com/url?q=evil',
    'http://accounts.google.com/o/oauth2/v2/auth',
    '/discover',
    '//evil.example/accounts/google/login/',
  ])('blocks an unsafe OAuth response: %s', (url) =>
    expect(
      safeOAuthUrl(url, 'https://movie-trail-ui.vercel.app'),
    ).toBeUndefined(),
  )
  it('allows Google authorization and the same-origin allauth entry', () => {
    expect(
      safeOAuthUrl(
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=public',
        'https://movie-trail-ui.vercel.app',
      ),
    ).toBeTruthy()
    expect(
      safeOAuthUrl(
        '/accounts/google/login/?process=login',
        'http://localhost:5173',
      ),
    ).toBe('http://localhost:5173/accounts/google/login/?process=login')
  })
  it('keeps the API same-origin despite an external environment setting', () => {
    expect(
      sameOriginApiBase('https://evil.example/api/v1/', 'https://app.example'),
    ).toBe('/api/v1/')
    expect(sameOriginApiBase('/api/v1/', 'https://app.example')).toBe(
      '/api/v1/',
    )
  })
  it('rejects malformed paging and path identities', () => {
    expect(
      pageFromUrl(
        'https://backend.example/api/v1/titles/?page=2&snapshot=frozen',
      ),
    ).toEqual({ page: 2, snapshot: 'frozen' })
    for (const url of [
      'javascript:alert(1)',
      'https://[invalid',
      '?page=-1',
      '?page=NaN',
      '?page=1.5',
    ])
      expect(pageFromUrl(url)).toBeUndefined()
    expect(() => collectionPath('../auth/logout')).toThrow()
    expect(shareToken('..')).toBe('invalid-token')
  })
})

describe('guest persistence and import isolation', () => {
  it('validates without dynamic Function compilation under the production CSP', () => {
    const compile = vi.spyOn(globalThis, 'Function')
    expect(z.config().jitless).toBe(true)
    expect(
      z.object({ name: z.string() }).safeParse({ name: 'Collection' }).success,
    ).toBe(true)
    expect(compile).not.toHaveBeenCalled()
  })
  it('recovers safely from corrupted, oversized, and structurally invalid browser data', () => {
    for (const raw of [
      '{bad json',
      'x'.repeat(MAX_GUEST_BYTES + 1),
      JSON.stringify({ ...emptyLibrary(), saved: new Array(501).fill({}) }),
    ]) {
      localStorage.setItem(GUEST_KEY, raw)
      expect(readLibrary().saved).toEqual([])
      expect(localStorage.getItem(GUEST_KEY)).toBe(raw)
    }
  })
  it('validates before persistence and strips unrelated credentials from stored records', () => {
    const data = { ...emptyLibrary(), password: 'not-a-real-password' }
    persistLibrary(data)
    expect(localStorage.getItem(GUEST_KEY)).not.toContain('password')
    const invalid = {
      ...emptyLibrary(),
      collections: [{ id: '../', name: 'bad' }],
    }
    expect(() =>
      persistLibrary(invalid as unknown as ReturnType<typeof emptyLibrary>),
    ).toThrow()
  })
  it('retains a valid frozen retry, rejects corrupted jobs and another account’s job', () => {
    const snapshot = emptyLibrary()
    saveTitle(snapshot, titles[0])
    const payload = syncPayload(snapshot)
    const raw = JSON.stringify({ owner: 1, snapshot, payload })
    expect(readSyncJob(raw, 1)?.payload.sync_id).toBe(payload.sync_id)
    expect(readSyncJob(raw, 2)).toBeUndefined()
    expect(readSyncJob('{bad', 1)).toBeUndefined()
    expect(
      readSyncJob(
        JSON.stringify({
          owner: 1,
          snapshot,
          payload: { ...payload, saved_titles: [] },
        }),
        1,
      ),
    ).toBeUndefined()
  })
})

describe('request and session boundaries', () => {
  it('sends cookies and the bootstrapped CSRF header for a write while retaining caller headers', async () => {
    let seen: Request | undefined
    server.use(
      http.get('http://localhost/api/v1/auth/csrf/', () =>
        HttpResponse.json({ csrf_token: 'masked-test-token' }),
      ),
      http.post('http://localhost/api/v1/recommendations/', ({ request }) => {
        seen = request
        return HttpResponse.json({ results: [] })
      }),
    )
    const result = await baseQuery(
      {
        url: 'recommendations/',
        method: 'POST',
        headers: new Headers({ 'X-Probe': 'preserved' }),
        body: {},
      },
      context(),
      {},
    )
    expect(result.error).toBeUndefined()
    expect(seen?.credentials).toBe('include')
    expect(seen?.headers.get('X-CSRFToken')).toBe('masked-test-token')
    expect(seen?.headers.get('X-Probe')).toBe('preserved')
  })
  it('does not send a write when CSRF bootstrap fails', async () => {
    const post = vi.fn(() => HttpResponse.json({}))
    server.use(
      http.get('http://localhost/api/v1/auth/csrf/', () =>
        HttpResponse.json({}, { status: 503 }),
      ),
      http.post('http://localhost/api/v1/recommendations/', post),
    )
    expect(
      (
        await baseQuery(
          { url: 'recommendations/', method: 'POST' },
          context(),
          {},
        )
      ).error,
    ).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })
  it('rejects off-origin credentialed calls and omits cookies on public shares', async () => {
    expect(
      (await baseQuery('https://evil.example/api/v1/me/', context(), {})).error,
    ).toBeTruthy()
    let credentials: RequestCredentials | undefined
    server.use(
      http.get('http://localhost/api/v1/shared/demo/', ({ request }) => {
        credentials = request.credentials
        return HttpResponse.json({})
      }),
    )
    await baseQuery('shared/demo/', context(), {})
    expect(credentials).toBe('omit')
  })
  it('clears private cache/dialogs after a protected 401 without deleting guest saves', async () => {
    const guest = emptyLibrary()
    saveTitle(guest, titles[0])
    store.dispatch(replaceGuest(guest))
    store.dispatch(setUser(account(1)))
    await store.dispatch(
      api.util.upsertQueryData('recent', undefined, {
        results: [{ title: titles[0], explored_at: new Date().toISOString() }],
      } as Schema['RecentTitlePage']),
    )
    store.dispatch(setSync(true))
    server.use(
      http.get('http://localhost/api/v1/auth/csrf/', () =>
        HttpResponse.json({ csrf_token: 'test-token' }),
      ),
      http.patch('http://localhost/api/v1/me/', () =>
        HttpResponse.json(
          {
            error: {
              code: 'authentication_required',
              message: 'INTERNAL SECRET',
            },
          },
          { status: 401 },
        ),
      ),
    )
    await store
      .dispatch(api.endpoints.updateMe.initiate({ display_name: 'Viewer' }))
      .unwrap()
      .catch(() => {})
    expect(store.getState().ui.user).toBeNull()
    expect(store.getState().ui.sync).toBe(false)
    expect(store.getState().api.queries).toEqual({})
    expect(store.getState().guest.saved).toHaveLength(1)
  })
  it('drops cached account data when switching accounts', async () => {
    store.dispatch(setUser(account(1)))
    await store.dispatch(
      api.util.upsertQueryData('recent', undefined, {
        results: [],
      } as unknown as Schema['RecentTitlePage']),
    )
    store.dispatch(setUser(account(2)))
    expect(store.getState().api.queries).toEqual({})
  })
  it('replaces sensitive server/browser errors with safe local messages', () => {
    expect(
      errorMessage({
        status: 500,
        data: { error: { message: 'Traceback PASSWORD=secret' } },
      }),
    ).not.toContain('secret')
    expect(
      errorMessage({
        status: 401,
        data: {
          error: {
            code: 'authentication_required',
            message: 'internal details',
          },
        },
      }),
    ).toBe('Please sign in to continue.')
    expect(
      errorMessage(new Error('SQL server connection secret')),
    ).not.toContain('secret')
  })
})

describe('React text rendering and trailer sinks', () => {
  it('renders an untrusted guest collection name as text', () => {
    const guest = emptyLibrary()
    const name = '<img src=x onerror=alert(1)>'
    guest.collections.push({
      id: crypto.randomUUID(),
      name,
      description: '<script>attack()</script>',
      kind: 'custom',
      items: [],
      item_count: 0,
      sharing_enabled: false,
      share_url: null,
      created_at: null,
      updated_at: null,
    })
    store.dispatch(replaceGuest(guest))
    const view = wrap(<LibraryPage />)
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    expect(view.container.querySelector('img')).toBeNull()
    expect(view.container.querySelector('script')).toBeNull()
  })
  it('renders an untrusted title as text and uses a fallback for its unsafe poster', () => {
    const title = {
      ...titles[0],
      title: '<img src=x onerror=alert(1)>',
      poster_url: 'javascript:alert(1)',
    }
    const view = wrap(<MovieCard title={title} queue={[title]} />)
    expect(
      screen.getByRole('heading', { name: title.title }),
    ).toBeInTheDocument()
    expect(view.container.querySelector('img')).toBeNull()
    expect(view.container.querySelector('script')).toBeNull()
  })
  it.each([false, true])(
    'keeps descriptions as text and validates iframe/video/watch URLs (valid video = %s)',
    async (valid) => {
      const title = {
        ...titles[0],
        overview: '<script>window.stolen=true</script>',
      }
      const detail = {
        title,
        tagline: '',
        status: 'Released',
        number_of_seasons: null,
        number_of_episodes: null,
        cast: [],
        directors: [],
        creators: [],
        warnings: [],
        trailers: [
          {
            id: 'test',
            site: 'YouTube',
            youtube_key: valid ? 'dQw4w9WgXcQ' : '../malicious',
            name: 'Trailer',
          },
        ],
        selected_trailer_id: 'test',
        availability: {
          region: 'IN',
          status: 'available',
          link: 'javascript:alert(1)',
          flatrate: [],
          free: [],
          ads: [],
          rent: [],
          buy: [],
        },
      }
      server.use(
        http.get(
          `http://localhost/api/v1/titles/${title.media_type}/${title.tmdb_id}/`,
          () => HttpResponse.json(detail),
        ),
      )
      store.dispatch(openTrailer({ queue: [title], index: 0 }))
      const view = wrap(<TrailerModal />)
      await screen.findByText(title.overview)
      expect(view.container.querySelector('script')).toBeNull()
      expect(document.querySelector('a[href^="javascript:"]')).toBeNull()
      await waitFor(() =>
        expect(document.querySelectorAll('iframe')).toHaveLength(valid ? 1 : 0),
      )
      if (valid)
        expect(document.querySelector('iframe')?.src).toBe(
          'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
        )
    },
  )
})
