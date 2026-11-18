/**
 * This slice is the React-visible copy of the guest library.
 * Startup reads the saved browser data. replaceGuest publishes a complete updated copy.
 * The storage service and useLibrary hook handle persistence before dispatching this action.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Redux Toolkit helpers for configuring stores and defining slice actions.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
// Bring in the exported helpers/components from `@/features/guest/storage`.
import { readLibrary } from '@/features/guest/storage'
// Bring in compile-time types from `@/types/models`.
import type { LibraryData } from '@/types/models'
// Keep `slice` as the result returned by `createSlice` with these arguments.
const slice = createSlice({
  // Set the `name` field to the text `'guest'`.
  name: 'guest',
  // Read localStorage once while this module initializes the guest slice.
  // The slice values used when the store first starts.
  initialState: readLibrary(),
  // The slice action handlers that update Immer draft state.
  reducers: {
    // Receive an already-prepared library copy and replace the visible guest state in one action.
    // Set the `replaceGuest` field to a callback that runs when it is called.
    replaceGuest: (_state, action: PayloadAction<LibraryData>) =>
      action.payload,
  },
})
// Keep `{ replaceGuest }` as the value read from `slice.actions`.
export const { replaceGuest } = slice.actions
export default slice.reducer
