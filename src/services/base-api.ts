import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { config } from '@/lib/config'
const raw = fetchBaseQuery({ baseUrl: config.apiBase, credentials: 'include' })
let csrf: string | undefined
let csrfRequest: Promise<string | undefined> | undefined
const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  const request = typeof args === 'string' ? { url: args } : args
  const unsafe =
    request.method && !['GET', 'HEAD'].includes(request.method.toUpperCase())
  if (unsafe || request.url === 'me/') {
    if (!csrf) {
      csrfRequest ??= (async () => {
        const r = await raw('auth/csrf/', api, extra)
        return (r.data as { csrf_token?: string } | undefined)?.csrf_token
      })()
      csrf = await csrfRequest
      csrfRequest = undefined
    }
    if (unsafe)
      request.headers = { ...request.headers, 'X-CSRFToken': csrf || '' }
  }
  const result = await raw(request, api, extra)
  const token = (result.data as { csrf_token?: string } | undefined)?.csrf_token
  if (token) csrf = token
  if (request.url === 'auth/logout/' && !result.error) csrf = undefined
  return result
}
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Title', 'Library', 'Collections', 'Recent', 'User', 'Public'],
  endpoints: () => ({}),
})
export function resetCsrf() {
  csrf = undefined
}
