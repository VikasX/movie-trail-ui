export const config = {
  mock: import.meta.env.VITE_API_MODE !== 'live',
  apiBase: import.meta.env.VITE_API_BASE_URL || '/api/v1/',
  appOrigin: import.meta.env.VITE_APP_URL || window.location.origin,
}
