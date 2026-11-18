/**
 * Vite configuration used by the local dev server and production build.
 * The plugins compile React and Tailwind. The alias maps @ to src. Build options split React into a shared chunk.
 * The server proxy forwards local /api and /accounts requests. Vercel uses vercel.json after deployment.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `@vitejs/plugin-react`.
import react from '@vitejs/plugin-react'
// Bring in the exported helpers/components from `@tailwindcss/vite`.
import tailwindcss from '@tailwindcss/vite'
// Bring in the exported helpers/components from `node:url`.
import { fileURLToPath, URL } from 'node:url'
// Bring in the exported helpers/components from `vite`.
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Read this Vite mode's environment files. The empty prefix also exposes server-only API_PROXY_TARGET to this config.
  // Keep `env` as the result returned by `loadEnv` with these arguments.
  const env = loadEnv(mode, process.cwd(), '')
  // Keep `target` as `env.API_PROXY_TARGET`, falling back to the right-hand value when the left side is falsy.
  const target = env.API_PROXY_TARGET || 'http://localhost:8000'
  // Return an object whose named fields are explained below to the caller.
  return {
    // React handles TSX compilation. The Tailwind Vite plugin generates the utility CSS used by the UI.
    // The build plugins loaded by this configuration.
    plugins: [react(), tailwindcss()],
    // Let imports such as @/services/api resolve to the src directory. TypeScript has the corresponding paths setting.
    // Set the `resolve` field to an object whose named fields are explained below.
    resolve: {
      // The short import paths resolved to real directories.
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // Split common React code from feature chunks so browser caching and lazy page imports can reuse it.
    // Set the `build` field to an object whose named fields are explained below.
    build: {
      // Set the `rolldownOptions` field to an object whose named fields are explained below.
      rolldownOptions: {
        // Set the `output` field to an object whose named fields are explained below.
        output: {
          // Set the `codeSplitting` field to an object whose named fields are explained below.
          codeSplitting: {
            // Set the `groups` field to an array containing these ordered values.
            groups: [
              {
                // Set the `name` field to the text `'react'`.
                name: 'react',
                // Set the `test` field to the value read from `/node_modules[\\/](react|react-dom|scheduler)[\\/]/`.
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
            ],
          },
        },
      },
    },
    // These proxy rules apply while npm run dev is serving the app. Deployed proxy rules live in vercel.json.
    // Set the `server` field to an object whose named fields are explained below.
    server: {
      // Set the `proxy` field to an object whose named fields are explained below.
      proxy: {
        // Set the `'/api'` field to an object whose named fields are explained below.
        '/api': { target, changeOrigin: true },
        // Set the `'/accounts'` field to an object whose named fields are explained below.
        '/accounts': { target, changeOrigin: true },
      },
    },
  }
})
