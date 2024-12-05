import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncService } from '../../src/services/SyncService'
import { RSSService } from '../../src/services/RSSService'
import { StorageService } from '../../src/services/StorageService'
import { LogService } from '../../src/services/LogService'
import { Plugin, TFile } from 'obsidian'
import { FeedData, RSSFeed, StorageData } from '../../src/types'
import { MockPlugin, MockVault, MockWorkspace } from '../types/mocks'

describe('SyncService', () => {
  let syncService: SyncService
  let mockPlugin: MockPlugin
  let mockRSSService: RSSService
  let mockStorageService: StorageService
  let mockLogService: LogService
  let mockFetchFeed: ReturnType<typeof vi.fn>
  let mockLoadData: ReturnType<typeof vi.fn>
  let mockSaveData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Création d'un TFile mock pour les tests
    const mockTFile: TFile = {
      path: 'test/path',
      basename: 'test',
      extension: 'md',
      name: 'test.md',
      parent: null,
      vault: {} as any,
      stat: {
        ctime: Date.now(),
        mtime: Date.now(),
        size: 0
      }
    }

    const mockVault: MockVault = {
      adapter: {
        exists: vi.fn().mockResolvedValue(false),
        list: vi.fn(),
        remove: vi.fn(),
        rmdir: vi.fn(),
        mkdir: vi.fn(),
        write: vi.fn()
      },
      getFiles: vi.fn(),
      delete: vi.fn(),
      create: vi.fn().mockImplementation(async () => Promise.resolve(mockTFile)),
      modify: vi.fn().mockImplementation(async () => Promise.resolve()),
      createFolder: vi.fn().mockImplementation(async () => Promise.resolve()),
      getAbstractFileByPath: vi.fn()
    }

    const mockWorkspace: MockWorkspace = {
      getLeaf: vi.fn(),
      getActiveFile: vi.fn(),
      on: vi.fn(),
      getActiveViewOfType: vi.fn()
    }

    mockPlugin = {
      app: {
        vault: mockVault,
        workspace: mockWorkspace
      },
      manifest: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.15.0'
      },
      loadData: vi.fn(),
      saveData: vi.fn(),
      addCommand: vi.fn(),
      addSettingTab: vi.fn(),
      vault: mockVault,
      workspace: mockWorkspace
    }

    // Mock du flux RSS avec 50 articles
    const mockRSSFeed: RSSFeed = {
      title: 'Test Feed',
      description: 'Test Description',
      link: 'https://example.com',
      items: [
        // Article ancien (2h avant)
        {
          title: 'Old Article',
          description: 'Old Content',
          link: 'https://example.com/old',
          pubDate: new Date(Date.now() - 7200000).toISOString(),
          guid: 'old1'
        },
        // Article récent
        {
          title: 'New Article',
          description: 'New Content',
          link: 'https://example.com/new',
          pubDate: new Date().toISOString(),
          guid: 'new1'
        },
        // 48 autres articles
        ...Array.from({ length: 48 }, (_, i) => ({
          title: `Article ${i + 3}`,
          description: `Description ${i + 3}`,
          link: `https://example.com/article${i + 3}`,
          pubDate: new Date().toISOString(),
          guid: `article${i + 3}`
        }))
      ]
    }

    mockFetchFeed = vi.fn().mockResolvedValue(mockRSSFeed)
    mockLoadData = vi.fn()
    mockSaveData = vi.fn()

    mockRSSService = {
      fetchFeed: mockFetchFeed
    } as unknown as RSSService

    mockStorageService = {
      loadData: mockLoadData,
      saveData: mockSaveData
    } as unknown as StorageService

    mockLogService = {
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn()
    } as unknown as LogService

    syncService = new SyncService(mockPlugin as Plugin, mockRSSService, mockStorageService, mockLogService)
  })

  describe('syncFeed', () => {
    it('devrait synchroniser un flux avec succès', async () => {
      const feed: FeedData = {
        id: 'feed1',
        settings: {
          url: 'https://example.com/feed1',
          folder: 'RSS/feed1',
          filterDuplicates: true
        }
      }

      mockLoadData.mockResolvedValue({
        feeds: [feed],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: '# {{title}}\n\n{{description}}\n\n{{link}}'
        }
      })

      await syncService.syncFeed(feed)

      expect(mockFetchFeed).toHaveBeenCalledWith(feed.settings.url)
      expect(mockPlugin.vault.createFolder).toHaveBeenCalledWith(feed.settings.folder)
      expect(mockPlugin.vault.create).toHaveBeenCalled()
      expect(mockSaveData).toHaveBeenCalled()
    })

    it('devrait filtrer les articles en double', async () => {
      const feed: FeedData = {
        id: 'feed2',
        lastUpdate: new Date(Date.now() - 3600000).toISOString(), // 1h avant
        settings: {
          url: 'https://example.com/feed2',
          folder: 'RSS/feed2',
          filterDuplicates: true
        }
      }

      mockLoadData.mockResolvedValue({
        feeds: [feed],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: '# {{title}}\n\n{{description}}\n\n{{link}}'
        }
      })

      await syncService.syncFeed(feed)

      expect(mockPlugin.vault.create).toHaveBeenCalledTimes(49) // Seulement les nouveaux articles
      expect(mockPlugin.vault.create.mock.calls[0][1]).toContain('New Article')
    })

    it('devrait gérer les erreurs de récupération du flux', async () => {
      const feed: FeedData = {
        id: 'feed3',
        settings: {
          url: 'https://example.com/feed3',
          folder: 'RSS/feed3',
          filterDuplicates: true
        }
      }

      mockFetchFeed.mockRejectedValue(new Error('Network error'))
      mockLoadData.mockResolvedValue({
        feeds: [feed],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: '# {{title}}\n\n{{description}}\n\n{{link}}'
        }
      })

      await expect(syncService.syncFeed(feed)).rejects.toThrow()
      expect(mockPlugin.vault.create).not.toHaveBeenCalled()
      expect(mockLogService.error).toHaveBeenCalled()
    })
  })
}) 