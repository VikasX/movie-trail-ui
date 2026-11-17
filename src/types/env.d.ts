interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_MODE?: 'mock' | 'live'
  readonly VITE_APP_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
