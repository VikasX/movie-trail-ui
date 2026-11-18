/**
 * Welcome, email sign-in/register/recovery forms, Google entry, and email-token pages.
 * React Hook Form tracks fields. Zod checks the values. RTK Query sends the request.
 * After successful login, Redux receives the user and guest data can be offered for explicit synchronization.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React hooks and component/type helpers used to build this file’s interface.
import { useEffect, useState } from 'react'
// Routing tools for links, page matching, navigation, and URL values.
import { useNavigate, useSearchParams, Link } from 'react-router'
// Form field registration, validation state, and submission helpers.
import { useForm } from 'react-hook-form'
// The adapter connecting Zod rules to React Hook Form.
import { zodResolver } from '@hookform/resolvers/zod'
// Runtime schemas that validate values rather than relying only on TypeScript.
import { z } from '@/lib/validation'
// SVG icon components used by the controls and headings below.
import { Film, Mail, ArrowRight } from 'lucide-react'
// Toast notifications shown after an operation succeeds or fails.
import { toast } from 'sonner'
// Bring in the exported helpers/components from `@/services/api`.
import { api } from '@/services/api'
// Bring in the exported helpers/components from `@/lib/config`.
import { config } from '@/lib/config'
import { safeOAuthUrl } from '@/lib/security'
// Bring in the exported helpers/components from `@/hooks/redux`.
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
// Bring in the exported helpers/components from `@/store/ui-slice`.
import { setAuth, setUser, setSync } from '@/store/ui-slice'
// Bring in the exported helpers/components from `@/components/ui/modal`.
import { Modal } from '@/components/ui/modal'
// Bring in the exported helpers/components from `@/hooks/use-library`.
import { errorMessage } from '@/hooks/use-library'
// Bring in the exported helpers/components from `@/features/guest/storage`.
import { persistLibrary, readLibrary } from '@/features/guest/storage'

/** Start the Django Google OAuth flow in live mode and explain the demo alternative in mock mode. */
export function GoogleButton() {
  // Keep `[oauth, state]` as the RTK Query mutation tuple from `api.useOauthMutation`; its trigger sends a request when explicitly called.
  const [oauth, state] = api.useOauthMutation()
  // Ask Django to start Google OAuth. The server provides the authorization URL and manages provider/session details.
  // Keep `start` as a callback that runs when it is called and returns a promise.
  const start = async () => {
    // Take this branch only when `config.mock` is truthy.
    if (config.mock) {
      // Show the user this info toast message.
      toast.info('Demo mode: use email sign in to try an account session.')
      return
    }
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Keep `result` as the completed result of `oauth({ provider: 'google', return_to: '/discover', }).unwrap()`; await pauses this async function until the promise settles.
      const result = await oauth({
        // The external sign-in provider to start.
        provider: 'google',
        // The frontend path to return to after authentication.
        return_to: '/discover',
      }).unwrap()
      // Call `window.location.assign` with the arguments below to perform this step.
      // Validate API-provided navigation before handing it to the browser.
      const destination = safeOAuthUrl(
        result.authorization_url,
        window.location.origin,
      )
      if (!destination)
        throw new Error('Sign in could not be started. Please try again.')
      window.location.assign(destination)
    } catch (e) {
      // Show the user this error toast message.
      toast.error(errorMessage(e))
    }
  }
  return (
    <button
      className="button secondary"
      disabled={
        /* A truthy value prevents interaction with this control, such as while its request is pending. */ state.isLoading
      }
      onClick={
        /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
          void start()
      }
    >
      {/* Render the span element styled by `"google-g"`. */}
      <span className="google-g">G</span>Continue with Google
    </button>
  )
}
/** Provide Guest, Google, and Email entry points into the application. */
export function WelcomePage() {
  // Keep `navigate` as the router function used to open another frontend route.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  const navigate = useNavigate(),
    dispatch = useAppDispatch()
  // Create guest storage only when it is missing, preserving an existing guest library before navigation.
  // Keep `guest` as a callback that runs when it is called.
  const guest = () => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Take this branch only when `!localStorage.getItem('cinescope:guest:v1')` is truthy.
      if (!localStorage.getItem('cinescope:guest:v1'))
        // Call `persistLibrary` with the arguments below to perform this step.
        persistLibrary(readLibrary())
      // Navigate to `'/discover'` through React Router.
      navigate('/discover')
    } catch {
      // Show the user this error toast message.
      toast.error(
        'Browser storage is unavailable. Your library may not persist.',
      )
      // Navigate to `'/discover'` through React Router.
      navigate('/discover')
    }
  }
  return (
    <main className="welcome-page">
      {/* A decorative CSS illustration, hidden from assistive technology. */}
      {/* Render the div element styled by `"welcome-art"`. */}
      {/* Assistive-technology visibility is controlled by `"true"`. */}
      <div className="welcome-art" aria-hidden="true">
        {/* Render the div element styled by `"welcome-orbit"`. */}
        <div className="welcome-orbit" />
        {/* Render the div element styled by `"welcome-frame"`. */}
        <div className="welcome-frame">
          {/* Render the Film component. */}
          <Film size={52} />
        </div>
      </div>
      {/* The three entry choices for guests and account users. */}
      {/* Render the section element styled by `"welcome-content"`. */}
      <section className="welcome-content">
        {/* Render the p element styled by `"eyebrow"`. */}
        <p className="eyebrow">CINEMATIC DISCOVERY</p>
        {/* Render the h1 element. */}
        <h1>CineScope</h1>
        {/* Render the p element. */}
        <p>
          Discover movies and TV series.
          {/* Render the br element. */}
          <br />
          Find your next favorite.
        </p>
        {/* Guest navigation is local. Google and email entry use their respective authentication flows. */}
        {/* Render the div element styled by `"welcome-actions"`. */}
        <div className="welcome-actions">
          {/* Render an interactive button. */}
          {/* Clicks call `{guest}`. */}
          <button
            className="button primary"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ guest
            }
          >
            {/* Render the Film component. */}
            <Film size={19} />
            Continue as Guest
            {/* Render the ArrowRight component. */}
            <ArrowRight size={17} />
          </button>
          {/* Render the div element styled by `"divider"`. */}
          <div className="divider">or build your library</div>
          {/* Render the GoogleButton component. */}
          <GoogleButton />
          {/* Render an interactive button. */}
          {/* Clicks call `{() => dispatch(setAuth('login'))}`. */}
          <button
            className="button secondary"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                dispatch(setAuth('login'))
            }
          >
            {/* Render the Mail component. */}
            <Mail size={18} />
            Continue with Email
          </button>
        </div>
        {/* Render the p element styled by `"welcome-footnote"`. */}
        <p className="welcome-footnote">Great stories. A place to keep them.</p>
        {/* Render the right-hand content only when `config.mock` is truthy. */}
        {config.mock && (
          <span className="demo-note">
            Demo mode · Explore freely with sample titles
          </span>
        )}
      </section>
    </main>
  )
}
/** Choose the email form from the Redux login/register/forgot value. */
export function AuthDialog() {
  // Keep `view` as the Redux value selected by `(s) => s.ui.auth`; React subscribes to changes in that selected value.
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  const view = useAppSelector((s) => s.ui.auth),
    dispatch = useAppDispatch()
  // Take this branch only when `!view` is truthy.
  if (!view) return null
  return (
    <AuthForm
      key={
        /* React uses this identity to match list/component instances across renders; changing it can reset component state. */ view
      }
      view={view}
      onClose={() => dispatch(setAuth(null))}
    />
  )
}
/** Validate form fields and submit the matching login, registration, or recovery request. */
function AuthForm(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    view,
    onClose,
  }: {
    // The `view` field used by this data shape. Its type is `'login' | 'register' | 'forgot'`.
    view: 'login' | 'register' | 'forgot'
    // The `onClose` field used by this data shape. Its type is `() => void`.
    onClose: () => void
  },
) {
  // Keep `dispatch` as the typed Redux dispatch function used to send actions to the store.
  // Keep `navigate` as the router function used to open another frontend route.
  // Keep `guest` as the Redux value selected by `(s) => s.guest`; React subscribes to changes in that selected value.
  const dispatch = useAppDispatch(),
    navigate = useNavigate(),
    guest = useAppSelector((s) => s.guest)
  // Keep `[login]` as the RTK Query mutation tuple from `api.useLoginMutation`; its trigger sends a request when explicitly called.
  // Keep `[register]` as the RTK Query mutation tuple from `api.useRegisterMutation`; its trigger sends a request when explicitly called.
  // Keep `[action]` as the RTK Query mutation tuple from `api.useAuthActionMutation`; its trigger sends a request when explicitly called.
  const [login] = api.useLoginMutation(),
    [register] = api.useRegisterMutation(),
    [action] = api.useAuthActionMutation()
  // Keep `[message, setMessage]` as React state initialized from `''`; the first tuple value is current state and the second is its setter.
  const [message, setMessage] = useState('')
  // Build field rules for this form mode. Registration requires a longer password and a display name.
  // Keep `schema` as the Zod validation rule `z.object({ email: z.email('Enter a valid email address.'), password: view === 'forgot' ? z.string() : z .st...`.
  const schema = z.object({
    // Set the `email` field to the Zod validation rule `z.email('Enter a valid email address.')`.
    email: z.email('Enter a valid email address.'),
    // Set the `password` field to a choice between two values based on `view === 'forgot'`.
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
    // Set the `display_name` field to a choice between two values based on `view === 'register'`.
    display_name:
      view === 'register'
        ? z.string().trim().min(1, 'Enter your name.').max(80)
        : z.string(),
  })
  // Connect field registration, submitted values, validation errors, and submit state to React Hook Form.
  // Keep `form` as the result returned by `useForm` with these arguments.
  const form = useForm({
    // Connect form validation to the schema before submission.
    resolver: zodResolver(schema),
    // The initial values assigned to the form fields.
    defaultValues: { email: '', password: '', display_name: '' },
  })
  // Run this async callback only after Zod accepts the fields. unwrap allows try/catch to handle API failures.
  // Keep `submit` as the result returned by `form.handleSubmit` with these arguments.
  const submit = form.handleSubmit(async (values) => {
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Successful login stores the returned user view, navigates to Discover, and offers an explicit guest import.
      // Take this branch only when `view === 'login'` is truthy.
      if (view === 'login') {
        // Keep `result` as the completed result of `login({ email: values.email, password: values.password, }).unwrap()`; await pauses this async function until the promise settles.
        const result = await login({
          // Set the `email` field to the value read from `values.email`.
          email: values.email,
          // Set the `password` field to the value read from `values.password`.
          password: values.password,
        }).unwrap()
        // Send `setUser(result.user)` to Redux so its matching reducer/middleware can process it.
        dispatch(setUser(result.user))
        // Call `onClose` with the arguments below to perform this step.
        onClose()
        // Navigate to `'/discover'` through React Router.
        navigate('/discover')
        // Take this branch only when `guest.saved.length || guest.collections.length` is truthy.
        if (guest.saved.length || guest.collections.length)
          // Send `setSync(true)` to Redux so its matching reducer/middleware can process it.
          dispatch(setSync(true))
        // Show the user this success toast message.
        toast.success(config.mock ? 'Demo session started' : 'Welcome back')
        // Registration displays the server message. The email verification/login flow establishes the session later.
      } else if (view === 'register') {
        // Keep `result` as the completed result of `register(values).unwrap()`; await pauses this async function until the promise settles.
        const result = await register(values).unwrap()
        // Call `setMessage` with `result.detail` to update its state or routed value.
        setMessage(result.detail)
      } else {
        // Keep `result` as the completed result of `action({ path: 'password/reset', body: { email: values.email }, }).unwrap()`; await pauses this async function until the promise settles.
        const result = await action({
          // Set the `path` field to the text `'password/reset'`.
          path: 'password/reset',
          // The JSON request content sent to the backend.
          body: { email: values.email },
        }).unwrap()
        // Call `setMessage` with `result.detail` to update its state or routed value.
        setMessage(result.detail)
      }
    } catch (e) {
      // Call `form.setError` with the arguments below to perform this step.
      form.setError('root', { message: errorMessage(e) })
    }
  })
  return (
    <Modal
      open
      title={
        /* Pass the title record or heading expected by this component. */
        view === 'login'
          ? 'Welcome back'
          : view === 'register'
            ? 'Create your account'
            : 'Reset your password'
      }
      onClose={onClose}
    >
      {/* Render the right-hand content only when `config.mock` is truthy. */}
      {config.mock && (
        <p className="notice">
          Demo session. Use any valid email and a password to try the account
          experience. No real account or email is created.
        </p>
      )}
      {/* Choose the rendered branch from `message`; the ? branch is used when true and the : branch otherwise. */}
      {message ? (
        <div role="status">
          {/* Render the p element. */}
          <p>{message}</p>
          {/* Render an interactive button. */}
          {/* Clicks call `{() => dispatch(setAuth('login'))}`. */}
          <button
            className="button primary"
            onClick={
              /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                dispatch(setAuth('login'))
            }
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <form
          className="form-stack"
          onSubmit={
            /* React calls this handler on form submission. The form helper performs its configured validation. */ submit
          }
        >
          {/* Render the right-hand content only when `view === 'register'` is truthy. */}
          {view === 'register' && (
            <label>
              Name
              {/* Render an editable form field. */}
              <input autoComplete="name" {...form.register('display_name')} />
              {/* Render the span element styled by `"field-error"`. */}
              <span className="field-error">
                {/* Insert `form.formState.errors.display_name?.message` into this part of the interface. */}
                {form.formState.errors.display_name?.message}
              </span>
            </label>
          )}
          {/* Render the field label. */}
          <label>
            Email
            {/* Render an editable form field. */}
            {/* The control type is `"email"`. */}
            <input
              type="email"
              autoComplete="email"
              {...form.register('email')}
            />
            {/* Render the span element styled by `"field-error"`. */}
            <span className="field-error">
              {/* Insert `form.formState.errors.email?.message` into this part of the interface. */}
              {form.formState.errors.email?.message}
            </span>
          </label>
          {/* Render the right-hand content only when `view !== 'forgot'` is truthy. */}
          {view !== 'forgot' && (
            <label>
              Password
              {/* Render an editable form field. */}
              {/* The control type is `"password"`. */}
              <input
                type="password"
                autoComplete={
                  view === 'register' ? 'new-password' : 'current-password'
                }
                {...form.register('password')}
              />
              {/* Render the span element styled by `"field-error"`. */}
              <span className="field-error">
                {/* Insert `form.formState.errors.password?.message` into this part of the interface. */}
                {form.formState.errors.password?.message}
              </span>
            </label>
          )}
          {/* Render the right-hand content only when `form.formState.errors.root` is truthy. */}
          {form.formState.errors.root && (
            <p className="field-error" role="alert">
              {/* Insert `form.formState.errors.root.message` into this part of the interface. */}
              {form.formState.errors.root.message}
            </p>
          )}
          {/* Render an interactive button. */}
          {/* The control is disabled when `{form.formState.isSubmitting}`. */}
          <button
            className="button primary"
            disabled={
              /* A truthy value prevents interaction with this control, such as while its request is pending. */ form
                .formState.isSubmitting
            }
          >
            {/* Choose the rendered branch from `form.formState.isSubmitting`; the ? branch is used when true and the : branch otherwise. */}
            {form.formState.isSubmitting
              ? 'Please wait…'
              : view === 'login'
                ? 'Sign In'
                : view === 'register'
                  ? 'Create Account'
                  : 'Send Reset Link'}
          </button>
          {/* Switch between email login, registration, and password recovery. */}
          {/* Render the div element styled by `"form-links"`. */}
          <div className="form-links">
            {/* Choose the rendered branch from `view === 'login'`; the ? branch is used when true and the : branch otherwise. */}
            {view === 'login' ? (
              <>
                {/* Render an interactive button. */}
                {/* The control type is `"button"`. */}
                {/* Clicks call `{() => dispatch(setAuth('forgot'))}`. */}
                <button
                  type="button"
                  className="text-button"
                  onClick={
                    /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                      dispatch(setAuth('forgot'))
                  }
                >
                  Forgot Password?
                </button>
                {/* Render an interactive button. */}
                {/* The control type is `"button"`. */}
                {/* Clicks call `{() => dispatch(setAuth('register'))}`. */}
                <button
                  type="button"
                  className="text-button"
                  onClick={
                    /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                      dispatch(setAuth('register'))
                  }
                >
                  Create Account
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-button"
                onClick={
                  /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
                    dispatch(setAuth('login'))
                }
              >
                Back to Sign In
              </button>
            )}
          </div>
          {/* Render the right-hand content only when `view === 'login'` is truthy. */}
          {view === 'login' && <GoogleButton />}
        </form>
      )}
    </Modal>
  )
}
/** Hold an email-link token in memory, remove it from the visible URL, and submit verification/reset. */
export function AuthTokenPage(
  /* Destructure the component inputs into the local names listed below. The following type describes each prop. */ {
    reset = false,
  }: { reset?: boolean },
) {
  // Keep `[params, setParams]` as the current URL query parameters and the router function that updates them.
  const [params, setParams] = useSearchParams()
  // Capture the email token before the effect removes it from the browser address bar.
  // Keep `[token]` as React state initialized from `() => params.get('token') || ''`; the first tuple value is current state and the second is its setter.
  const [token] = useState(() => params.get('token') || '')
  // Keep `[action, actionState]` as the RTK Query mutation tuple from `api.useAuthActionMutation`; its trigger sends a request when explicitly called.
  // Keep `[message, setMessage]` as React state initialized from `''`; the first tuple value is current state and the second is its setter.
  // Keep `[failed, setFailed]` as React state initialized from `false`; the first tuple value is current state and the second is its setter.
  const [action, actionState] = api.useAuthActionMutation(),
    [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false)
  // Keep `form` as the result returned by `useForm` with these arguments.
  const form = useForm({
    // Connect form validation to the schema before submission.
    resolver: zodResolver(
      z.object({
        // Set the `password` field to the Zod validation rule `z.string().min(12, 'Use at least 12 characters.').max(128)`.
        password: z.string().min(12, 'Use at least 12 characters.').max(128),
      }),
    ),
    // The initial values assigned to the form fields.
    defaultValues: { password: '' },
  })
  // Run this effect after rendering and rerun it when a value in `[params, setParams]` changes.
  useEffect(() => {
    // Call `document .querySelector('meta[name="referrer"]') ?.setAttribute` with the arguments below to perform this step.
    document
      .querySelector('meta[name="referrer"]')
      ?.setAttribute('content', 'no-referrer')
    // Take this branch only when `params.has('token')` is truthy.
    if (params.has('token')) setParams({}, { replace: true })
  }, [params, setParams])
  // Submit the captured token to verification or password reset and display the resulting message.
  // Keep `consume` as a callback that runs when it is called and returns a promise.
  const consume = async (password?: string) => {
    // Call `setFailed` with `false` to update its state or routed value.
    setFailed(false)
    // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
    try {
      // Take this branch only when `!token` is truthy.
      if (!token)
        // Stop this operation by throwing the following error to its caller or catch block.
        throw new Error(
          'This link is missing its token. Request a fresh email.',
        )
      // Keep `result` as the completed result of `action({ path: reset ? 'password/reset/confirm' : 'email/verify', body: reset ? { token, password: password...`; await pauses this async function until the promise settles.
      const result = await action({
        // Set the `path` field to a choice between two values based on `reset`.
        path: reset ? 'password/reset/confirm' : 'email/verify',
        // The JSON request content sent to the backend.
        body: reset ? { token, password: password! } : { token },
      }).unwrap()
      // Call `setMessage` with `result.detail` to update its state or routed value.
      setMessage(result.detail)
    } catch (e) {
      // Call `setFailed` with `true` to update its state or routed value.
      setFailed(true)
      // Call `setMessage` with `errorMessage(e)` to update its state or routed value.
      setMessage(errorMessage(e))
    }
  }
  return (
    <div className="auth-token-page">
      {/* Render the h1 element. */}
      <h1>{reset ? 'Choose a new password' : 'Verify your email'}</h1>
      {/* Render the right-hand content only when `message` is truthy. */}
      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
      {/* Choose the rendered branch from `reset`; the ? branch is used when true and the : branch otherwise. */}
      {reset ? (
        <form
          className="form-stack"
          onSubmit={
            /* React calls this handler on form submission. The form helper performs its configured validation. */ form.handleSubmit(
              (v) => consume(v.password),
            )
          }
        >
          {/* Render the field label. */}
          <label>
            New password
            {/* Render an editable form field. */}
            {/* The control type is `"password"`. */}
            <input
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {/* Render the span element styled by `"field-error"`. */}
            <span className="field-error">
              {/* Insert `form.formState.errors.password?.message` into this part of the interface. */}
              {form.formState.errors.password?.message}
            </span>
          </label>
          {/* Render an interactive button. */}
          {/* The control is disabled when `{ form.formState.isSubmitting || actionState.isLoading || Boolean(message && !failed) }`. */}
          <button
            className="button primary"
            disabled={
              /* A truthy value prevents interaction with this control, such as while its request is pending. */
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
          disabled={
            /* A truthy value prevents interaction with this control, such as while its request is pending. */ actionState.isLoading ||
            Boolean(message && !failed)
          }
          onClick={
            /* React calls this callback when the control is clicked. The arrow body below performs the action. */ () =>
              void consume()
          }
        >
          Verify Email
        </button>
      )}
      {/* Render a frontend link managed by React Router. */}
      {/* The destination is `"/"`. */}
      <Link className="text-button" to="/">
        Return to Sign In
      </Link>
    </div>
  )
}
