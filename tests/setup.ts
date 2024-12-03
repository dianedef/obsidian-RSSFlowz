import { vi } from 'vitest'

// Mock Obsidian
vi.mock('obsidian', () => {
  const Notice = vi.fn()
  const requestUrl = vi.fn()
  
  return {
    App: vi.fn().mockImplementation(() => ({
      vault: {
        getFiles: vi.fn(),
        getAbstractFileByPath: vi.fn(),
        create: vi.fn(),
        createBinary: vi.fn(),
        adapter: {
          exists: vi.fn(),
          mkdir: vi.fn(),
          list: vi.fn(),
          remove: vi.fn(),
          rmdir: vi.fn()
        }
      },
      workspace: {
        getActiveFile: vi.fn(),
        getActiveViewOfType: vi.fn(),
        getLeaf: vi.fn()
      }
    })),
    Plugin: vi.fn().mockImplementation(() => ({
      addSettingTab: vi.fn(),
      addCommand: vi.fn(),
      loadData: vi.fn(),
      saveData: vi.fn()
    })),
    TFile: vi.fn().mockImplementation(() => ({
      path: '',
      name: '',
      vault: null,
      stat: { mtime: 0 }
    })),
    PluginSettingTab: vi.fn(),
    Setting: vi.fn(),
    Notice,
    requestUrl
  }
})

// Setup global test environment
global.window = {
  document: {
    createElement: vi.fn(() => ({
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      setAttribute: vi.fn(),
      style: {}
    })),
    head: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  }
} as any

global.document = global.window.document as any

// Setup Vitest globals
beforeEach(() => {
  vi.clearAllMocks()
  // Reset document.head
  Object.defineProperty(global.document, 'head', {
    value: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    },
    writable: true
  })
}) 