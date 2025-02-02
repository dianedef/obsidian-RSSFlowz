import { vi } from 'vitest'

// Mock des fonctions Obsidian
vi.mock('obsidian', () => ({
  Plugin: class {},
  Notice: class {},
  Modal: class {
    titleEl = {
      setText: vi.fn()
    }
    contentEl = {
      empty: vi.fn(),
      createEl: vi.fn(() => ({
        createEl: vi.fn(() => ({
          onclick: null
        }))
      }))
    }
    open = vi.fn()
    close = vi.fn()
  },
  requestUrl: vi.fn()
}))

// Configuration globale pour les tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid'
  }
})

// Autres configurations nécessaires pour les tests
Object.defineProperty(global, 'window', {
  value: {
    URL: {
      createObjectURL: vi.fn(),
      revokeObjectURL: vi.fn()
    }
  }
})

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      click: vi.fn(),
      style: {},
      download: '',
      href: ''
    })),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  }
})

// Configuration pour AppMap
process.env.APPMAP = 'true' 
