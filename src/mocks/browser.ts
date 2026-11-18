/**
 * The browser entry point for the demo API interceptor.
 * main.tsx dynamically imports this file in mock mode and starts the worker before React mounts.
 * The registered handlers describe the responses; public/mockServiceWorker.js performs interception.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `msw/browser`.
import { setupWorker } from 'msw/browser'
// Bring in the exported helpers/components from `./handlers`.
import { handlers } from './handlers'
// Keep `worker` as the result returned by `setupWorker` with these arguments.
export const worker = setupWorker(...handlers)
