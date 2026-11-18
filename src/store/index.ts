/**
 * The Redux store is the shared in-memory state for this browser tab.
 * ui holds session/display choices. guest holds the guest library. api holds cached API results.
 * Components read and update this store through the typed hooks in src/hooks/redux.ts.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Redux Toolkit helpers for configuring stores and defining slice actions.
import { configureStore } from '@reduxjs/toolkit'
// Bring in the exported helpers/components from `@reduxjs/toolkit/query`.
import { setupListeners } from '@reduxjs/toolkit/query'
// Bring in the exported helpers/components from `@/services/base-api`.
import { baseApi } from '@/services/base-api'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import uiReducer from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/store/guest-slice`.
import guestReducer from '@/store/guest-slice'

// Combine the reducers into one state object. Each key becomes a property such as state.ui or state.guest.
// Keep `store` as the result returned by `configureStore` with these arguments.
export const store = configureStore({
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
    getDefaultMiddleware().concat(baseApi.middleware),
})

// Install RTK Query browser event listeners. Individual queries can opt into focus/reconnect refetching.
// Call `setupListeners` with the arguments below to perform this step.
setupListeners(store.dispatch)

// Infer these types from the configured store so callers stay in sync when a slice is added.
// Define `RootState` as a compile-time type alias for the shape below; it creates no runtime object.
export type RootState = ReturnType<typeof store.getState>
// Define `AppDispatch` as a compile-time type alias for the shape below; it creates no runtime object.
export type AppDispatch = typeof store.dispatch
