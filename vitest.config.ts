import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    maxWorkers: 1,
    maxConcurrency: 1,
    poolOptions: {
      vmThreads: {
        maxThreads: 1,
        minThreads: 1
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: false,
    sequence: {
      hooks: 'list'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'obsidian': resolve(__dirname, './src/types/obsidian.d.ts')
    }
  }
}) 