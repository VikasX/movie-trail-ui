import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Copy, Plus, CloudUpload } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Poster } from '@/features/titles/movie-card'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { useLibrary, errorMessage } from '@/hooks/use-library'
import {
  setCollection,
  setSave,
  setShare,
  setAuth,
  setSync,
} from '@/store/ui-slice'
import { replaceGuest } from '@/store/guest-slice'
import { api } from '@/services/api'
import {
  persistLibrary,
  readLibrary,
  reconcileSync,
  syncPayload,
} from '@/features/guest/storage'
import {
  titleKey,
  type Collection,
  type Title,
  type Schema,
  type LibraryData,
} from '@/types/models'
import { config } from '@/lib/config'

export function CollectionDialogs() {
  const ui = useAppSelector((s) => s.ui),
    dispatch = useAppDispatch()
  return (
    <>
      {ui.collection && (
        <CollectionDialog
          key={typeof ui.collection === 'string' ? 'new' : ui.collection.id}
          collection={ui.collection === 'new' ? undefined : ui.collection}
          close={() => dispatch(setCollection(null))}
        />
      )}
      {ui.save && (
        <SaveDialog
          key={titleKey(ui.save)}
          title={ui.save}
          close={() => dispatch(setSave(null))}
        />
      )}
      {ui.share && (
        <ShareDialog
          collection={ui.share}
          close={() => dispatch(setShare(null))}
        />
      )}
      {ui.sync && <GuestSyncDialog close={() => dispatch(setSync(false))} />}
    </>
  )
}
function CollectionDialog({
  collection,
  close,
}: {
  collection?: Collection
  close: () => void
}) {
  const library = useLibrary(),
    navigate = useNavigate()
  const [create] = api.useCreateCollectionMutation(),
    [edit] = api.useEditCollectionMutation(),
    [remove] = api.useDeleteCollectionMutation()
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false)
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(1, 'Give your collection a name.').max(80),
        description: z.string().max(500),
      }),
    ),
    defaultValues: {
      name: collection?.name || '',
      description: collection
        ? library.localGroup(collection.id)?.description || ''
        : '',
    },
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      if (library.user) {
        if (collection)
          await edit({ id: collection.id, name: values.name }).unwrap()
        else await create({ name: values.name }).unwrap()
      } else {
        if (!collection && library.guest.collections.length >= 20)
          throw new Error(
            'Your guest library has reached 20 collections. Sign in and sync to create more.',
          )
        if (
          library.guest.collections.some(
            (c) =>
              c.id !== collection?.id &&
              c.name.toLowerCase() === values.name.toLowerCase(),
          )
        )
          throw new Error('A collection already has that name.')
        library.update((d) => {
          if (collection) {
            const c = d.collections.find((c) => c.id === collection.id)
            if (c) {
              c.name = values.name
              c.description = values.description
              c.updated_at = new Date().toISOString()
            }
          } else
            d.collections.unshift({
              id: crypto.randomUUID(),
              kind: 'custom',
              name: values.name,
              description: values.description,
              items: [],
              item_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              sharing_enabled: false,
              share_url: null,
            })
        })
      }
      toast.success(collection ? 'Collection updated' : 'Collection created')
      close()
    } catch (e) {
      form.setError('root', { message: errorMessage(e) })
    }
  })
  const destroy = async () => {
    if (!collection) return
    setPending(true)
    try {
      if (library.user) await remove(collection.id).unwrap()
      else
        library.update((d) => {
          d.collections = d.collections.filter((c) => c.id !== collection.id)
        })
      toast.success('Collection deleted')
      close()
      navigate('/library?tab=custom')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <Modal
      open
      title={
        confirm
          ? 'Delete this collection?'
          : collection
            ? 'Edit Collection'
            : 'Create Collection'
      }
      onClose={close}
    >
      {confirm ? (
        <>
          <p>
            “{collection?.name}” will be deleted. Its titles stay in your
            library.
          </p>
          <div className="dialog-footer">
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() => void destroy()}
            >
              Delete Collection
            </button>
          </div>
        </>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <label>
            Collection name
            <input autoFocus {...form.register('name')} />
            <span className="field-error">
              {form.formState.errors.name?.message}
            </span>
          </label>
          {!library.user && (
            <label>
              Description{' '}
              <span className="muted">(optional, this browser only)</span>
              <textarea rows={3} {...form.register('description')} />
            </label>
          )}
          {form.formState.errors.root && (
            <p role="alert" className="field-error">
              {form.formState.errors.root.message}
            </p>
          )}
          <div className="dialog-footer">
            {collection && (
              <button
                type="button"
                className="text-button danger-text"
                onClick={() => setConfirm(true)}
              >
                Delete Collection
              </button>
            )}
            <button type="button" className="button secondary" onClick={close}>
              Cancel
            </button>
            <button
              className="button primary"
              disabled={form.formState.isSubmitting}
            >
              Save Collection
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
function SaveDialog({ title, close }: { title: Title; close: () => void }) {
  const library = useLibrary(),
    dispatch = useAppDispatch()
  const [selected, setSelected] = useState<string[]>(() =>
      library.guest.collections
        .filter((c) => c.items.some((i) => titleKey(i) === titleKey(title)))
        .map((c) => c.id),
    ),
    [watchlist, setWatchlist] = useState(
      Boolean(library.saved.some((s) => titleKey(s.title) === titleKey(title))),
    )
  const [pending, setPending] = useState(false),
    [loaded, setLoaded] = useState(!library.user)
  const custom = library.groups.filter((c) => c.kind === 'custom')
  useEffect(() => {
    if (!library.user) return
    let alive = true
    const load = async () => {
      try {
        const chosen: string[] = []
        for (const c of custom) {
          const request = dispatch(
            api.endpoints.collection.initiate({ id: c.id }),
          )
          try {
            const result = await request.unwrap()
            if (
              result.items.results.some(
                (i) => titleKey(i.title) === titleKey(title),
              )
            )
              chosen.push(c.id)
          } finally {
            request.unsubscribe()
          }
        }
        if (alive) {
          setSelected(chosen)
          setLoaded(true)
        }
      } catch (e) {
        toast.error(errorMessage(e))
      }
    }
    void load()
    return () => {
      alive = false
    }
    // Load initial membership when opening the dialog. Mutations update selections locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const save = async () => {
    setPending(true)
    try {
      if (watchlist || selected.length) await library.save(title)
      for (const c of custom)
        await library.membership(c, title, !selected.includes(c.id))
      if (
        !watchlist &&
        !selected.length &&
        library.saved.some((s) => titleKey(s.title) === titleKey(title))
      )
        await library.remove(title)
      toast.success('Collection selections saved')
      close()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <Modal open title="Save to Collection" onClose={close}>
      <div className="save-title">
        <div>
          <Poster title={title} />
        </div>
        <span>
          <strong>{title.title}</strong>
          <p className="muted">
            {title.year} · {title.media_type === 'tv' ? 'TV Series' : 'Movie'}
          </p>
        </span>
      </div>
      <div className="collection-options">
        <label>
          <input
            type="checkbox"
            checked={watchlist}
            onChange={(e) => setWatchlist(e.target.checked)}
          />
          Watchlist
        </label>
        {custom.map((c) => (
          <label key={c.id}>
            <input
              type="checkbox"
              checked={selected.includes(c.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, c.id]
                    : selected.filter((id) => id !== c.id),
                )
              }
            />
            {c.name}
            <span className="muted">{c.item_count}</span>
          </label>
        ))}
        {!loaded && <p role="status">Loading your collections…</p>}
      </div>
      <button
        className="text-button"
        onClick={() => dispatch(setCollection('new'))}
      >
        <Plus size={16} />
        Create a new collection
      </button>
      <div className="dialog-footer">
        <button className="button secondary" onClick={close}>
          Cancel
        </button>
        <button
          disabled={pending || !loaded}
          className="button primary"
          onClick={() => void save()}
        >
          {pending ? 'Saving…' : 'Save Selections'}
        </button>
      </div>
    </Modal>
  )
}
function ShareDialog({
  collection,
  close,
}: {
  collection: Collection
  close: () => void
}) {
  const library = useLibrary(),
    dispatch = useAppDispatch(),
    [sharing, state] = api.useSharingMutation()
  const [url, setUrl] = useState(collection.share_url),
    [enabled, setEnabled] = useState(collection.sharing_enabled)
  const toggle = async () => {
    try {
      const result = await sharing({
        id: collection.id,
        enabled: !enabled,
      }).unwrap()
      setEnabled(!enabled)
      setUrl(result?.url || null)
      toast.success(enabled ? 'Sharing disabled' : 'Sharing enabled')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Modal open title={'Share “' + collection.name + '”'} onClose={close}>
      {!library.user ? (
        <>
          <p>Sign in and sync your collection to create a public link.</p>
          <p className="muted">
            Guest collections are saved only in this browser.
          </p>
          <button
            className="button primary"
            onClick={() => {
              close()
              dispatch(setAuth('login'))
            }}
          >
            Sign In & Sync
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            Anyone with the link can view this collection and watch trailers.
          </p>
          {config.mock && (
            <p className="notice">
              Demo links work in this browser. Cross-device sharing requires the
              live backend.
            </p>
          )}
          <button
            className="button secondary"
            disabled={state.isLoading}
            onClick={() => void toggle()}
          >
            {enabled ? 'Disable Sharing' : 'Enable Public Sharing'}
          </button>
          {url && (
            <div className="share-url">
              <input
                readOnly
                aria-label="Shareable collection URL"
                value={url}
              />
              <button
                className="icon-button"
                aria-label="Copy share link"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(url)
                    .then(() => toast.success('Link copied'))
                    .catch(() =>
                      toast.error('Copy failed. Select and copy the link.'),
                    )
                }
              >
                <Copy size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
const JOB_KEY = 'cinescope:pending-sync:v1'
function GuestSyncDialog({ close }: { close: () => void }) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch(),
    guest = useAppSelector((s) => s.guest),
    user = useAppSelector((s) => s.ui.user)
  const [sync, state] = api.useSyncMutation(),
    [summary, setSummary] = useState('')
  const run = async () => {
    try {
      let job: {
        owner: number
        snapshot: LibraryData
        payload: Schema['SyncInput']
      }
      const pending = sessionStorage.getItem(JOB_KEY)
      const old = pending ? (JSON.parse(pending) as typeof job) : null
      if (old && old.owner === user?.id) job = old
      else {
        const snapshot = structuredClone(guest)
        job = { owner: user!.id, snapshot, payload: syncPayload(snapshot) }
        sessionStorage.setItem(JOB_KEY, JSON.stringify(job))
      }
      const result = await sync(job.payload).unwrap()
      const current = readLibrary()
      const reconciled = reconcileSync(current, job.snapshot, result)
      persistLibrary(reconciled)
      dispatch(replaceGuest(reconciled))
      sessionStorage.removeItem(JOB_KEY)
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
      toast.success('Guest data synchronized')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Modal open title="Bring your movies with you?" onClose={close}>
      <div className="sync-icon">
        <CloudUpload size={30} />
      </div>
      {summary ? (
        <>
          <p role="status">{summary}</p>
          <button
            className="button primary"
            onClick={() => {
              close()
              navigate('/library')
            }}
          >
            Continue to My Library
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            Keep your discoveries together. Add your guest library to your
            account.
          </p>
          <div className="sync-counts">
            <span>
              <strong>{guest.saved.length}</strong>saved titles
            </span>
            <span>
              <strong>{guest.collections.length}</strong>collections
            </span>
          </div>
          <div className="sync-posters">
            {guest.saved.slice(0, 5).map((s) => (
              <div key={titleKey(s.title)}>
                <Poster title={s.title} />
              </div>
            ))}
          </div>
          <p className="small muted">
            Existing account data is preserved. You can safely retry a failed
            sync.
          </p>
          <div className="dialog-footer">
            <button
              className="button secondary"
              disabled={state.isLoading}
              onClick={close}
            >
              Not Now
            </button>
            <button
              className="button primary"
              disabled={state.isLoading}
              onClick={() => void run()}
            >
              {state.isLoading ? 'Synchronizing…' : 'Sync My Library'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
