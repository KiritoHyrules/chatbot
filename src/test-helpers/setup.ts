import { beforeAll, afterEach, afterAll, vi } from 'vitest'

beforeAll(() => {
  process.env.GEMINI_API_KEY = 'test-key'
  process.env.DASHBOARD_SECRET = 'test-secret'
  process.env.N8N_WEBHOOK_URL = 'http://localhost:9999/webhook'
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => {
  vi.clearAllMocks()
})
