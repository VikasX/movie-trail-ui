/**
 * The frontend catalogue of Django API operations.
 * A query reads data. A mutation sends a deliberate change or recommendation request.
 * RTK Query creates hooks such as useTitlesQuery and useSaveMutation from these definitions.
 * All endpoint paths here are relative to the base URL in base-api.ts.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `./base-api`.
import { baseApi } from './base-api'
// Bring in the exported helpers/components from `./pagination`.
import { fetchComplete, fetchCollection } from './pagination'
// Bring in the exported helpers/components from `@/types/models`.
import {
  titleKey,
  titlePath,
  type Schema,
  type TitleRef,
  type Filters,
} from '@/types/models'
/** Encode nonempty filter values for a URL. Genre arrays become comma-separated text. */
export function queryString(
  /* The URL query parameters to read. */ params: Record<string, unknown>,
) {
  // Keep `q` as an editable set of URL query parameters copied from the supplied input.
  const q = new URLSearchParams()
  // Run this callback once for every item in `Object.entries(params)`.
  Object.entries(params).forEach(([k, v]) => {
    // Take this branch only when `v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length)` is truthy.
    if (
      v !== undefined &&
      v !== null &&
      v !== '' &&
      (!Array.isArray(v) || v.length)
    )
      // Assign the supplied value under key `k` in `q`.
      q.set(k, Array.isArray(v) ? v.join(',') : String(v))
  })
  // Return the result returned by `q.toString` with these arguments to the caller.
  return q.toString()
}
// Keep `pageParams` as a callback that runs when it is called.
const pageParams = (page = 1, snapshot?: string) =>
  queryString({ page, page_size: 100, snapshot })
// b.query<ResponseType, ArgumentType> describes what comes back and what the caller supplies.
// providesTags labels cached reads. invalidatesTags tells subscribed reads to refresh after a change.
// Keep `api` as the result returned by `baseApi.injectEndpoints` with these arguments.
export const api = baseApi.injectEndpoints({
  // Set the `endpoints` field to a callback that runs when it is called.
  endpoints: (b) => ({
    // Read the supported filter choices and attribution. useMetadataQuery is used by Discover.
    // Set the `metadata` field to the result returned by `b.query` with these arguments.
    metadata: b.query<Schema['Metadata'], void>({ query: () => 'metadata/' }),
    // Read one discovery/search/feed page. The argument becomes the query string and the cache key.
    // Set the `titles` field to the result returned by `b.query` with these arguments.
    titles: b.query<Schema['TitlePage'], Filters>({
      // Build the endpoint address and request options from the caller input.
      query: (p) => 'titles/?' + queryString(p),
    }),
    // Resolve typed actor/director names into IDs the titles endpoint can filter by.
    // Set the `people` field to the result returned by `b.query` with these arguments.
    people: b.query<Schema['PersonPage'], string>({
      // Build the endpoint address and request options from the caller input.
      query: (q) => 'people/?' + queryString({ q }),
    }),
    // Read one movie/TV detail response. Its cache tag includes both parts of the title identity.
    // Set the `details` field to the result returned by `b.query` with these arguments.
    details: b.query<Schema['TitleDetails'], TitleRef>({
      // Build the endpoint address and request options from the caller input.
      query: (t) => 'titles/' + titlePath(t) + '/',
      // Label these cached results so related changes can refresh them.
      providesTags: (_r, _e, t) => [{ type: 'Title', id: titleKey(t) }],
    }),
    // POST a mood or surprise request and receive suggestions. This read-like feature uses a mutation because the API requires POST.
    // Set the `recommend` field to the result returned by `b.mutation` with these arguments.
    recommend: b.mutation<
      Schema['RecommendationResult'],
      Schema['RecommendationInput']
    >({ query: (body) => ({ url: 'recommendations/', method: 'POST', body }) }),
    // Read the current session user. User-tag invalidation makes the session view refresh after account operations.
    // Set the `me` field to the result returned by `b.query` with these arguments.
    me: b.query<Schema['User'], void>({
      // Build the endpoint address and request options from the caller input.
      query: () => 'me/',
      // Label these cached results so related changes can refresh them.
      providesTags: ['User'],
    }),
    // PATCH the profile fields allowed by the contract and refresh the User-tagged session query.
    // Set the `updateMe` field to the result returned by `b.mutation` with these arguments.
    updateMe: b.mutation<Schema['User'], Schema['UserPatch']>({
      // Build the endpoint address and request options from the caller input.
      query: (body) => ({ url: 'me/', method: 'PATCH', body }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['User'],
    }),
    // Submit email credentials. The base query includes CSRF and remembers the rotated token returned on success.
    // Set the `login` field to the result returned by `b.mutation` with these arguments.
    login: b.mutation<Schema['AuthResult'], Schema['Login']>({
      // Build the endpoint address and request options from the caller input.
      query: (body) => ({ url: 'auth/login/', method: 'POST', body }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['User', 'Library', 'Collections', 'Recent'],
    }),
    // Ask Django to end the session. Session/library/collection caches are invalidated afterward.
    // Set the `logout` field to the result returned by `b.mutation` with these arguments.
    logout: b.mutation<void, void>({
      // Build the endpoint address and request options from the caller input.
      query: () => ({ url: 'auth/logout/', method: 'POST' }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['User', 'Library', 'Collections', 'Recent'],
    }),
    // Request registration and an email verification message. The response is a message rather than a logged-in user.
    // Set the `register` field to the result returned by `b.mutation` with these arguments.
    register: b.mutation<Schema['Message'], Schema['Register']>({
      // Build the endpoint address and request options from the caller input.
      query: (body) => ({ url: 'auth/register/', method: 'POST', body }),
    }),
    // Reuse the message-response POST pattern for email verification and password recovery paths.
    // Set the `authAction` field to the result returned by `b.mutation` with these arguments.
    authAction: b.mutation<
      Schema['Message'],
      { path: string; body: Record<string, string> }
    >({
      // Build the endpoint address and request options from the caller input.
      query: ({ path, body }) => ({
        // Set the `url` field to the expression `'auth/' + path + '/'`.
        url: 'auth/' + path + '/',
        // The HTTP operation used by this request.
        method: 'POST',
        // Use the existing `body` variable as the field with the same name.
        body,
      }),
    }),
    // Start server-managed Google OAuth and receive the URL that the browser should visit.
    // Set the `oauth` field to the result returned by `b.mutation` with these arguments.
    oauth: b.mutation<
      { authorization_url: string },
      { provider: 'google'; return_to: '/discover' | '/library' }
    >({
      // Build the endpoint address and request options from the caller input.
      query: (body) => ({ url: 'auth/oauth/start/', method: 'POST', body }),
    }),
    // Collect all private saved-title pages so cards can accurately look up account saved/watched status.
    // Set the `library` field to the result returned by `b.query` with these arguments.
    library: b.query<
      Schema['SavedTitlePage'],
      { page?: number; snapshot?: string }
    >({
      // Use custom request logic to combine data before returning one endpoint result.
      queryFn: (_p, _api, _extra, fetchPage) =>
        fetchComplete<Schema['SavedTitle']>('me/library/', fetchPage),
      // Label these cached results so related changes can refresh them.
      providesTags: ['Library'],
    }),
    // PUT saved/watched state for one composite title. Refresh library and collection views after the change.
    // Set the `save` field to the result returned by `b.mutation` with these arguments.
    save: b.mutation<
      Schema['SavedTitle'],
      { title: TitleRef; watched: boolean }
    >({
      // Build the endpoint address and request options from the caller input.
      query: ({ title, watched }) => ({
        // Set the `url` field to the expression `'me/library/' + titlePath(title) + '/'`.
        url: 'me/library/' + titlePath(title) + '/',
        // The HTTP operation used by this request.
        method: 'PUT',
        // The JSON request content sent to the backend.
        body: { watched },
      }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Library', 'Collections'],
    }),
    // DELETE the saved title. Backend membership cleanup is reflected by invalidating library and collection caches.
    // Set the `unsave` field to the result returned by `b.mutation` with these arguments.
    unsave: b.mutation<void, TitleRef>({
      // Build the endpoint address and request options from the caller input.
      query: (t) => ({
        // Set the `url` field to the expression `'me/library/' + titlePath(t) + '/'`.
        url: 'me/library/' + titlePath(t) + '/',
        // The HTTP operation used by this request.
        method: 'DELETE',
      }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Library', 'Collections'],
    }),
    // Read the signed-in user exploration history. Guests read their own browser history instead.
    // Recently explored titles, maintained separately from saved titles.
    recent: b.query<Schema['RecentTitlePage'], void>({
      // Build the endpoint address and request options from the caller input.
      query: () => 'me/recent/?page_size=50',
      // Label these cached results so related changes can refresh them.
      providesTags: ['Recent'],
    }),
    // Record a deliberate details/trailer opening using an explicit PUT, then refresh recent activity.
    // Set the `explore` field to the result returned by `b.mutation` with these arguments.
    explore: b.mutation<Schema['RecentTitle'], TitleRef>({
      // Build the endpoint address and request options from the caller input.
      query: (t) => ({ url: 'me/recent/' + titlePath(t) + '/', method: 'PUT' }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Recent'],
    }),
    // Collect all custom and computed account collection summaries.
    // The collections belonging to this data object.
    collections: b.query<
      Schema['CollectionPage'],
      { page?: number; snapshot?: string }
    >({
      // Use custom request logic to combine data before returning one endpoint result.
      queryFn: (_p, _api, _extra, fetchPage) =>
        fetchComplete<Schema['Collection']>('me/collections/', fetchPage),
      // Label these cached results so related changes can refresh them.
      providesTags: ['Collections'],
    }),
    // Collect the items for one owned collection. encodeURIComponent safely places the ID into one URL path segment.
    // Set the `collection` field to the result returned by `b.query` with these arguments.
    collection: b.query<
      Schema['CollectionDetail'],
      { id: string; page?: number; snapshot?: string }
    >({
      // Use custom request logic to combine data before returning one endpoint result.
      queryFn: (p, _api, _extra, fetchPage) =>
        fetchCollection(
          'me/collections/' + encodeURIComponent(p.id) + '/',
          fetchPage,
        ),
      // Label these cached results so related changes can refresh them.
      providesTags: ['Collections'],
    }),
    // POST the validated name of a new custom account collection, then refresh the collection list.
    // Set the `createCollection` field to the result returned by `b.mutation` with these arguments.
    createCollection: b.mutation<
      Schema['Collection'],
      Schema['CollectionInput']
    >({
      // Build the endpoint address and request options from the caller input.
      query: (body) => ({ url: 'me/collections/', method: 'POST', body }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Collections'],
    }),
    // PATCH an existing custom collection name. The frontend contract currently has no account description field.
    // Set the `editCollection` field to the result returned by `b.mutation` with these arguments.
    editCollection: b.mutation<
      Schema['Collection'],
      { id: string; name: string }
    >({
      // Build the endpoint address and request options from the caller input.
      query: ({ id, name }) => ({
        // Set the `url` field to the expression `'me/collections/' + id + '/'`.
        url: 'me/collections/' + id + '/',
        // The HTTP operation used by this request.
        method: 'PATCH',
        // The JSON request content sent to the backend.
        body: { name },
      }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Collections'],
    }),
    // DELETE one custom collection and invalidate both private collection and public-share caches.
    // Set the `deleteCollection` field to the result returned by `b.mutation` with these arguments.
    deleteCollection: b.mutation<void, string>({
      // Build the endpoint address and request options from the caller input.
      query: (id) => ({ url: 'me/collections/' + id + '/', method: 'DELETE' }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Collections', 'Public'],
    }),
    // PUT adds or DELETE removes one title membership. Adding membership also saves the title on the backend.
    // Set the `membership` field to the result returned by `b.mutation` with these arguments.
    membership: b.mutation<
      unknown,
      { id: string; title: TitleRef; remove?: boolean }
    >({
      // Build the endpoint address and request options from the caller input.
      query: ({ id, title, remove }) => ({
        // Set the `url` field to the expression `'me/collections/' + id + '/items/' + titlePath(title) + '/'`.
        url: 'me/collections/' + id + '/items/' + titlePath(title) + '/',
        // The HTTP operation used by this request.
        method: remove ? 'DELETE' : 'PUT',
      }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Library', 'Collections'],
    }),
    // PUT enables a public capability link and DELETE revokes it. A DELETE success may have no body.
    // Set the `sharing` field to the result returned by `b.mutation` with these arguments.
    sharing: b.mutation<
      Schema['Share'] | void,
      { id: string; enabled: boolean }
    >({
      // Build the endpoint address and request options from the caller input.
      query: ({ id, enabled }) => ({
        // Set the `url` field to the expression `'me/collections/' + id + '/sharing/'`.
        url: 'me/collections/' + id + '/sharing/',
        // The HTTP operation used by this request.
        method: enabled ? 'PUT' : 'DELETE',
      }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Collections', 'Public'],
    }),
    // Read a public collection token with credentials omitted. The response excludes private owner/library fields.
    // Set the `shared` field to the result returned by `b.query` with these arguments.
    shared: b.query<
      Schema['PublicCollection'],
      { token: string; page?: number; snapshot?: string }
    >({
      // Build the endpoint address and request options from the caller input.
      query: (p) => ({
        // Set the `url` field to the expression `'shared/' + encodeURIComponent(p.token) + '/?' + pageParams(p.page, p.snapshot)`.
        url:
          'shared/' +
          encodeURIComponent(p.token) +
          '/?' +
          pageParams(p.page, p.snapshot),
        // The browser cookie policy for this request.
        credentials: 'omit',
      }),
      // Label these cached results so related changes can refresh them.
      providesTags: ['Public'],
    }),
    // POST the frozen guest import request. Successful imports refresh account library and collection queries.
    // Set the `sync` field to the result returned by `b.mutation` with these arguments.
    sync: b.mutation<Schema['SyncResult'], Schema['SyncInput']>({
      // Build the endpoint address and request options from the caller input.
      query: (body) => ({ url: 'me/guest-sync/', method: 'POST', body }),
      // Mark related cached reads for refresh after this operation.
      invalidatesTags: ['Library', 'Collections'],
    }),
  }),
})
