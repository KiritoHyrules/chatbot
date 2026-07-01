import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/flows/**',
        'src/provider/**',
        'src/database/index.ts',
        'src/database/supabase.ts',
        'src/app.ts',
        'src/test-helpers/**',
      ],
      thresholds: {
        statements: 50,
        branches: 45,
        functions: 50,
        lines: 50,
      },
    },
  },
})
