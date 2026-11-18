/**
 * A slice groups related Redux state and the actions that update it.
 * This slice tracks the signed-in user view and open dialogs, including the trailer queue.
 * null means a dialog is closed. An action payload supplies the value to store.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Redux Toolkit helpers for configuring stores and defining slice actions.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
// Bring in compile-time types from `@/types/models`.
import type { Title, User, Collection } from '@/types/models'
// Define `AuthView` as a compile-time type alias for the shape below; it creates no runtime object.
export type AuthView = 'login' | 'register' | 'forgot'
// Describe the fields allowed on `UiState`; TypeScript checks callers against this shape.
interface UiState {
  // The user object controls the visible account state. Django/browser cookies establish the actual session.
  // The `user` field used by this data shape. Its type is `User | null`.
  user: User | null
  // queue is the ordered list of titles. index chooses the current title. next can point to another discovery page.
  // The `trailer` field used by this data shape. Its type is `{ queue: Title[]; index: number; next?: string | null } | null`.
  trailer: { queue: Title[]; index: number; next?: string | null } | null
  // The `auth` field used by this data shape. Its type is `AuthView | null`.
  auth: AuthView | null
  // new opens an empty collection form. A collection object opens editing for that existing collection.
  // The `collection` field used by this data shape. Its type is `Collection | null | 'new'`.
  collection: Collection | null | 'new'
  // The `save` field used by this data shape. Its type is `Title | null`.
  save: Title | null
  // The `share` field used by this data shape. Its type is `Collection | null`.
  share: Collection | null
  // The `sync` field used by this data shape. Its type is `boolean`.
  sync: boolean
}
// These are the values in a fresh Redux store before session restoration or any user interaction.
// Keep `initialState` as an object whose named fields are explained below.
const initialState: UiState = {
  // Set the `user` field to null, representing the absence of a value.
  user: null,
  // Set the `trailer` field to null, representing the absence of a value.
  trailer: null,
  // Set the `auth` field to null, representing the absence of a value.
  auth: null,
  // Set the `collection` field to null, representing the absence of a value.
  collection: null,
  // Set the `save` field to null, representing the absence of a value.
  save: null,
  // Set the `share` field to null, representing the absence of a value.
  share: null,
  // Set the `sync` field to the boolean false.
  sync: false,
}
// Redux Toolkit uses Immer so the reducer bodies can write draft fields with assignment syntax.
// Keep `slice` as the result returned by `createSlice` with these arguments.
const slice = createSlice({
  // Set the `name` field to the text `'ui'`.
  name: 'ui',
  // Use the existing `initialState` variable as the field with the same name.
  initialState,
  // The slice action handlers that update Immer draft state.
  reducers: {
    // Store the public user profile after session checks or login. Passing null switches the visible app to guest mode.
    setUser(s, a: PayloadAction<User | null>) {
      // Update `s.user` using the value read from `a.payload`.
      s.user = a.payload
    },
    // Replacing this value changes the selected trailer. Passing null closes the overlay.
    openTrailer(
      s,
      a: PayloadAction<{
        // The `queue` field used by this data shape. Its type is `Title[]`.
        queue: Title[]
        // The `index` field used by this data shape. Its type is `number`.
        index: number
        // The next page address, or null when this is the last page. The ? makes this field optional. Its type is `string | null`.
        next?: string | null
      } | null>,
    ) {
      // Update `s.trailer` using the value read from `a.payload`.
      s.trailer = a.payload
    },
    // Choose login, register, or forgot. AuthDialog reads this value to select its form.
    setAuth(s, a: PayloadAction<AuthView | null>) {
      // Update `s.auth` using the value read from `a.payload`.
      s.auth = a.payload
    },
    // Select the create/edit collection dialog.
    setCollection(s, a: PayloadAction<UiState['collection']>) {
      // Update `s.collection` using the value read from `a.payload`.
      s.collection = a.payload
    },
    // Choose the title shown in the multi-collection save dialog.
    setSave(s, a: PayloadAction<Title | null>) {
      // Update `s.save` using the value read from `a.payload`.
      s.save = a.payload
    },
    // Choose the collection whose public sharing settings should be shown.
    setShare(s, a: PayloadAction<Collection | null>) {
      // Update `s.share` using the value read from `a.payload`.
      s.share = a.payload
    },
    // Control the explicit guest-to-account import prompt.
    setSync(s, a: PayloadAction<boolean>) {
      // Update `s.sync` using the value read from `a.payload`.
      s.sync = a.payload
    },
  },
})
// Export the generated action creators for components, and the reducer for store/index.ts.
// Keep `{ setUser, openTrailer, setAuth, setCollection, setSave, setShare, setSync, }` as the value read from `slice.actions`.
export const {
  setUser,
  openTrailer,
  setAuth,
  setCollection,
  setSave,
  setShare,
  setSync,
} = slice.actions
export default slice.reducer
