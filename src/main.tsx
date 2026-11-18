/**
 * The browser starts running CineScope here. index.html loads this file.
 * bootstrap starts the demo request interceptor when needed, then mounts React.
 * Provider shares the Redux store. BrowserRouter lets components use the current URL.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { StrictMode } from 'react'
// The React browser renderer that mounts the component tree.
import { createRoot } from 'react-dom/client'
// React bindings that make the Redux store available to components.
import { Provider } from 'react-redux'
// Routing tools for links, page matching, navigation, and URL values.
import { BrowserRouter } from 'react-router'
// Load these font files so the stylesheet can use the typeface.
import '@fontsource-variable/inter'
// Load these font files so the stylesheet can use the typeface.
import '@fontsource/outfit/400.css'
// Load these font files so the stylesheet can use the typeface.
import '@fontsource/outfit/500.css'
// Load these font files so the stylesheet can use the typeface.
import '@fontsource/outfit/600.css'
// Bring in the exported helpers/components from `@/App`.
import App from '@/App'
// Bring in the exported helpers/components from `@/store`.
import { store } from '@/store'
// Load the stylesheet into the Vite bundle.
import '@/app.css'

/** Wait for mock interception when needed, then start the React component tree. */
async function bootstrap() {
  // In mock mode, wait until MSW can answer requests. Otherwise the first API calls could reach a real server accidentally.
  // Take this branch only when `import.meta.env.VITE_API_MODE !== 'live'` is truthy.
  if (import.meta.env.VITE_API_MODE !== 'live') {
    // Keep `{ worker }` as the completed result of `import('@/mocks/browser')`; await pauses this async function until the promise settles.
    const { worker } = await import('@/mocks/browser')
    // Wait for `worker.start({ onUnhandledRequest: 'bypass', quiet: true })` before continuing this async operation.
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  }
  // Find the root div supplied by index.html. Everything inside the provider/router wrappers can use Redux and routing hooks.
  // Call `createRoot(document.getElementById('root')!).render` with the arguments below to perform this step.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* Share this one store with every component inside the wrapper. */}
      {/* Render the Provider component. */}
      <Provider store={store}>
        {/* Enable normal browser URLs for the application routes. */}
        {/* Render the BrowserRouter component. */}
        <BrowserRouter>
          {/* Render the App component. */}
          <App />
        </BrowserRouter>
      </Provider>
    </StrictMode>,
  )
}
// Catch startup failures before normal React error/loading screens are available.
// Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
void bootstrap().catch(() => {
  // Update `document.getElementById('root')!.textContent` using the text `'CineScope could not start. Refresh the page to try again.'`.
  document.getElementById('root')!.textContent =
    'CineScope could not start. Refresh the page to try again.'
})
