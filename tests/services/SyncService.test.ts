import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncService } from '../../src/services/SyncService'
import { RSSService } from '../../src/services/RSSService'
import { StorageService } from '../../src/services/StorageService'
import { LogService } from '../../src/services/LogService'
import { App } from 'obsidian'
import { FeedData, RSSFeed, StorageData } from '../../src/types'

describe('SyncService', () => {
  let syncService: SyncService
  let mockApp: App
  let mockRSSService: RSSService
  let mockStorageService: StorageService
  let mockLogService: LogService
  let mockFetchFeed: ReturnType<typeof vi.fn>
  let mockLoadData: ReturnType<typeof vi.fn>
  let mockSaveData: ReturnType<typeof vi.fn>
  let mockCreateFile: ReturnType<typeof vi.fn>
  let mockEnsureFolder: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetchFeed = vi.fn()
    mockLoadData = vi.fn()
    mockSaveData = vi.fn()
    mockCreateFile = vi.fn()
    mockEnsureFolder = vi.fn()

    mockApp = {
      vault: {
        getFiles: vi.fn(),
        getAbstractFileByPath: vi.fn(),
        create: mockCreateFile,
        createFolder: mockEnsureFolder,
        adapter: {
          exists: vi.fn().mockResolvedValue(false)
        }
      },
      workspace: {
        getActiveFile: vi.fn(),
        getActiveViewOfType: vi.fn()
      }
    } as unknown as App

    mockRSSService = {
      fetchFeed: mockFetchFeed
    } as unknown as RSSService

    mockStorageService = {
      loadData: mockLoadData,
      saveData: mockSaveData
    } as unknown as StorageService

    mockLogService = new LogService(mockApp)

    syncService = new SyncService(mockApp, mockRSSService, mockStorageService, mockLogService)
  })

  describe('syncFeed', () => {
    const mockFeed: FeedData = {
      id: 'feed1',
      settings: {
        url: 'https://example.com/feed',
        folder: 'RSS/feed1',
        updateInterval: 60,
        filterDuplicates: true
      }
    }

    const mockRSSFeed: RSSFeed = {
      title: 'Test Feed',
      description: 'Test Description',
      link: 'https://example.com',
      items: [
        {
          title: 'Test Article',
          description: 'Test Content',
          link: 'https://example.com/article',
          pubDate: new Date().toISOString(),
          guid: 'article1'
        }
      ]
    }

    const mockStorageData: StorageData = {
      feeds: [mockFeed],
      settings: {
        defaultUpdateInterval: 60,
        defaultFolder: 'RSS',
        maxItemsPerFeed: 50,
        template: '# {{title}}\n\n{{description}}\n\n{{link}}'
      }
    }

    it('devrait synchroniser un flux avec succès', async () => {
      mockFetchFeed.mockResolvedValue(mockRSSFeed)
      mockLoadData.mockResolvedValue(mockStorageData)
      mockEnsureFolder.mockResolvedValue(undefined)
      mockCreateFile.mockResolvedValue(undefined)

      await syncService.syncFeed(mockFeed)

      expect(mockFetchFeed).toHaveBeenCalledWith(mockFeed.settings.url)
      expect(mockEnsureFolder).toHaveBeenCalledWith(mockFeed.settings.folder)
      expect(mockCreateFile).toHaveBeenCalled()
      expect(mockSaveData).toHaveBeenCalled()
    })

    it('devrait filtrer les articles en double', async () => {
      const lastUpdate = new Date(Date.now() - 3600000).toISOString() // 1 heure avant
      const feedWithLastUpdate = {
        ...mockFeed,
        lastUpdate
      }

      const oldArticle = {
        title: 'Old Article',
        description: 'Old Content',
        link: 'https://example.com/old',
        pubDate: new Date(Date.now() - 7200000).toISOString(), // 2 heures avant
        guid: 'old1'
      }

      const newArticle = {
        title: 'New Article',
        description: 'New Content',
        link: 'https://example.com/new',
        pubDate: new Date().toISOString(),
        guid: 'new1'
      }

      mockFetchFeed.mockResolvedValue({
        ...mockRSSFeed,
        items: [oldArticle, newArticle]
      })
      mockLoadData.mockResolvedValue({
        ...mockStorageData,
        feeds: [feedWithLastUpdate]
      })

      await syncService.syncFeed(feedWithLastUpdate)

      expect(mockCreateFile).toHaveBeenCalledTimes(1)
      expect(mockCreateFile.mock.calls[0][1]).toContain(newArticle.title)
    })

    it('devrait gérer les erreurs de récupération du flux', async () => {
      const error = new Error('Erreur réseau')
      mockFetchFeed.mockRejectedValue(error)
      mockLoadData.mockResolvedValue(mockStorageData)

      await expect(syncService.syncFeed(mockFeed)).rejects.toThrow()
      expect(mockCreateFile).not.toHaveBeenCalled()
    })
  })
}) 