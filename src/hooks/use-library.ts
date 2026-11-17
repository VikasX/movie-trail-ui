import { useAppDispatch, useAppSelector } from './redux'
import { api } from '@/services/api'
import { replaceGuest } from '@/store/guest-slice'
import {
  persistLibrary,
  saveTitle,
  removeTitle,
  automaticCollections,
} from '@/features/guest/storage'
import {
  titleKey,
  type Title,
  type Collection,
  type LocalCollection,
  type LibraryData,
} from '@/types/models'
import { toast } from 'sonner'
import { store } from '@/store'

export function useLibrary() {
  const dispatch = useAppDispatch(),
    user = useAppSelector((s) => s.ui.user),
    guest = useAppSelector((s) => s.guest)
  const library = api.useLibraryQuery({}, { skip: !user }),
    collections = api.useCollectionsQuery({}, { skip: !user })
  const [saveRemote] = api.useSaveMutation(),
    [removeRemote] = api.useUnsaveMutation(),
    [member] = api.useMembershipMutation()
  const saved = user ? library.data?.results || [] : guest.saved
  const groups: Collection[] = user
    ? collections.data?.results || []
    : [...guest.collections, ...automaticCollections(guest.saved)]
  const update = (fn: (data: LibraryData) => void) => {
    const draft = structuredClone(store.getState().guest)
    fn(draft)
    persistLibrary(draft)
    dispatch(replaceGuest(draft))
  }
  const perform = async (
    fn: () => Promise<unknown> | void,
    message?: string,
  ) => {
    try {
      await fn()
      if (message) toast.success(message)
    } catch (e) {
      toast.error(errorMessage(e))
      throw e
    }
  }
  const save = (t: Title, watched?: boolean) =>
    perform(
      async () => {
        if (user)
          await saveRemote({
            title: t,
            watched:
              watched ??
              saved.find((s) => titleKey(s.title) === titleKey(t))?.watched ??
              false,
          }).unwrap()
        else update((d) => saveTitle(d, t, watched))
      },
      watched === undefined
        ? 'Added to Watchlist'
        : watched
          ? 'Marked as Watched'
          : 'Marked as Unwatched',
    )
  const remove = (t: Title) =>
    perform(async () => {
      if (user) await removeRemote(t).unwrap()
      else update((d) => removeTitle(d, t))
    }, 'Removed from Watchlist')
  const membership = async (c: Collection, t: Title, remove = false) => {
    if (c.kind !== 'custom')
      throw new Error('Automatic collections are read-only.')
    if (user) await member({ id: c.id, title: t, remove }).unwrap()
    else
      update((d) => {
        const group = d.collections.find((x) => x.id === c.id)
        if (!group) return
        if (remove)
          group.items = group.items.filter((i) => titleKey(i) !== titleKey(t))
        else {
          saveTitle(d, t)
          if (!group.items.some((i) => titleKey(i) === titleKey(t)))
            group.items.push({ media_type: t.media_type, tmdb_id: t.tmdb_id })
        }
        group.item_count = group.items.length
        group.updated_at = new Date().toISOString()
      })
  }
  return {
    user,
    guest,
    saved,
    groups,
    update,
    save,
    remove,
    membership,
    isLoading: user && library.isLoading,
    error: library.error || collections.error,
    retry: () => {
      void library.refetch()
      void collections.refetch()
    },
    localGroup: (id: string) =>
      [...guest.collections, ...automaticCollections(guest.saved)].find(
        (c) => c.id === id,
      ) as LocalCollection | undefined,
  }
}
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'data' in e) {
    const data = e.data as { error?: { message?: string } }
    if (data?.error?.message) return data.error.message
  }
  return 'Something went wrong. Please try again.'
}
