/**
 * This hook gives movie cards and library screens one set of library operations.
 * It chooses browser storage for guests and RTK Query mutations for signed-in users.
 * Reading this file together with features/guest/storage.ts explains saving and watched status.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `./redux`.
import { useAppDispatch, useAppSelector } from './redux'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/store/guest-slice`.
import { replaceGuest } from '@/store/guest-slice'
// Bring in the exported helpers/components from `@/features/guest/storage`.
import {
  persistLibrary,
  saveTitle,
  removeTitle,
  automaticCollections,
} from '@/features/guest/storage'
// Bring in the exported helpers/components from `@/types/models`.
import {
  titleKey,
  type Title,
  type Collection,
  type LocalCollection,
  type LibraryData,
} from '@/types/models'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in the exported helpers/components from `@/store`.
import { store } from '@/store'

/** Expose the current saved data and operations for either a guest or an account. */
export function useLibrary() {
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `user` as the Redux value selected by `(s) => s.ui.user`; React subscribes to changes in that selected value.
  // Keep `guest` as the Redux value selected by `(s) => s.guest`; React subscribes to changes in that selected value.
  const dispatch = useAppDispatch(),
    user = useAppSelector((s) => s.ui.user),
    guest = useAppSelector((s) => s.guest)
  // skip prevents private account queries when the current visitor is a guest.
  // Keep `library` as the RTK Query subscription from `api.useLibraryQuery`, including its cached data and loading/error state.
  // Keep `collections` as the RTK Query subscription from `api.useCollectionsQuery`, including its cached data and loading/error state.
  const library = api.useLibraryQuery({}, { skip: !user }),
    collections = api.useCollectionsQuery({}, { skip: !user })
  // Keep `[saveRemote]` as the RTK Query mutation tuple from `api.useSaveMutation`; its trigger sends a request when explicitly called.
  // Keep `[removeRemote]` as the RTK Query mutation tuple from `api.useUnsaveMutation`; its trigger sends a request when explicitly called.
  // Keep `[member]` as the RTK Query mutation tuple from `api.useMembershipMutation`; its trigger sends a request when explicitly called.
  const [saveRemote] = api.useSaveMutation(),
    [removeRemote] = api.useUnsaveMutation(),
    [member] = api.useMembershipMutation()
  // Choose one source for the visible library based on whether a user session has been restored.
  // Keep `saved` as a choice between two values based on `user`.
  const saved = user ? library.data?.results || [] : guest.saved
  // Keep `groups` as a choice between two values based on `user`.
  const groups: Collection[] = user
    ? collections.data?.results || []
    : [...guest.collections, ...automaticCollections(guest.saved)]
  // All guest writes pass through this helper. Read the latest store to retain earlier consecutive changes.
  // Keep `update` as a callback that runs when it is called.
  const update = (fn: (data: LibraryData) => void) => {
    // Clone the data so ordinary helper functions can change their own copy. Redux state itself stays protected.
    // Keep `draft` as a deep copy of `store.getState().guest`, allowing edits without mutating the original object.
    const draft = structuredClone(store.getState().guest)
    // Call `fn` with the arguments below to perform this step.
    fn(draft)
    // Write browser storage before publishing the new copy to React. A failed storage write is surfaced to the caller.
    // Call `persistLibrary` with the arguments below to perform this step.
    persistLibrary(draft)
    // Send `replaceGuest(draft)` to Redux so its matching reducer/middleware can process it.
    dispatch(replaceGuest(draft))
  }
  // Wrap an operation with its success/error toast and allow the caller to handle a rejected promise.
  // Keep `perform` as a callback that runs when it is called and returns a promise.
  const perform = async (
    fn: () => Promise<unknown> | void,
    message?: string,
  ) => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Wait for `fn()` before continuing this async operation.
      await fn()
      // Take this branch only when `message` is truthy.
      if (message) toast.success(message)
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
      // Stop this operation by throwing the following error to its caller or catch block.
      throw e
    }
  }
  // Use an account PUT for signed-in users, or saveTitle on the guest draft. The optional watched argument changes status.
  // Keep `save` as a callback that runs when it is called.
  const save = (t: Title, watched?: boolean) =>
    perform(
      async () => {
        // Take this branch only when `user` is truthy.
        if (user)
          // Wait for `saveRemote({ title: t, watched: watched ?? saved.find((s) => titleKey(s.title) === titleKey(t))?.watched ??...` before continuing this async operation.
          await saveRemote({
            // The title record or display title used by this object.
            title: t,
            // Whether this saved title has been marked watched.
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
  // An explicit remove also removes custom collection memberships through the chosen data source.
  // Keep `remove` as a callback that runs when it is called.
  const remove = (t: Title) =>
    perform(async () => {
      // Take this branch only when `user` is truthy.
      if (user) await removeRemote(t).unwrap()
      else update((d) => removeTitle(d, t))
    }, 'Removed from Watchlist')
  // Add or remove this one title in a custom collection. A title may belong to several collections.
  // Keep `membership` as a callback that runs when it is called and returns a promise.
  const membership = async (c: Collection, t: Title, remove = false) => {
    // Take this branch only when `c.kind !== 'custom'` is truthy.
    if (c.kind !== 'custom')
      // Stop this operation by throwing the following error to its caller or catch block.
      throw new Error('Automatic collections are read-only.')
    // Take this branch only when `user` is truthy.
    if (user) await member({ id: c.id, title: t, remove }).unwrap()
    else
      // Call `update` with the arguments below to perform this step.
      update((d) => {
        // Keep `group` as the first array item matching the predicate, or undefined when nothing matches.
        const group = d.collections.find((x) => x.id === c.id)
        // Take this branch only when `!group` is truthy.
        if (!group) return
        // Take this branch only when `remove` is truthy.
        if (remove)
          // Update `group.items` using an array containing only items that pass the predicate.
          group.items = group.items.filter((i) => titleKey(i) !== titleKey(t))
        else {
          // Call `saveTitle` with the arguments below to perform this step.
          saveTitle(d, t)
          // Take this branch only when `!group.items.some((i) => titleKey(i) === titleKey(t))` is truthy.
          if (!group.items.some((i) => titleKey(i) === titleKey(t)))
            // Append these values to the end of `group.items`.
            group.items.push({ media_type: t.media_type, tmdb_id: t.tmdb_id })
        }
        // Update `group.item_count` using the value read from `group.items.length`.
        group.item_count = group.items.length
        // Update `group.updated_at` using the result returned by `new Date().toISOString` with these arguments.
        group.updated_at = new Date().toISOString()
      })
  }
  // Expose data plus operations as one hook result for cards, pages, and dialogs to consume.
  // Return an object whose named fields are explained below to the caller.
  return {
    // Use the existing `user` variable as the field with the same name.
    user,
    // Use the existing `guest` variable as the field with the same name.
    guest,
    // Use the existing `saved` variable as the field with the same name.
    saved,
    // Use the existing `groups` variable as the field with the same name.
    groups,
    // Use the existing `update` variable as the field with the same name.
    update,
    // Use the existing `save` variable as the field with the same name.
    save,
    // Use the existing `remove` variable as the field with the same name.
    remove,
    // Use the existing `membership` variable as the field with the same name.
    membership,
    // Set the `isLoading` field to the right-hand expression only when `user` is truthy.
    isLoading: user && library.isLoading,
    // Set the `error` field to `library.error`, falling back to the right-hand value when the left side is falsy.
    error: library.error || collections.error,
    // Set the `retry` field to a callback that runs when it is called.
    retry: () => {
      // Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
      void library.refetch()
      // Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
      void collections.refetch()
    },
    // Set the `localGroup` field to a callback that runs when it is called.
    localGroup: (id: string) =>
      [...guest.collections, ...automaticCollections(guest.saved)].find(
        (c) => c.id === id,
      ) as LocalCollection | undefined,
  }
}
/** Read a useful message from a JavaScript exception or the Django error envelope. */
export function errorMessage(
  /* Input e used by this helper; its type describes the accepted values. */ e: unknown,
): string {
  // Take this branch only when `e instanceof Error` is truthy.
  // Only known local errors may be shown verbatim. Browser/storage/library exceptions can contain details.
  if (
    e instanceof Error &&
    /^(?:Your guest library|A collection already|Automatic collections|This collection link|This link is missing|Sign in could not be started)/.test(
      e.message,
    )
  )
    return e.message.slice(0, 200)
  // Take this branch only when `e && typeof e === 'object' && 'data' in e` is truthy.
  if (e && typeof e === 'object' && 'data' in e) {
    // Keep `data` as the value read from `e.data` with a TypeScript shape assertion; the assertion adds no runtime validation.
    const data = e.data as { error?: { code?: string } } | undefined
    // Take this branch only when `data?.error?.message` is truthy.
    const messages: Record<string, string> = {
      authentication_required: 'Please sign in to continue.',
      invalid_credentials:
        'Sign in could not be completed. Check your details and try again.',
      email_not_verified: 'Please verify your email before signing in.',
      validation_error: 'Please check the entered values and try again.',
      not_found: 'This item is unavailable or no longer shared.',
      snapshot_expired: 'This selection expired. Reload it to continue.',
      csrf_failed:
        'Your session needs refreshing. Reload the page and try again.',
      permission_denied:
        'This action could not be completed. Refresh your session and try again.',
      conflict:
        'This change conflicts with an existing record. Refresh and try again.',
      rate_limited: 'Too many requests. Please wait and try again.',
      service_unavailable:
        'This service is temporarily unavailable. Please try again later.',
      upstream_timeout: 'The request timed out. Please try again.',
      payload_too_large: 'This selection is too large to import.',
    }
    if (data?.error?.code && Object.hasOwn(messages, data.error.code))
      return messages[data.error.code]
  }
  if (e && typeof e === 'object' && 'status' in e) {
    if (e.status === 401) return 'Please sign in to continue.'
    if (e.status === 404) return 'This item is unavailable or no longer shared.'
    if (e.status === 403)
      return 'This action could not be completed. Refresh your session and try again.'
    if (e.status === 429) return 'Too many requests. Please wait and try again.'
  }
  // Return the text `'Something went wrong. Please try again.'` to the caller.
  return 'Something went wrong. Please try again.'
}
