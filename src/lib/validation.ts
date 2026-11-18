/** Configure schema validation before any application schema is created. */
import { z } from 'zod'

// Interpreted validation works under script-src 'self' and avoids Zod's dynamic Function probe.
z.config({ jitless: true })

export { z }
