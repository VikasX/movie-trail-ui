/**
 * The Redux store is the shared in-memory state for this browser tab.
 * ui holds session/display choices. guest holds the guest library. api holds cached API results.
 * Components read and update this store through the typed hooks in src/hooks/redux.ts.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Redux Toolkit helpers for configuring stores and defining slice actions.
import { configureStore, type Middleware } from '@reduxjs/toolkit'
// Bring in the exported helpers/components from `@reduxjs/toolkit/query`.
import { setupListeners } from '@reduxjs/toolkit/query'
// Bring in the exported helpers/components from `@/services/base-api`.
import { baseApi } from '@/services/base-api'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import uiReducer from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/store/guest-slice`.
import guestReducer from '@/store/guest-slice'
import { setUser } from '@/store/ui-slice'
import { resetCsrf } from '@/services/base-api'
import type { User } from '@/types/models'

/** Clear private responses on identity changes and drop an expired session on any protected 401. */
const sessionBoundary: Middleware = (context) => (next) => (action) => {
  const previous = (context.getState() as { ui: { user: User | null } }).ui.user
  const result = next(action)
  if (setUser.match(action) && previous?.id !== action.payload?.id) {
    // Reset all cached responses so an account switch cannot reuse another account's private data.
    resetCsrf()
    context.dispatch(baseApi.util.resetApiState())
  } else if (
    previous &&
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    typeof action.type === 'string' &&
    action.type.startsWith('api/') &&
    action.type.endsWith('/rejected') &&
    'payload' in action &&
    (action.payload as { status?: unknown } | undefined)?.status === 401
  ) {
    context.dispatch(setUser(null))
  }
  return result
}

// Combine the reducers into one state object. Each key becomes a property such as state.ui or state.guest.
// Keep `store` as the result returned by `configureStore` with these arguments.
export const store = configureStore({
  // Authentication request actions can contain passwords. Do not publish production actions to DevTools.
  devTools: import.meta.env.DEV,
  // The functions responsible for updating each Redux state branch.
  reducer: {
    // The reducer/state branch for session display and open-dialog choices.
    ui: uiReducer,
    // The reducer/state branch for the browser guest library.
    guest: guestReducer,
    // Set the `[baseApi.reducerPath]` field to the value read from `baseApi.reducer`.
    [baseApi.reducerPath]: baseApi.reducer,
  },
  // RTK Query middleware runs the request/cache lifecycle alongside the normal Redux middleware.
  // The request-processing layer installed alongside Redux reducers.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sessionBoundary, baseApi.middleware),
})

// Install RTK Query browser event listeners. Individual queries can opt into focus/reconnect refetching.
// Call `setupListeners` with the arguments below to perform this step.
setupListeners(store.dispatch)

// Infer these types from the configured store so callers stay in sync when a slice is added.
// Define `RootState` as a compile-time type alias for the shape below; it creates no runtime object.
export type RootState = ReturnType<typeof store.getState>
// Define `AppDispatch` as a compile-time type alias for the shape below; it creates no runtime object.
export type AppDispatch = typeof store.dispatch
