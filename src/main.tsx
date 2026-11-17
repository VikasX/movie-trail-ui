import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/inter'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import App from '@/App'
import { store } from '@/store'
import '@/app.css'

async function bootstrap() {
  if (import.meta.env.VITE_API_MODE !== 'live') {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </StrictMode>,
  )
}
void bootstrap().catch(() => {
  document.getElementById('root')!.textContent =
    'CineScope could not start. Refresh the page to try again.'
})
