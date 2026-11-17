import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Title, User, Collection } from '@/types/models'
export type AuthView = 'login' | 'register' | 'forgot'
interface UiState {
  user: User | null
  trailer: { queue: Title[]; index: number; next?: string | null } | null
  auth: AuthView | null
  collection: Collection | null | 'new'
  save: Title | null
  share: Collection | null
  sync: boolean
}
const initialState: UiState = {
  user: null,
  trailer: null,
  auth: null,
  collection: null,
  save: null,
  share: null,
  sync: false,
}
const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setUser(s, a: PayloadAction<User | null>) {
      s.user = a.payload
    },
    openTrailer(
      s,
      a: PayloadAction<{
        queue: Title[]
        index: number
        next?: string | null
      } | null>,
    ) {
      s.trailer = a.payload
    },
    setAuth(s, a: PayloadAction<AuthView | null>) {
      s.auth = a.payload
    },
    setCollection(s, a: PayloadAction<UiState['collection']>) {
      s.collection = a.payload
    },
    setSave(s, a: PayloadAction<Title | null>) {
      s.save = a.payload
    },
    setShare(s, a: PayloadAction<Collection | null>) {
      s.share = a.payload
    },
    setSync(s, a: PayloadAction<boolean>) {
      s.sync = a.payload
    },
  },
})
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
