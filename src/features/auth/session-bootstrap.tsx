/**
 * This invisible component checks the browser session when the application starts.
 * It copies /me/ results into the UI slice and handles the auth result in an OAuth return URL.
 * Returning null means it renders no visible page of its own.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useState, useEffect } from 'react'
// Routing tools for links, page matching, navigation, and URL values.
import { useSearchParams } from 'react-router'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/services/base-api`.
import { resetCsrf } from '@/services/base-api'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import { setUser, setSync } from '@/store/ui-slice'
/** Restore the user display from the session API and process OAuth return information. */
export function SessionBootstrap() {
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `guest` as the Redux value selected by `(s) => s.guest`; React subscribes to changes in that selected value.
  const dispatch = useAppDispatch(),
    guest = useAppSelector((s) => s.guest)
  // Keep `[params, setParams]` as the current URL query parameters and the router function that updates them.
  const [params, setParams] = useSearchParams()
  // Remember whether this visit returned from successful OAuth, even after auth is removed from the URL.
  // Keep `[oauthReturn]` as React state initialized from `() => params.get('auth') === 'success'`; the first tuple value is current state and the second is its setter.
  const [oauthReturn] = useState(() => params.get('auth') === 'success')
  // Request the current session user. A guest normally receives 401 and continues browsing as a guest.
  // Keep `result` as the RTK Query subscription from `api.useMeQuery`, including its cached data and loading/error state.
  const result = api.useMeQuery()
  // When session data arrives, publish the user in Redux and offer guest sync after a successful OAuth return.
  // Run this effect after rendering and rerun it when a value in `[ result.data, dispatch, guest.saved.length, guest.collections.length, oauthReturn, ]` changes.
  useEffect(() => {
    // Take this branch only when `result.data` is truthy.
    if (result.data) {
      // Send `setUser(result.data)` to Redux so its matching reducer/middleware can process it.
      dispatch(setUser(result.data))
      // Take this branch only when `oauthReturn && (guest.saved.length || guest.collections.length)` is truthy.
      if (oauthReturn && (guest.saved.length || guest.collections.length))
        // Send `setSync(true)` to Redux so its matching reducer/middleware can process it.
        dispatch(setSync(true))
    }
  }, [
    result.data,
    dispatch,
    guest.saved.length,
    guest.collections.length,
    oauthReturn,
  ])
  // Run this effect after rendering and rerun it when a value in `[result.error, dispatch]` changes.
  useEffect(() => {
    // Take this branch only when `result.error && 'status' in result.error && result.error.status === 401` is truthy.
    if (result.error && 'status' in result.error && result.error.status === 401)
      // Send `setUser(null)` to Redux so its matching reducer/middleware can process it.
      dispatch(setUser(null))
  }, [result.error, dispatch])
  // Run this effect after rendering and rerun it when a value in `[params, setParams]` changes.
  useEffect(() => {
    // Read the provider result, refresh the CSRF state, and clean this one-time result from the visible URL.
    // Keep `auth` as the value looked up by `params.get('auth')`.
    const auth = params.get('auth')
    // Take this branch only when `auth` is truthy.
    if (auth) {
      // Call `resetCsrf` with the arguments below to perform this step.
      resetCsrf()
      // Take this branch only when `auth !== 'success'` is truthy.
      if (auth !== 'success')
        // Show the user this error toast message.
        // A URL parameter must never become an arbitrary provider/internal error notification.
        toast.error('Sign in could not be completed. Please try again.')
      // Keep `next` as an editable set of URL query parameters copied from the supplied input.
      const next = new URLSearchParams(params)
      // Remove `'auth'` from `next`.
      next.delete('auth')
      // Call `setParams` with `next` to update its state or routed value.
      setParams(next, { replace: true })
    }
  }, [params, setParams])
  // Return null, representing the absence of a value to the caller.
  return null
}
