/**
 * Shared setup that runs before our Vitest tests.
 * It adds readable DOM assertions, clears rendered components after each test, and supplies missing browser APIs.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Bring in the exported helpers/components from `@testing-library/jest-dom/vitest`.
import '@testing-library/jest-dom/vitest'
// The test runner’s test declarations, assertions, and lifecycle helpers.
import { afterEach } from 'vitest'
// Helpers that render components and query their simulated browser output.
import { cleanup } from '@testing-library/react'
// Run this setup/cleanup at the lifecycle point named `afterEach`.
afterEach(() => cleanup())
// Update `window.matchMedia` using a callback that runs when it is called.
window.matchMedia = () => ({
  // Set the `matches` field to the boolean false.
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    // Return the boolean false to the caller.
    return false
  },
  // Set the `media` field to the text `''`.
  media: '',
  // Set the `onchange` field to null, representing the absence of a value.
  onchange: null,
})
// Update `Element.prototype.scrollIntoView` using a callback that runs when it is called.
Element.prototype.scrollIntoView = () => {}
// Update `globalThis.ResizeObserver` using the value read from `class { observe() {} unobserve() {} disconnect() {} }`.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
