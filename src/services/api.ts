import { baseApi } from './base-api'
import { fetchComplete, fetchCollection } from './pagination'
import {
  titleKey,
  titlePath,
  type Schema,
  type TitleRef,
  type Filters,
} from '@/types/models'
export function queryString(params: Record<string, unknown>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (
      v !== undefined &&
      v !== null &&
      v !== '' &&
      (!Array.isArray(v) || v.length)
    )
      q.set(k, Array.isArray(v) ? v.join(',') : String(v))
  })
  return q.toString()
}
const pageParams = (page = 1, snapshot?: string) =>
  queryString({ page, page_size: 100, snapshot })
export const api = baseApi.injectEndpoints({
  endpoints: (b) => ({
    metadata: b.query<Schema['Metadata'], void>({ query: () => 'metadata/' }),
    titles: b.query<Schema['TitlePage'], Filters>({
      query: (p) => 'titles/?' + queryString(p),
    }),
    people: b.query<Schema['PersonPage'], string>({
      query: (q) => 'people/?' + queryString({ q }),
    }),
    details: b.query<Schema['TitleDetails'], TitleRef>({
      query: (t) => 'titles/' + titlePath(t) + '/',
      providesTags: (_r, _e, t) => [{ type: 'Title', id: titleKey(t) }],
    }),
    recommend: b.mutation<
      Schema['RecommendationResult'],
      Schema['RecommendationInput']
    >({ query: (body) => ({ url: 'recommendations/', method: 'POST', body }) }),
    me: b.query<Schema['User'], void>({
      query: () => 'me/',
      providesTags: ['User'],
    }),
    updateMe: b.mutation<Schema['User'], Schema['UserPatch']>({
      query: (body) => ({ url: 'me/', method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),
    login: b.mutation<Schema['AuthResult'], Schema['Login']>({
      query: (body) => ({ url: 'auth/login/', method: 'POST', body }),
      invalidatesTags: ['User', 'Library', 'Collections', 'Recent'],
    }),
    logout: b.mutation<void, void>({
      query: () => ({ url: 'auth/logout/', method: 'POST' }),
      invalidatesTags: ['User', 'Library', 'Collections', 'Recent'],
    }),
    register: b.mutation<Schema['Message'], Schema['Register']>({
      query: (body) => ({ url: 'auth/register/', method: 'POST', body }),
    }),
    authAction: b.mutation<
      Schema['Message'],
      { path: string; body: Record<string, string> }
    >({
      query: ({ path, body }) => ({
        url: 'auth/' + path + '/',
        method: 'POST',
        body,
      }),
    }),
    oauth: b.mutation<
      { authorization_url: string },
      { provider: 'google'; return_to: '/discover' | '/library' }
    >({
      query: (body) => ({ url: 'auth/oauth/start/', method: 'POST', body }),
    }),
    library: b.query<
      Schema['SavedTitlePage'],
      { page?: number; snapshot?: string }
    >({
      queryFn: (_p, _api, _extra, fetchPage) =>
        fetchComplete<Schema['SavedTitle']>('me/library/', fetchPage),
      providesTags: ['Library'],
    }),
    save: b.mutation<
      Schema['SavedTitle'],
      { title: TitleRef; watched: boolean }
    >({
      query: ({ title, watched }) => ({
        url: 'me/library/' + titlePath(title) + '/',
        method: 'PUT',
        body: { watched },
      }),
      invalidatesTags: ['Library', 'Collections'],
    }),
    unsave: b.mutation<void, TitleRef>({
      query: (t) => ({
        url: 'me/library/' + titlePath(t) + '/',
        method: 'DELETE',
      }),
      invalidatesTags: ['Library', 'Collections'],
    }),
    recent: b.query<Schema['RecentTitlePage'], void>({
      query: () => 'me/recent/?page_size=50',
      providesTags: ['Recent'],
    }),
    explore: b.mutation<Schema['RecentTitle'], TitleRef>({
      query: (t) => ({ url: 'me/recent/' + titlePath(t) + '/', method: 'PUT' }),
      invalidatesTags: ['Recent'],
    }),
    collections: b.query<
      Schema['CollectionPage'],
      { page?: number; snapshot?: string }
    >({
      queryFn: (_p, _api, _extra, fetchPage) =>
        fetchComplete<Schema['Collection']>('me/collections/', fetchPage),
      providesTags: ['Collections'],
    }),
    collection: b.query<
      Schema['CollectionDetail'],
      { id: string; page?: number; snapshot?: string }
    >({
      queryFn: (p, _api, _extra, fetchPage) =>
        fetchCollection(
          'me/collections/' + encodeURIComponent(p.id) + '/',
          fetchPage,
        ),
      providesTags: ['Collections'],
    }),
    createCollection: b.mutation<
      Schema['Collection'],
      Schema['CollectionInput']
    >({
      query: (body) => ({ url: 'me/collections/', method: 'POST', body }),
      invalidatesTags: ['Collections'],
    }),
    editCollection: b.mutation<
      Schema['Collection'],
      { id: string; name: string }
    >({
      query: ({ id, name }) => ({
        url: 'me/collections/' + id + '/',
        method: 'PATCH',
        body: { name },
      }),
      invalidatesTags: ['Collections'],
    }),
    deleteCollection: b.mutation<void, string>({
      query: (id) => ({ url: 'me/collections/' + id + '/', method: 'DELETE' }),
      invalidatesTags: ['Collections', 'Public'],
    }),
    membership: b.mutation<
      unknown,
      { id: string; title: TitleRef; remove?: boolean }
    >({
      query: ({ id, title, remove }) => ({
        url: 'me/collections/' + id + '/items/' + titlePath(title) + '/',
        method: remove ? 'DELETE' : 'PUT',
      }),
      invalidatesTags: ['Library', 'Collections'],
    }),
    sharing: b.mutation<
      Schema['Share'] | void,
      { id: string; enabled: boolean }
    >({
      query: ({ id, enabled }) => ({
        url: 'me/collections/' + id + '/sharing/',
        method: enabled ? 'PUT' : 'DELETE',
      }),
      invalidatesTags: ['Collections', 'Public'],
    }),
    shared: b.query<
      Schema['PublicCollection'],
      { token: string; page?: number; snapshot?: string }
    >({
      query: (p) => ({
        url:
          'shared/' +
          encodeURIComponent(p.token) +
          '/?' +
          pageParams(p.page, p.snapshot),
        credentials: 'omit',
      }),
      providesTags: ['Public'],
    }),
    sync: b.mutation<Schema['SyncResult'], Schema['SyncInput']>({
      query: (body) => ({ url: 'me/guest-sync/', method: 'POST', body }),
      invalidatesTags: ['Library', 'Collections'],
    }),
  }),
})
