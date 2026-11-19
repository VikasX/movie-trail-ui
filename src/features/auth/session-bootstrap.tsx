/** Restore the Django session and reconcile an OAuth return before requesting /me/. */
import { useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { resetCsrf } from '@/services/base-api'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { setAuth, setUser, setSync } from '@/store/ui-slice'

export function SessionBootstrap() {
  const dispatch = useAppDispatch()
  const guest = useAppSelector((s) => s.guest)
  const [params, setParams] = useSearchParams()
  const auth = params.get('auth')
  const pendingOAuthSync = useRef(false)

  // OAuth rotates the session/CSRF cookies. Do not start /me/ until the callback
  // effect has reset the old token and cache, otherwise resetCsrf cancels that
  // request's CSRF bootstrap with a session-generation mismatch.
  const result = api.useMeQuery(undefined, { skip: Boolean(auth) })

  useEffect(() => {
    if (!auth) return
    pendingOAuthSync.current = auth === 'success'
    resetCsrf()
    // Clear guest responses and any previous account's private data. Removing
    // auth below enables a fresh /me/ request even on an already-mounted app.
    dispatch(api.util.resetApiState())
    dispatch(setAuth(null))
    if (auth !== 'success')
      toast.error('Sign in could not be completed. Please try again.')
    const next = new URLSearchParams(params)
    next.delete('auth')
    setParams(next, { replace: true })
  }, [auth, params, setParams, dispatch])

  useEffect(() => {
    // RTK Query can retain previous data while a request is pending or failed.
    // Only publish a successful response from the current session.
    if (auth || !result.isSuccess || !result.data) return
    dispatch(setUser(result.data))
    if (pendingOAuthSync.current) {
      pendingOAuthSync.current = false
      if (guest.saved.length || guest.collections.length)
        dispatch(setSync(true))
    }
  }, [
    auth,
    result.isSuccess,
    result.data,
    dispatch,
    guest.saved.length,
    guest.collections.length,
  ])

  useEffect(() => {
    if (
      !auth &&
      result.isError &&
      result.error &&
      'status' in result.error &&
      result.error.status === 401
    ) {
      pendingOAuthSync.current = false
      dispatch(setUser(null))
    }
  }, [auth, result.isError, result.error, dispatch])

  return null
}
