import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { readLibrary } from '@/features/guest/storage'
import type { LibraryData } from '@/types/models'
const slice = createSlice({
  name: 'guest',
  initialState: readLibrary(),
  reducers: {
    replaceGuest: (_state, action: PayloadAction<LibraryData>) =>
      action.payload,
  },
})
export const { replaceGuest } = slice.actions
export default slice.reducer
