import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  showReadyStatus: boolean
}

const initialState: UiState = { showReadyStatus: true }

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setShowReadyStatus(state, action: PayloadAction<boolean>) {
      state.showReadyStatus = action.payload
    },
  },
})

export const { setShowReadyStatus } = uiSlice.actions
export default uiSlice.reducer
