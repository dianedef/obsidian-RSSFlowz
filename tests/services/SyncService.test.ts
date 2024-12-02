import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App } from 'obsidian'
import { SyncService } from '../../src/services/SyncService'
import { RSSService } from '../../src/services/RSSService'
import { StorageService } from '../../src/services/StorageService'
import { FeedData, RSSFeed, StorageData } from '../../src/types'

describe('SyncService', () => {
  let app: App
  let rssService: RSSService
  let storageService: StorageService
  let syncService: SyncService
  let mockFetchFeed: ReturnType<typeof vi.fn>
  let mockLoadData: ReturnType<typeof vi.fn>
  let mockSaveData: ReturnType<typeof vi.fn>
  let mockCreateFile: ReturnType<typeof vi.fn>
  let mockExists: ReturnType<typeof vi.fn>
  let mockCreateFolder: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetchFeed = vi.fn()
    mockLoadData = vi.fn()
    mockSaveData = vi.fn()
    mockCreateFile = vi.fn()
    mockExists = vi.fn()
    mockCreateFolder = vi.fn()

    rssService = { fetchFeed: mockFetchFeed } as unknown as RSSService
    storageService = {
      loadData: mockLoadData,
      saveData: mockSaveData
    } as unknown as StorageService

    app = {
      vault: {
        create: mockCreateFile,
        adapter: {
          exists: mockExists
        },
        createFolder: mockCreateFolder
      }
    } as unknown as App

    syncService = new SyncService(app, rssService, storageService)
  })

  describe('syncFeed', () => {
    const mockFeed: FeedData = {
      id: '1',
      settings: {
        url: 'https://test.com/feed',
        folder: 'Test',
        updateInterval: 60,
        filterDuplicates: true
      }
    }

    const mockRSSFeed: RSSFeed = {
      title: 'Test Feed',
      description: 'Test Description',
      link: 'https://test.com',
      items: [
        {
          title: 'Article 1',
          description: 'Description 1',
          link: 'https://test.com/1',
          pubDate: '2023-12-02T12:00:00Z'
        },
        {
          title: 'Article 2',
          description: 'Description 2',
          link: 'https://test.com/2',
          pubDate: '2023-12-02T13:00:00Z'
        }
      ]
    }

    const mockStorageData: StorageData = {
      feeds: [mockFeed],
      settings: {
        defaultUpdateInterval: 60,
        defaultFolder: 'RSS',
        maxItemsPerFeed: 50,
        template: '# {{title}}\n\n{{description}}\n\n{{link}}\n\n{{pubDate}}'
      }
    }

    it('devrait synchroniser un flux avec succès', async () => {
      mockFetchFeed.mockResolvedValue(mockRSSFeed)
      mockLoadData.mockResolvedValue(mockStorageData)
      mockExists.mockResolvedValue(false)

      await syncService.syncFeed(mockFeed)

      expect(mockCreateFolder).toHaveBeenCalledWith('Test')
      expect(mockCreateFile).toHaveBeenCalledTimes(2)
      expect(mockSaveData).toHaveBeenCalled()
      expect(mockFeed.error).toBeUndefined()
    })

    it('devrait filtrer les articles en double', async () => {
      const lastUpdate = '2023-12-02T12:30:00Z'
      mockFetchFeed.mockResolvedValue(mockRSSFeed)
      mockLoadData.mockResolvedValue(mockStorageData)
      mockExists.mockResolvedValue(false)

      await syncService.syncFeed({
        ...mockFeed,
        lastUpdate
      })

      expect(mockCreateFile).toHaveBeenCalledTimes(1)
    })

    it('devrait gérer les erreurs de synchronisation', async () => {
      const error = new Error('Erreur de test')
      mockFetchFeed.mockRejectedValue(error)
      mockLoadData.mockResolvedValue(mockStorageData)

      await expect(syncService.syncFeed(mockFeed)).rejects.toThrow(error)
      expect(mockFeed.error).toBe(error.message)
    })

    it('devrait respecter la limite d\'articles par flux', async () => {
      mockFetchFeed.mockResolvedValue({
        ...mockRSSFeed,
        items: Array(10).fill(mockRSSFeed.items[0])
      })
      mockLoadData.mockResolvedValue({
        ...mockStorageData,
        settings: {
          ...mockStorageData.settings,
          maxItemsPerFeed: 5
        }
      })
      mockExists.mockResolvedValue(false)

      await syncService.syncFeed(mockFeed)

      expect(mockCreateFile).toHaveBeenCalledTimes(5)
    })

    it('devrait sauter les articles existants', async () => {
      mockFetchFeed.mockResolvedValue(mockRSSFeed)
      mockLoadData.mockResolvedValue(mockStorageData)
      mockExists.mockResolvedValue(true)

      await syncService.syncFeed(mockFeed)

      expect(mockCreateFile).not.toHaveBeenCalled()
    })
  })
}) 