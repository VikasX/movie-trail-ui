/**
 * These are the Redux hooks with our application types attached.
 * useAppSelector reads state. useAppDispatch sends an action or an API request to the store.
 * The types help the editor catch incorrect field names and action arguments.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// React bindings that make the Redux store available to components.
import { useDispatch, useSelector } from 'react-redux'
// Bring in compile-time types from `@/store`.
import type { AppDispatch, RootState } from '@/store'

// Keep `useAppDispatch` as the result returned by `useDispatch.withTypes` with these arguments.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
// Keep `useAppSelector` as the result returned by `useSelector.withTypes` with these arguments.
export const useAppSelector = useSelector.withTypes<RootState>()
