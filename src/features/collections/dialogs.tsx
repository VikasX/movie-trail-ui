/**
 * All collection-management dialogs and the guest import prompt live here.
 * CollectionDialogs reads Redux to choose the dialog. Each smaller component performs one user operation.
 * Forms validate input, library/API helpers change data, and Sonner displays the result.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useState, useEffect } from 'react'
// Routing tools for links, page matching, navigation, and URL values.
import { useNavigate } from 'react-router'
// Form field registration, validation state, and submission helpers.
import { useForm } from 'react-hook-form'
// The adapter connecting Zod rules to React Hook Form.
import { zodResolver } from '@hookform/resolvers/zod'
// Runtime schemas that validate values rather than relying only on TypeScript.
import { z } from '@/lib/validation'
// SVG icon components used by the controls and headings below.
import { Copy, Plus, CloudUpload } from 'lucide-react'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in the exported helpers/components from `@/components/ui/modal`.
import { Modal } from '@/components/ui/modal'
// Bring in the exported helpers/components from `@/features/titles/movie-card`.
import { Poster } from '@/features/titles/movie-card'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { useLibrary, errorMessage } from '@/hooks/use-library'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import {
  setCollection,
  setSave,
  setShare,
  setAuth,
  setSync,
} from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/store/guest-slice`.
import { replaceGuest } from '@/store/guest-slice'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/features/guest/storage`.
import {
  persistLibrary,
  readLibrary,
  reconcileSync,
  syncPayload,
  readSyncJob,
} from '@/features/guest/storage'
// Bring in the exported helpers/components from `@/types/models`.
import {
  titleKey,
  type Collection,
  type Title,
  type Schema,
  type LibraryData,
} from '@/types/models'
// Bring in the exported helpers/components from `@/lib/config`.
import { config } from '@/lib/config'
import { store } from '@/store'

/** Read the Redux dialog fields and mount the corresponding collection or sync form. */
export function CollectionDialogs() {
  // Keep `ui` as the Redux value selected by `(s) => s.ui`; React subscribes to changes in that selected value.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  const ui = useAppSelector((s) => s.ui),
    dispatch = useAppDispatch()
  return (
    <>
      {/* Render the right-hand content only when `ui.collection` is truthy. */}
      {ui.collection && (
        <CollectionDialog
          key={
            /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ typeof ui.collection ===
            'string'
              ? 'new'
              : ui.collection.id
          }
          collection={ui.collection === 'new' ? undefined : ui.collection}
          close={
            /* The child invokes this callback to close its parent-controlled dialog. */ () =>
              dispatch(setCollection(null))
          }
        />
      )}
      {/* Render the right-hand content only when `ui.save` is truthy. */}
      {ui.save && (
        <SaveDialog
          key={
            /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ titleKey(
              ui.save,
            )
          }
          title={
            /* Pass the title record or heading expected by this component. */ ui.save
          }
          close={
            /* The child invokes this callback to close its parent-controlled dialog. */ () =>
              dispatch(setSave(null))
          }
        />
      )}
      {/* Render the right-hand content only when `ui.share` is truthy. */}
      {ui.share && (
        <ShareDialog
          collection={ui.share}
          close={
            /* The child invokes this callback to close its parent-controlled dialog. */ () =>
              dispatch(setShare(null))
          }
        />
      )}
      {/* Render the right-hand content only when `ui.sync` is truthy. */}
      {ui.sync && (
        <GuestSyncDialog
          close={
            /* The child invokes this callback to close its parent-controlled dialog. */ () =>
              dispatch(setSync(false))
          }
        />
      )}
    </>
  )
}
/** Validate and save a collection name, or show the explicit delete confirmation. */
function CollectionDialog(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    collection,
    close,
  }: {
    // The `collection` field used by this data shape. The ? makes this field optional. Its type is `Collection`.
    collection?: Collection
    // The `close` field used by this data shape. Its type is `() => void`.
    close: () => void
  },
) {
  // Keep `library` as the shared library adapter, exposing guest/account data and save/collection operations.
  // Keep `navigate` as the router function used to open another frontend route.
  const library = useLibrary(),
    navigate = useNavigate()
  // Keep `[create]` as the RTK Query mutation tuple from `api.useCreateCollectionMutation`; its trigger sends a request when explicitly called.
  // Keep `[edit]` as the RTK Query mutation tuple from `api.useEditCollectionMutation`; its trigger sends a request when explicitly called.
  // Keep `[remove]` as the RTK Query mutation tuple from `api.useDeleteCollectionMutation`; its trigger sends a request when explicitly called.
  const [create] = api.useCreateCollectionMutation(),
    [edit] = api.useEditCollectionMutation(),
    [remove] = api.useDeleteCollectionMutation()
  // The edit dialog switches to a confirmation view before deletion. pending prevents repeated delete clicks.
  // Keep `[confirm, setConfirm]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  // Keep `[pending, setPending]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false)
  // Validate the collection fields before running the local or account save branch.
  // Keep `form` as the result returned by `useForm` with these arguments.
  const form = useForm({
    // Connect form validation to the schema before submission.
    resolver: zodResolver(
      z.object({
        // Set the `name` field to the Zod validation rule `z.string().trim().min(1, 'Give your collection a name.').max(80)`.
        name: z.string().trim().min(1, 'Give your collection a name.').max(80),
        // The descriptive text associated with this value.
        description: z.string().max(500),
      }),
    ),
    // The initial values assigned to the form fields.
    defaultValues: {
      // Set the `name` field to `collection?.name`, falling back to the right-hand value when the left side is falsy.
      name: collection?.name || '',
      // The descriptive text associated with this value.
      description: collection
        ? library.localGroup(collection.id)?.description || ''
        : '',
    },
  })
  // Send only supported account fields. Guest descriptions stay in browser storage.
  // Keep `submit` as the result returned by `form.handleSubmit` with these arguments.
  const submit = form.handleSubmit(async (values) => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Take this branch only when `library.user` is truthy.
      if (library.user) {
        // Take this branch only when `collection` is truthy.
        if (collection)
          // Wait for `edit({ id: collection.id, name: values.name }).unwrap()` before continuing this async operation.
          await edit({ id: collection.id, name: values.name }).unwrap()
        else await create({ name: values.name }).unwrap()
      } else {
        // Take this branch only when `!collection && library.guest.collections.length >= 20` is truthy.
        if (!collection && library.guest.collections.length >= 20)
          // Stop this operation by throwing the following error to its caller or catch block.
          throw new Error(
            'Your guest library has reached 20 collections. Sign in and sync to create more.',
          )
        // Take this branch only when `library.guest.collections.some( (c) => c.id !== collection?.id && c.name.toLowerCase() === values.name.toLo...` is truthy.
        if (
          library.guest.collections.some(
            (c) =>
              c.id !== collection?.id &&
              c.name.toLowerCase() === values.name.toLowerCase(),
          )
        )
          // Stop this operation by throwing the following error to its caller or catch block.
          throw new Error('A collection already has that name.')
        // Call `library.update` with the arguments below to perform this step.
        library.update((d) => {
          // Take this branch only when `collection` is truthy.
          if (collection) {
            // Keep `c` as the first array item matching the predicate, or undefined when nothing matches.
            const c = d.collections.find((c) => c.id === collection.id)
            // Take this branch only when `c` is truthy.
            if (c) {
              // Update `c.name` using the value read from `values.name`.
              c.name = values.name
              // Update `c.description` using the value read from `values.description`.
              c.description = values.description
              // Update `c.updated_at` using the result returned by `new Date().toISOString` with these arguments.
              c.updated_at = new Date().toISOString()
            }
          } else
            // Insert this record at the start of `d.collections` so it appears first.
            d.collections.unshift({
              // Set the `id` field to the result returned by `crypto.randomUUID` with these arguments.
              id: crypto.randomUUID(),
              // The collection kind, distinguishing editable custom groups from computed automatic groups.
              kind: 'custom',
              // Set the `name` field to the value read from `values.name`.
              name: values.name,
              // The descriptive text associated with this value.
              description: values.description,
              // The member records contained in this group or paginated response.
              items: [],
              // The number of members reported for this collection.
              item_count: 0,
              // The record creation time.
              created_at: new Date().toISOString(),
              // The most recent record-update time.
              updated_at: new Date().toISOString(),
              // Whether this collection currently has public sharing enabled.
              sharing_enabled: false,
              // The public link, or null when no link is available.
              share_url: null,
            })
        })
      }
      // Show the user this success toast message.
      toast.success(collection ? 'Collection updated' : 'Collection created')
      // Call `close` with the arguments below to perform this step.
      close()
    } catch (e) {
      // Call `form.setError` with the arguments below to perform this step.
      form.setError('root', { message: errorMessage(e) })
    }
  })
  // Delete the collection after confirmation, then return to the collections tab. Saved titles remain in the library.
  // Keep `destroy` as a callback that runs when it is called and returns a promise.
  const destroy = async () => {
    // Take this branch only when `!collection` is truthy.
    if (!collection) return
    // Call `setPending` with `true` to update its state or routed value.
    setPending(true)
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Take this branch only when `library.user` is truthy.
      if (library.user) await remove(collection.id).unwrap()
      else
        // Call `library.update` with the arguments below to perform this step.
        library.update((d) => {
          // Update `d.collections` using an array containing only items that pass the predicate.
          d.collections = d.collections.filter((c) => c.id !== collection.id)
        })
      // Show the user this success toast message.
      toast.success('Collection deleted')
      // Call `close` with the arguments below to perform this step.
      close()
      // Navigate to `'/library?tab=custom'` through React Router.
      navigate('/library?tab=custom')
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    } finally {
      // Call `setPending` with `false` to update its state or routed value.
      setPending(false)
    }
  }
  return (
    <Modal
      open
      title={
        /* Pass the title record or heading expected by this component. */
        confirm
          ? 'Delete this collection?'
          : collection
            ? 'Edit Collection'
            : 'Create Collection'
      }
      onClose={close}
    >
      {/* Choose the rendered branch from `confirm`; the ? branch is used when true and the : branch otherwise. */}
      {confirm ? (
        <>
          {/* Render the p element. */}
          <p>
            “{collection?.name}” will be deleted. Its titles stay in your
            library.
          </p>
          {/* Render the div element styled by `"dialog-footer"`. */}
          <div className="dialog-footer">
            {/* Render an interactive button. */}
            {/* Clicks call `{() => setConfirm(false)}`. */}
            <button
              className="button secondary"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  setConfirm(false)
              }
            >
              Cancel
            </button>
            {/* Render an interactive button. */}
            {/* The control is disabled when `{pending}`. */}
            {/* Clicks call `{() => void destroy()}`. */}
            <button
              className="button danger"
              disabled={
                /* A truthy value prevents interaction with this control, such as while its request is pending. */ pending
              }
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  void destroy()
              }
            >
              Delete Collection
            </button>
          </div>
        </>
      ) : (
        <form
          className="form-stack"
          onSubmit={
            /* React calls this handler on form submission. The form helper performs its configured validation. */ submit
          }
        >
          {/* Render the field label. */}
          <label>
            Collection name
            {/* Render an editable form field. */}
            <input autoFocus {...form.register('name')} />
            {/* Render the span element styled by `"field-error"`. */}
            <span className="field-error">
              {/* Insert `form.formState.errors.name?.message` into this part of the interface. */}
              {form.formState.errors.name?.message}
            </span>
          </label>
          {/* Render the right-hand content only when `!library.user` is truthy. */}
          {!library.user && (
            <label>
              Description{' '}
              <span className="muted">(optional, this browser only)</span>
              {/* Render the textarea element. */}
              <textarea rows={3} {...form.register('description')} />
            </label>
          )}
          {/* Render the right-hand content only when `form.formState.errors.root` is truthy. */}
          {form.formState.errors.root && (
            <p role="alert" className="field-error">
              {/* Insert `form.formState.errors.root.message` into this part of the interface. */}
              {form.formState.errors.root.message}
            </p>
          )}
          {/* Render the div element styled by `"dialog-footer"`. */}
          <div className="dialog-footer">
            {/* Render the right-hand content only when `collection` is truthy. */}
            {collection && (
              <button
                type="button"
                className="text-button danger-text"
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    setConfirm(true)
                }
              >
                Delete Collection
              </button>
            )}
            {/* Render an interactive button. */}
            {/* The control type is `"button"`. */}
            {/* Clicks call `{close}`. */}
            <button
              type="button"
              className="button secondary"
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ close
              }
            >
              Cancel
            </button>
            {/* Render an interactive button. */}
            {/* The control is disabled when `{form.formState.isSubmitting}`. */}
            <button
              className="button primary"
              disabled={
                /* A truthy value prevents interaction with this control, such as while its request is pending. */ form
                  .formState.isSubmitting
              }
            >
              Save Collection
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
/** Load existing membership, let the user choose several collections, and apply those selections. */
function SaveDialog(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    title,
    close,
  }: { title: Title; close: () => void },
) {
  // Keep `library` as the shared library adapter, exposing guest/account data and save/collection operations.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  const library = useLibrary(),
    dispatch = useAppDispatch()
  // Track checkbox selections locally until Save Selections is pressed.
  // Keep `[selected, setSelected]` as React state initialized from `() => library.guest.collections .filter((c) => c.items.some((i) => titleKey(i) === titleKey(title))) .map((...`; the first tuple value is current state and the second is its setter.
  // Keep `[watchlist, setWatchlist]` as React state initialized from `Boolean(library.saved.some((s) => titleKey(s.title) === titleKey(title)))`; the first tuple value is current state and the second is its setter.
  const [selected, setSelected] = useState<string[]>(() =>
      library.guest.collections
        .filter((c) => c.items.some((i) => titleKey(i) === titleKey(title)))
        .map((c) => c.id),
    ),
    [watchlist, setWatchlist] = useState(
      Boolean(library.saved.some((s) => titleKey(s.title) === titleKey(title))),
    )
  // Keep `[pending, setPending]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  // Keep `[loaded, setLoaded]` as React state initialized from `!library.user`; the first tuple value is current state and the second is its setter.
  const [pending, setPending] = useState(false),
    [loaded, setLoaded] = useState(!library.user)
  // Only custom collections appear as editable membership choices. Automatic groups are computed views.
  // Keep `custom` as an array containing only items that pass the predicate.
  const custom = library.groups.filter((c) => c.kind === 'custom')
  // Run this effect after rendering when the component mounts; a returned function handles cleanup.
  useEffect(() => {
    // Take this branch only when `!library.user` is truthy.
    if (!library.user) return
    // Keep `alive` as the boolean true.
    let alive = true
    // For account data, read collection membership before enabling the save button.
    // Keep `load` as a callback that runs when it is called and returns a promise.
    const load = async () => {
      // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
      try {
        // Keep `chosen` as an empty array, ready to collect items.
        const chosen: string[] = []
        // Visit each item in `custom` using `const c`.
        for (const c of custom) {
          // Keep `request` as the result returned by `dispatch` with these arguments.
          const request = dispatch(
            api.endpoints.collection.initiate({ id: c.id }),
          )
          // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
          try {
            // Keep `result` as the completed result of `request.unwrap()`; await pauses this async function until the promise settles.
            const result = await request.unwrap()
            // Take this branch only when `result.items.results.some( (i) => titleKey(i.title) === titleKey(title), )` is truthy.
            if (
              result.items.results.some(
                (i) => titleKey(i.title) === titleKey(title),
              )
            )
              // Append these values to the end of `chosen`.
              chosen.push(c.id)
          } finally {
            // Release this manual RTK Query subscription when it is no longer needed.
            request.unsubscribe()
          }
        }
        // Take this branch only when `alive` is truthy.
        if (alive) {
          // Call `setSelected` with `chosen` to update its state or routed value.
          setSelected(chosen)
          // Call `setLoaded` with `true` to update its state or routed value.
          setLoaded(true)
        }
      } catch (e) {
        // Show the user this error toast message.
        toast.error(errorMessage(e))
      }
    }
    // Start this expression and intentionally discard its return value; any attached catch handles promise rejection.
    void load()
    // Return a callback that runs when it is called to the caller.
    return () => {
      // Update `alive` using the boolean false.
      alive = false
    }
    // Load initial membership when opening the dialog. Mutations update selections locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Ensure selected titles are saved, apply each collection checkbox, and explicitly unsave only when all destinations are cleared.
  // Keep `save` as a callback that runs when it is called and returns a promise.
  const save = async () => {
    // Call `setPending` with `true` to update its state or routed value.
    setPending(true)
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Take this branch only when `watchlist || selected.length` is truthy.
      if (watchlist || selected.length) await library.save(title)
      // Visit each item in `custom` using `const c`.
      for (const c of custom)
        // Wait for `library.membership(c, title, !selected.includes(c.id))` before continuing this async operation.
        await library.membership(c, title, !selected.includes(c.id))
      // Take this branch only when `!watchlist && !selected.length && library.saved.some((s) => titleKey(s.title) === titleKey(title))` is truthy.
      if (
        !watchlist &&
        !selected.length &&
        library.saved.some((s) => titleKey(s.title) === titleKey(title))
      )
        // Wait for `library.remove(title)` before continuing this async operation.
        await library.remove(title)
      // Show the user this success toast message.
      toast.success('Collection selections saved')
      // Call `close` with the arguments below to perform this step.
      close()
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    } finally {
      // Call `setPending` with `false` to update its state or routed value.
      setPending(false)
    }
  }
  return (
    <Modal open title="Save to Collection" onClose={close}>
      {/* Keep the title visible while the user chooses its collection destinations. */}
      {/* Render the div element styled by `"save-title"`. */}
      <div className="save-title">
        {/* Render the div element. */}
        <div>
          {/* Render the title poster with its missing-image fallback. */}
          {/* The title/heading input is `{title}`. */}
          <Poster
            title={
              /* Pass the title record or heading expected by this component. */ title
            }
          />
        </div>
        {/* Render the span element. */}
        <span>
          {/* Render the strong element. */}
          <strong>{title.title}</strong>
          {/* Render the p element styled by `"muted"`. */}
          <p className="muted">
            {/* Insert `title.year` into this part of the interface. */}
            {title.year} · {title.media_type === 'tv' ? 'TV Series' : 'Movie'}
          </p>
        </span>
      </div>
      {/* Checkboxes edit local selection state until the save operation is submitted. */}
      {/* Render the div element styled by `"collection-options"`. */}
      <div className="collection-options">
        {/* Render the field label. */}
        <label>
          {/* Render an editable form field. */}
          {/* The control type is `"checkbox"`. */}
          {/* The checked state comes from `{watchlist}`. */}
          {/* Field changes call `{(e) => setWatchlist(e.target.checked)}`. */}
          <input
            type="checkbox"
            checked={
              /* This expression controls whether the checkbox is checked; its change handler updates the backing state. */ watchlist
            }
            onChange={
              /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                e,
              ) => setWatchlist(e.target.checked)
            }
          />
          Watchlist
        </label>
        {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
        {custom.map((c) => (
          <label
            key={
              /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ c.id
            }
          >
            {/* Render an editable form field. */}
            {/* The control type is `"checkbox"`. */}
            {/* The checked state comes from `{selected.includes(c.id)}`. */}
            {/* Field changes call `{(e) => setSelected( e.target.checked ? [...selected, c.id] : selected.filter((id) => id !== c.id), ) }`. */}
            <input
              type="checkbox"
              checked={
                /* This expression controls whether the checkbox is checked; its change handler updates the backing state. */ selected.includes(
                  c.id,
                )
              }
              onChange={
                /* React calls this callback when the field changes. Read target.value for text/selects or target.checked for checkboxes. */ (
                  e,
                ) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, c.id]
                      : selected.filter((id) => id !== c.id),
                  )
              }
            />
            {/* Insert `c.name` into this part of the interface. */}
            {c.name}
            {/* Render the span element styled by `"muted"`. */}
            <span className="muted">{c.item_count}</span>
          </label>
        ))}
        {/* Render the right-hand content only when `!loaded` is truthy. */}
        {!loaded && <p role="status">Loading your collections…</p>}
      </div>
      {/* Render an interactive button. */}
      {/* Clicks call `{() => dispatch(setCollection('new'))}`. */}
      <button
        className="text-button"
        onClick={
          /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
            dispatch(setCollection('new'))
        }
      >
        {/* Render the Plus component. */}
        <Plus size={16} />
        Create a new collection
      </button>
      {/* Render the div element styled by `"dialog-footer"`. */}
      <div className="dialog-footer">
        {/* Render an interactive button. */}
        {/* Clicks call `{close}`. */}
        <button
          className="button secondary"
          onClick={
            /* React calls this callback when the control is clicked. The arrow body below performs the action. */ close
          }
        >
          Cancel
        </button>
        {/* Render an interactive button. */}
        {/* The control is disabled when `{pending || !loaded}`. */}
        {/* Clicks call `{() => void save()}`. */}
        <button
          disabled={
            /* A truthy value prevents interaction with this control, such as while its request is pending. */ pending ||
            !loaded
          }
          className="button primary"
          onClick={
            /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
              void save()
          }
        >
          {/* Choose the rendered branch from `pending`; the ? branch is used when true and the : branch otherwise. */}
          {pending ? 'Saving…' : 'Save Selections'}
        </button>
      </div>
    </Modal>
  )
}
/** Offer account access to guests or enable, copy, and revoke an account collection link. */
function ShareDialog(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    collection,
    close,
  }: {
    // The `collection` field used by this data shape. Its type is `Collection`.
    collection: Collection
    // The `close` field used by this data shape. Its type is `() => void`.
    close: () => void
  },
) {
  // Keep `library` as the shared library adapter, exposing guest/account data and save/collection operations.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `[sharing, state]` as the RTK Query mutation tuple from `api.useSharingMutation`; its trigger sends a request when explicitly called.
  const library = useLibrary(),
    dispatch = useAppDispatch(),
    [sharing, state] = api.useSharingMutation()
  // Keep `[url, setUrl]` as React state initialized from `collection.share_url`; the first tuple value is current state and the second is its setter.
  // Keep `[enabled, setEnabled]` as React state initialized from `collection.sharing_enabled`; the first tuple value is current state and the second is its setter.
  const [url, setUrl] = useState(collection.share_url),
    [enabled, setEnabled] = useState(collection.sharing_enabled)
  // Enable or revoke this account collection share on the server, then update the visible URL and status.
  // Keep `toggle` as a callback that runs when it is called and returns a promise.
  const toggle = async () => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Keep `result` as the completed result of `sharing({ id: collection.id, enabled: !enabled, }).unwrap()`; await pauses this async function until the promise settles.
      const result = await sharing({
        // Set the `id` field to the value read from `collection.id`.
        id: collection.id,
        // Set the `enabled` field to the value read from `!enabled`.
        enabled: !enabled,
      }).unwrap()
      // Call `setEnabled` with `!enabled` to update its state or routed value.
      setEnabled(!enabled)
      // Call `setUrl` with `result?.url || null` to update its state or routed value.
      setUrl(result?.url || null)
      // Show the user this success toast message.
      toast.success(enabled ? 'Sharing disabled' : 'Sharing enabled')
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    }
  }
  return (
    <Modal
      open
      title={
        /* Pass the title record or heading expected by this component. */ 'Share “' +
        collection.name +
        '”'
      }
      onClose={close}
    >
      {/* Choose the rendered branch from `!library.user`; the ? branch is used when true and the : branch otherwise. */}
      {!library.user ? (
        <>
          {/* Render the p element. */}
          <p>Sign in and sync your collection to create a public link.</p>
          {/* Render the p element styled by `"muted"`. */}
          <p className="muted">
            Guest collections are saved only in this browser.
          </p>
          {/* Render an interactive button. */}
          {/* Clicks call `{() => { close() dispatch(setAuth('login')) }}`. */}
          <button
            className="button primary"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () => {
                // Call `close` with the arguments below to perform this step.
                close()
                // Send `setAuth('login')` to Redux so its matching reducer/middleware can process it.
                dispatch(setAuth('login'))
              }
            }
          >
            Sign In & Sync
          </button>
        </>
      ) : (
        <>
          {/* Render the p element styled by `"muted"`. */}
          <p className="muted">
            Anyone with the link can view this collection and watch trailers.
          </p>
          {/* Render the right-hand content only when `config.mock` is truthy. */}
          {config.mock && (
            <p className="notice">
              Demo links work in this browser. Cross-device sharing requires the
              live backend.
            </p>
          )}
          {/* Render an interactive button. */}
          {/* The control is disabled when `{state.isLoading}`. */}
          {/* Clicks call `{() => void toggle()}`. */}
          <button
            className="button secondary"
            disabled={
              /* A truthy value prevents interaction with this control, such as while its request is pending. */ state.isLoading
            }
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                void toggle()
            }
          >
            {/* Choose the rendered branch from `enabled`; the ? branch is used when true and the : branch otherwise. */}
            {enabled ? 'Disable Sharing' : 'Enable Public Sharing'}
          </button>
          {/* Render the right-hand content only when `url` is truthy. */}
          {url && (
            <div className="share-url">
              {/* Render an editable form field. */}
              {/* Personal editing is hidden when `true`. */}
              {/* The accessible name is `"Shareable collection URL"`. */}
              {/* The displayed field value comes from `{url}`. */}
              <input
                readOnly
                aria-label="Shareable collection URL"
                value={
                  /* This expression supplies the field’s current displayed value. */ url
                }
              />
              {/* Render an interactive button. */}
              {/* The accessible name is `"Copy share link"`. */}
              {/* Clicks call `{() => void navigator.clipboard .writeText(url) .then(() => toast.success('Link copied')) .catch(() => toas...`. */}
              <button
                className="icon-button"
                aria-label="Copy share link"
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    void navigator.clipboard
                      .writeText(url)
                      .then(() => toast.success('Link copied'))
                      .catch(() =>
                        toast.error('Copy failed. Select and copy the link.'),
                      )
                }
              >
                {/* Render the Copy component. */}
                <Copy size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
// The pending sync job lives in sessionStorage, allowing retries in the same browser tab/session after a refresh.
// Keep `JOB_KEY` as the text `'cinescope:pending-sync:v1'`.
const JOB_KEY = 'cinescope:pending-sync:v1'
/** Offer an explicit guest import, keep retry information, and reconcile successful results. */
function GuestSyncDialog(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    close,
  }: { close: () => void },
) {
  // Keep `navigate` as the router function used to open another frontend route.
  const navigate = useNavigate()
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `guest` as the Redux value selected by `(s) => s.guest`; React subscribes to changes in that selected value.
  // Keep `user` as the Redux value selected by `(s) => s.ui.user`; React subscribes to changes in that selected value.
  const dispatch = useAppDispatch(),
    guest = useAppSelector((s) => s.guest),
    user = useAppSelector((s) => s.ui.user)
  // Keep `[sync, state]` as the RTK Query mutation tuple from `api.useSyncMutation`; its trigger sends a request when explicitly called.
  // Keep `[summary, setSummary]` as React state initialized from `''`; the first tuple value is current state and the second is its setter.
  const [sync, state] = api.useSyncMutation(),
    [summary, setSummary] = useState('')
  // Use the original frozen job when retrying. Creating a new payload for an uncertain prior response could double-count a sync.
  // Keep `run` as a callback that runs when it is called and returns a promise.
  const run = async () => {
    // A session may expire while this dialog is open. Never turn an anonymous click into an import.
    if (!user || store.getState().ui.user?.id !== user.id) return
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Keep `job` as an initially empty value.
      let job: {
        // The `owner` field used by this data shape. Its type is `number`.
        owner: number
        // The server token retaining the same selection across pages. Its type is `LibraryData`.
        snapshot: LibraryData
        // The `payload` field used by this data shape. Its type is `Schema['SyncInput']`.
        payload: Schema['SyncInput']
      }
      // Keep `pending` as the result returned by `sessionStorage.getItem` with these arguments.
      const pending = sessionStorage.getItem(JOB_KEY)
      // Keep `old` as a choice between two values based on `pending`.
      const old = readSyncJob(pending, user.id)
      // Take this branch only when `old && old.owner === user?.id` is truthy.
      if (old && old.owner === user?.id) job = old
      else {
        // Keep `snapshot` as a deep copy of `guest`, allowing edits without mutating the original object.
        const snapshot = structuredClone(guest)
        // Update `job` using an object whose named fields are explained below.
        job = { owner: user!.id, snapshot, payload: syncPayload(snapshot) }
        // Persist this key/value pair in sessionStorage; the data argument is serialized where needed.
        sessionStorage.setItem(JOB_KEY, JSON.stringify(job))
      }
      // Keep `result` as the completed result of `sync(job.payload).unwrap()`; await pauses this async function until the promise settles.
      const result = await sync(job.payload).unwrap()
      // An account change during the request must not clear the guest's local copy.
      if (store.getState().ui.user?.id !== job.owner) return
      // Read guest storage again after the request, retaining records the user may have changed while the import was running.
      // Keep `current` as the result returned by `readLibrary` with these arguments.
      const current = readLibrary()
      // Compare the successful result with the submitted snapshot before clearing local records.
      // Keep `reconciled` as the result returned by `reconcileSync` with these arguments.
      const reconciled = reconcileSync(current, job.snapshot, result)
      // Call `persistLibrary` with the arguments below to perform this step.
      persistLibrary(reconciled)
      // Send `replaceGuest(reconciled)` to Redux so its matching reducer/middleware can process it.
      dispatch(replaceGuest(reconciled))
      // Call `sessionStorage.removeItem` with the arguments below to perform this step.
      sessionStorage.removeItem(JOB_KEY)
      // Call `setSummary` with `result.saved_created + ' titles imported, ' + result.saved_merged + ' merged, ' + result.collections_create...` to update its state or routed value.
      setSummary(
        result.saved_created +
          ' titles imported, ' +
          result.saved_merged +
          ' merged, ' +
          result.collections_created +
          ' collections added.' +
          (result.rejected_titles.length
            ? ' Some titles could not be imported and remain in your guest library.'
            : ''),
      )
      // Show the user this success toast message.
      toast.success('Guest data synchronized')
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    }
  }
  return (
    <Modal open title="Bring your movies with you?" onClose={close}>
      {/* Render the div element styled by `"sync-icon"`. */}
      <div className="sync-icon">
        {/* Render the CloudUpload component. */}
        <CloudUpload size={30} />
      </div>
      {/* Choose the rendered branch from `summary`; the ? branch is used when true and the : branch otherwise. */}
      {summary ? (
        <>
          {/* Render the p element. */}
          <p role="status">{summary}</p>
          {/* Render an interactive button. */}
          {/* Clicks call `{() => { close() navigate('/library') }}`. */}
          <button
            className="button primary"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () => {
                // Call `close` with the arguments below to perform this step.
                close()
                // Navigate to `'/library'` through React Router.
                navigate('/library')
              }
            }
          >
            Continue to My Library
          </button>
        </>
      ) : (
        <>
          {/* Render the p element styled by `"muted"`. */}
          <p className="muted">
            Keep your discoveries together. Add your guest library to your
            account.
          </p>
          {/* Count the guest data being offered for import. */}
          {/* Render the div element styled by `"sync-counts"`. */}
          <div className="sync-counts">
            {/* Render the span element. */}
            <span>
              {/* Render the strong element. */}
              <strong>{guest.saved.length}</strong>saved titles
            </span>
            {/* Render the span element. */}
            <span>
              {/* Render the strong element. */}
              <strong>{guest.collections.length}</strong>collections
            </span>
          </div>
          {/* Preview actual guest titles rather than a separate set of decorative records. */}
          {/* Render the div element styled by `"sync-posters"`. */}
          <div className="sync-posters">
            {/* Render one result for each item in this mapped list; child keys identify the items across renders. */}
            {guest.saved.slice(0, 5).map((s) => (
              <div
                key={
                  /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ titleKey(
                    s.title,
                  )
                }
              >
                {/* Render the title poster with its missing-image fallback. */}
                {/* The title/heading input is `{s.title}`. */}
                <Poster
                  title={
                    /* Pass the title record or heading expected by this component. */ s.title
                  }
                />
              </div>
            ))}
          </div>
          {/* Render the p element styled by `"small muted"`. */}
          <p className="small muted">
            Existing account data is preserved. You can safely retry a failed
            sync.
          </p>
          {/* Render the div element styled by `"dialog-footer"`. */}
          <div className="dialog-footer">
            {/* Render an interactive button. */}
            {/* The control is disabled when `{state.isLoading}`. */}
            {/* Clicks call `{close}`. */}
            <button
              className="button secondary"
              disabled={
                /* A truthy value prevents interaction with this control, such as while its request is pending. */ state.isLoading
              }
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ close
              }
            >
              Not Now
            </button>
            {/* Render an interactive button. */}
            {/* The control is disabled when `{state.isLoading}`. */}
            {/* Clicks call `{() => void run()}`. */}
            <button
              className="button primary"
              disabled={
                /* A truthy value prevents interaction with this control, such as while its request is pending. */ state.isLoading
              }
              onClick={
                /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                  void run()
              }
            >
              {/* Choose the rendered branch from `state.isLoading`; the ? branch is used when true and the : branch otherwise. */}
              {state.isLoading ? 'Synchronizing…' : 'Sync My Library'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
