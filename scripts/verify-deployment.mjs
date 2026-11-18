/**
 * A read-only Node script for checking a deployed frontend API proxy.
 * It requests health, metadata, and titles on the frontend origin and requires JSON with the expected basic shape.
 * Run npm run verify:deployment, optionally followed by -- and a deployment URL.
 *
 * See docs/FRONTEND_GUIDE.md for the plain-language walkthrough.
 */
// Keep `origin` as a new URL instance initialized with these arguments.
const origin = new URL(process.argv[2] || 'https://movie-trail-ui.vercel.app')
// Each entry supplies the path and a small check for the expected response shape.
// Keep `endpoints` as an array containing these ordered values.
const endpoints = [
  { path: '/api/v1/health/', validate: (data) => data.status === 'ok' },
  { path: '/api/v1/metadata/', validate: (data) => Array.isArray(data.genres) },
  {
    // Set the `path` field to the text `'/api/v1/titles/?page_size=12'`.
    path: '/api/v1/titles/?page_size=12',
    // Set the `validate` field to a callback that runs when it is called.
    validate: (data) => Array.isArray(data.results),
  },
]

// Keep `failed` as the boolean false.
let failed = false
// Check the endpoints one by one and collect failures without stopping after the first one.
// Visit each item in `endpoints` using `const { path, validate }`.
for (const { path, validate } of endpoints) {
  // Keep `url` as a new URL instance initialized with these arguments.
  const url = new URL(path, origin)
  // Attempt these operations; a thrown error transfers control to catch when supplied, and finally runs afterward when supplied.
  try {
    // Keep `response` as the completed result of `fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }, signal: AbortSignal.time...`; await pauses this async function until the promise settles.
    const response = await fetch(url, {
      // Set the `headers` field to an object whose named fields are explained below.
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      // Set the `signal` field to the result returned by `AbortSignal.timeout` with these arguments.
      signal: AbortSignal.timeout(30000),
    })
    // A status of 200 is insufficient when the SPA fallback returns HTML. Require the API JSON content type.
    // Keep `type` as `response.headers.get('content-type')`, falling back to the right-hand value when the left side is falsy.
    const type = response.headers.get('content-type') || ''
    // Take this branch only when `!response.ok || !type.toLowerCase().startsWith('application/json')` is truthy.
    if (!response.ok || !type.toLowerCase().startsWith('application/json')) {
      // Stop this operation by throwing the following error to its caller or catch block.
      throw new Error(
        `Expected HTTP 200 JSON, received HTTP ${response.status} ${type}`,
      )
    }
    // Keep `data` as the completed result of `response.json()`; await pauses this async function until the promise settles.
    const data = await response.json()
    // Take this branch only when `!validate(data)` is truthy.
    if (!validate(data))
      // Stop this operation by throwing the following error to its caller or catch block.
      throw new Error('The JSON does not match this endpoint’s response shape')
    // Call `console.log` with the arguments below to perform this step.
    console.log(
      `PASS ${url.pathname}${url.search} — HTTP ${response.status} ${type}`,
    )
  } catch (error) {
    // Update `failed` using the boolean true.
    failed = true
    // Call `console.error` with the arguments below to perform this step.
    console.error(`FAIL ${url.pathname}${url.search} — ${error.message}`)
  }
}
// A nonzero exit code makes this command useful in a terminal or a future CI verification step.
// Update `process.exitCode` using a choice between two values based on `failed`.
process.exitCode = failed ? 1 : 0
