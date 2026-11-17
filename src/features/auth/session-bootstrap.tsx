import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { resetCsrf } from '@/services/base-api'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { setUser, setSync } from '@/store/ui-slice'
export function SessionBootstrap() {
  const dispatch = useAppDispatch(),
    guest = useAppSelector((s) => s.guest)
  const [params, setParams] = useSearchParams()
  const [oauthReturn] = useState(() => params.get('auth') === 'success')
  const result = api.useMeQuery()
  useEffect(() => {
    if (result.data) {
      dispatch(setUser(result.data))
      if (oauthReturn && (guest.saved.length || guest.collections.length))
        dispatch(setSync(true))
    }
  }, [
    result.data,
    dispatch,
    guest.saved.length,
    guest.collections.length,
    oauthReturn,
  ])
  useEffect(() => {
    if (result.error && 'status' in result.error && result.error.status === 401)
      dispatch(setUser(null))
  }, [result.error, dispatch])
  useEffect(() => {
    const auth = params.get('auth')
    if (auth) {
      resetCsrf()
      if (auth !== 'success')
        toast.error(
          'Sign in could not be completed: ' + auth.replaceAll('_', ' '),
        )
      const next = new URLSearchParams(params)
      next.delete('auth')
      setParams(next, { replace: true })
    }
  }, [params, setParams])
  return null
}
