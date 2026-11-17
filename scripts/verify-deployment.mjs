const origin = new URL(process.argv[2] || 'https://movie-trail-ui.vercel.app')
const endpoints = [
  { path: '/api/v1/health/', validate: (data) => data.status === 'ok' },
  { path: '/api/v1/metadata/', validate: (data) => Array.isArray(data.genres) },
  {
    path: '/api/v1/titles/?page_size=12',
    validate: (data) => Array.isArray(data.results),
  },
]

let failed = false
for (const { path, validate } of endpoints) {
  const url = new URL(path, origin)
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(30000),
    })
    const type = response.headers.get('content-type') || ''
    if (!response.ok || !type.toLowerCase().startsWith('application/json')) {
      throw new Error(
        `Expected HTTP 200 JSON, received HTTP ${response.status} ${type}`,
      )
    }
    const data = await response.json()
    if (!validate(data))
      throw new Error('The JSON does not match this endpoint’s response shape')
    console.log(
      `PASS ${url.pathname}${url.search} — HTTP ${response.status} ${type}`,
    )
  } catch (error) {
    failed = true
    console.error(`FAIL ${url.pathname}${url.search} — ${error.message}`)
  }
}
process.exitCode = failed ? 1 : 0
