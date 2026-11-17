import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Film, Mail, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/services/api'
import { config } from '@/lib/config'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { setAuth, setUser, setSync } from '@/store/ui-slice'
import { Modal } from '@/components/ui/modal'
import { errorMessage } from '@/hooks/use-library'
import { persistLibrary, readLibrary } from '@/features/guest/storage'

export function GoogleButton() {
  const [oauth, state] = api.useOauthMutation()
  const start = async () => {
    if (config.mock) {
      toast.info('Demo mode: use email sign in to try an account session.')
      return
    }
    try {
      const result = await oauth({
        provider: 'google',
        return_to: '/discover',
      }).unwrap()
      window.location.assign(result.authorization_url)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <button
      className="button secondary"
      disabled={state.isLoading}
      onClick={() => void start()}
    >
      <span className="google-g">G</span>Continue with Google
    </button>
  )
}
export function WelcomePage() {
  const navigate = useNavigate(),
    dispatch = useAppDispatch()
  const guest = () => {
    try {
      if (!localStorage.getItem('cinescope:guest:v1'))
        persistLibrary(readLibrary())
      navigate('/discover')
    } catch {
      toast.error(
        'Browser storage is unavailable. Your library may not persist.',
      )
      navigate('/discover')
    }
  }
  return (
    <main className="welcome-page">
      <div className="welcome-art" aria-hidden="true">
        <div className="welcome-orbit" />
        <div className="welcome-frame">
          <Film size={52} />
        </div>
      </div>
      <section className="welcome-content">
        <p className="eyebrow">CINEMATIC DISCOVERY</p>
        <h1>CineScope</h1>
        <p>
          Discover movies and TV series.
          <br />
          Find your next favorite.
        </p>
        <div className="welcome-actions">
          <button className="button primary" onClick={guest}>
            <Film size={19} />
            Continue as Guest
            <ArrowRight size={17} />
          </button>
          <div className="divider">or build your library</div>
          <GoogleButton />
          <button
            className="button secondary"
            onClick={() => dispatch(setAuth('login'))}
          >
            <Mail size={18} />
            Continue with Email
          </button>
        </div>
        <p className="welcome-footnote">Great stories. A place to keep them.</p>
        {config.mock && (
          <span className="demo-note">
            Demo mode · Explore freely with sample titles
          </span>
        )}
      </section>
    </main>
  )
}
export function AuthDialog() {
  const view = useAppSelector((s) => s.ui.auth),
    dispatch = useAppDispatch()
  if (!view) return null
  return (
    <AuthForm key={view} view={view} onClose={() => dispatch(setAuth(null))} />
  )
}
function AuthForm({
  view,
  onClose,
}: {
  view: 'login' | 'register' | 'forgot'
  onClose: () => void
}) {
  const dispatch = useAppDispatch(),
    navigate = useNavigate(),
    guest = useAppSelector((s) => s.guest)
  const [login] = api.useLoginMutation(),
    [register] = api.useRegisterMutation(),
    [action] = api.useAuthActionMutation()
  const [message, setMessage] = useState('')
  const schema = z.object({
    email: z.email('Enter a valid email address.'),
    password:
      view === 'forgot'
        ? z.string()
        : z
            .string()
            .min(
              view === 'register' ? 12 : 1,
              view === 'register'
                ? 'Use at least 12 characters.'
                : 'Enter your password.',
            )
            .max(128),
    display_name:
      view === 'register'
        ? z.string().trim().min(1, 'Enter your name.').max(80)
        : z.string(),
  })
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', display_name: '' },
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      if (view === 'login') {
        const result = await login({
          email: values.email,
          password: values.password,
        }).unwrap()
        dispatch(setUser(result.user))
        onClose()
        navigate('/discover')
        if (guest.saved.length || guest.collections.length)
          dispatch(setSync(true))
        toast.success(config.mock ? 'Demo session started' : 'Welcome back')
      } else if (view === 'register') {
        const result = await register(values).unwrap()
        setMessage(result.detail)
      } else {
        const result = await action({
          path: 'password/reset',
          body: { email: values.email },
        }).unwrap()
        setMessage(result.detail)
      }
    } catch (e) {
      form.setError('root', { message: errorMessage(e) })
    }
  })
  return (
    <Modal
      open
      title={
        view === 'login'
          ? 'Welcome back'
          : view === 'register'
            ? 'Create your account'
            : 'Reset your password'
      }
      onClose={onClose}
    >
      {config.mock && (
        <p className="notice">
          Demo session. Use any valid email and a password to try the account
          experience. No real account or email is created.
        </p>
      )}
      {message ? (
        <div role="status">
          <p>{message}</p>
          <button
            className="button primary"
            onClick={() => dispatch(setAuth('login'))}
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          {view === 'register' && (
            <label>
              Name
              <input autoComplete="name" {...form.register('display_name')} />
              <span className="field-error">
                {form.formState.errors.display_name?.message}
              </span>
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
            <span className="field-error">
              {form.formState.errors.email?.message}
            </span>
          </label>
          {view !== 'forgot' && (
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  view === 'register' ? 'new-password' : 'current-password'
                }
                {...form.register('password')}
              />
              <span className="field-error">
                {form.formState.errors.password?.message}
              </span>
            </label>
          )}
          {form.formState.errors.root && (
            <p className="field-error" role="alert">
              {form.formState.errors.root.message}
            </p>
          )}
          <button
            className="button primary"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? 'Please wait…'
              : view === 'login'
                ? 'Sign In'
                : view === 'register'
                  ? 'Create Account'
                  : 'Send Reset Link'}
          </button>
          <div className="form-links">
            {view === 'login' ? (
              <>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => dispatch(setAuth('forgot'))}
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => dispatch(setAuth('register'))}
                >
                  Create Account
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-button"
                onClick={() => dispatch(setAuth('login'))}
              >
                Back to Sign In
              </button>
            )}
          </div>
          {view === 'login' && <GoogleButton />}
        </form>
      )}
    </Modal>
  )
}
export function AuthTokenPage({ reset = false }: { reset?: boolean }) {
  const [params, setParams] = useSearchParams()
  const [token] = useState(() => params.get('token') || '')
  const [action, actionState] = api.useAuthActionMutation(),
    [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false)
  const form = useForm({
    resolver: zodResolver(
      z.object({
        password: z.string().min(12, 'Use at least 12 characters.').max(128),
      }),
    ),
    defaultValues: { password: '' },
  })
  useEffect(() => {
    document
      .querySelector('meta[name="referrer"]')
      ?.setAttribute('content', 'no-referrer')
    if (params.has('token')) setParams({}, { replace: true })
  }, [params, setParams])
  const consume = async (password?: string) => {
    setFailed(false)
    try {
      if (!token)
        throw new Error(
          'This link is missing its token. Request a fresh email.',
        )
      const result = await action({
        path: reset ? 'password/reset/confirm' : 'email/verify',
        body: reset ? { token, password: password! } : { token },
      }).unwrap()
      setMessage(result.detail)
    } catch (e) {
      setFailed(true)
      setMessage(errorMessage(e))
    }
  }
  return (
    <div className="auth-token-page">
      <h1>{reset ? 'Choose a new password' : 'Verify your email'}</h1>
      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
      {reset ? (
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((v) => consume(v.password))}
        >
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            <span className="field-error">
              {form.formState.errors.password?.message}
            </span>
          </label>
          <button
            className="button primary"
            disabled={
              form.formState.isSubmitting ||
              actionState.isLoading ||
              Boolean(message && !failed)
            }
          >
            Reset Password
          </button>
        </form>
      ) : (
        <button
          className="button primary"
          disabled={actionState.isLoading || Boolean(message && !failed)}
          onClick={() => void consume()}
        >
          Verify Email
        </button>
      )}
      <Link className="text-button" to="/">
        Return to Sign In
      </Link>
    </div>
  )
}
