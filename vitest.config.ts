import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        useAtomics: false,
        maxThreads: 1,
        minThreads: 1
      }
    },
    sequence: {
      hooks: 'list'
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'obsidian': resolve(__dirname, './src/types/obsidian.d.ts')
    }
  }
}) 