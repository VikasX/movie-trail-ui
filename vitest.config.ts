/**
 * Configuration for running our automated tests.
 * jsdom supplies a simulated browser. The test API origin makes Node fetch requests absolute.
 * The React plugin and @ alias match how application source is imported.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `vitest/config`.
import { defineConfig } from 'vitest/config'
// Bring in the exported helpers/components from `@vitejs/plugin-react`.
import react from '@vitejs/plugin-react'
// Bring in the exported helpers/components from `node:url`.
import { fileURLToPath, URL } from 'node:url'
export default defineConfig({
  // The build plugins loaded by this configuration.
  plugins: [react()],
  // Set the `resolve` field to an object whose named fields are explained below.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Set the `test` field to an object whose named fields are explained below.
  test: {
    // Run component tests with a simulated document/window, even though Vitest itself runs in Node.
    // Set the `environment` field to the text `'jsdom'`.
    environment: 'jsdom',
    // Install shared DOM assertions and browser substitutes before each test module runs.
    // Set the `setupFiles` field to an array containing these ordered values.
    setupFiles: ['./src/test/setup.ts'],
    // Set the `include` field to an array containing these ordered values.
    include: ['src/**/*.test.{ts,tsx}'],
    // Set the `testTimeout` field to the number 20000.
    testTimeout: 20000,
    // Node fetch needs an absolute test API origin. MSW intercepts these requests during the test journeys.
    // Set the `env` field to an object whose named fields are explained below.
    env: { VITE_API_BASE_URL: 'http://localhost/api/v1/' },
  },
})
