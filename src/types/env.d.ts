/**
 * Editor and TypeScript declarations for our public Vite environment variables.
 * These declarations describe available names. The actual values come from environment configuration.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Describe the fields allowed on `ImportMetaEnv`; TypeScript checks callers against this shape.
interface ImportMetaEnv {
  // The `VITE_API_BASE_URL` field used by this data shape. The ? makes this field optional. Its type is `string`.
  readonly VITE_API_BASE_URL?: string
  // The `VITE_API_MODE` field used by this data shape. The ? makes this field optional. Its type is `'mock' | 'live'`.
  readonly VITE_API_MODE?: 'mock' | 'live'
  // The `VITE_APP_URL` field used by this data shape. The ? makes this field optional. Its type is `string`.
  readonly VITE_APP_URL?: string
}
// Describe the fields allowed on `ImportMeta`; TypeScript checks callers against this shape.
interface ImportMeta {
  // The `env` field used by this data shape. Its type is `ImportMetaEnv`.
  readonly env: ImportMetaEnv
}
