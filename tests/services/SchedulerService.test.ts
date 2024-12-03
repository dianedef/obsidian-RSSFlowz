import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SchedulerService } from '../../src/services/SchedulerService'
import { SyncService } from '../../src/services/SyncService'
import { StorageService } from '../../src/services/StorageService'
import { App } from 'obsidian'
import { FeedData } from '../../src/types'

describe('SchedulerService', () => {
  let service: SchedulerService
  let mockApp: App
  let mockSyncService: SyncService
  let mockStorageService: StorageService
  let mockSyncFeed: ReturnType<typeof vi.fn>
  let mockLoadData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    mockApp = {
      vault: {
        getFiles: vi.fn(),
        getAbstractFileByPath: vi.fn(),
        create: vi.fn()
      },
      workspace: {
        getActiveFile: vi.fn(),
        getActiveViewOfType: vi.fn()
      }
    } as unknown as App

    mockSyncFeed = vi.fn()
    mockLoadData = vi.fn().mockResolvedValue({
      feeds: [],
      settings: {
        defaultUpdateInterval: 60,
        defaultFolder: 'RSS',
        maxItemsPerFeed: 50,
        template: '# {{title}}\n\n{{description}}\n\n{{link}}'
      }
    })

    mockSyncService = {
      syncFeed: mockSyncFeed
    } as unknown as SyncService

    mockStorageService = {
      loadData: mockLoadData
    } as unknown as StorageService

    service = new SchedulerService(mockApp, mockSyncService, mockStorageService)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('startScheduler', () => {
    it('devrait démarrer le planificateur', async () => {
      const feed: FeedData = {
        id: 'feed1',
        settings: {
          url: 'https://example.com/feed1',
          folder: 'RSS/feed1',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      mockLoadData.mockResolvedValueOnce({
        feeds: [feed],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: '# {{title}}\n\n{{description}}\n\n{{link}}'
        }
      })

      await service.startScheduler()

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).toHaveBeenCalledWith(feed)
    })

    it('devrait planifier plusieurs flux', async () => {
      const feed1: FeedData = {
        id: 'feed1',
        settings: {
          url: 'https://example.com/feed1',
          folder: 'RSS/feed1',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      const feed2: FeedData = {
        id: 'feed2',
        settings: {
          url: 'https://example.com/feed2',
          folder: 'RSS/feed2',
          updateInterval: 60,
          filterDuplicates: true
        }
      }

      mockLoadData.mockResolvedValueOnce({
        feeds: [feed1, feed2],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: '# {{title}}\n\n{{description}}\n\n{{link}}'
        }
      })

      await service.startScheduler()

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).toHaveBeenCalledWith(feed1)
      expect(mockSyncFeed).not.toHaveBeenCalledWith(feed2)

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).toHaveBeenCalledWith(feed2)
    })
  })

  describe('stopScheduler', () => {
    it('devrait arrêter le planificateur', async () => {
      const feed: FeedData = {
        id: 'feed1',
        settings: {
          url: 'https://example.com/feed1',
          folder: 'RSS/feed1',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      mockLoadData.mockResolvedValueOnce({
        feeds: [feed],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: '# {{title}}\n\n{{description}}\n\n{{link}}'
        }
      })

      await service.startScheduler()
      await service.stopScheduler()

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).not.toHaveBeenCalled()
    })
  })

  describe('scheduleFeed', () => {
    it('devrait planifier la synchronisation d\'un nouveau flux', () => {
      const feed: FeedData = {
        id: 'feed1',
        settings: {
          url: 'https://example.com/feed1',
          folder: 'RSS/feed1',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      service.scheduleFeed(feed)

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).toHaveBeenCalledWith(feed)
    })

    it('devrait remplacer la planification existante pour un flux', () => {
      const feed: FeedData = {
        id: 'feed1',
        settings: {
          url: 'https://example.com/feed1',
          folder: 'RSS/feed1',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      service.scheduleFeed(feed)
      
      // Changer l'intervalle
      feed.settings.updateInterval = 60
      service.scheduleFeed(feed)

      // Avancer de 30 minutes (ancien intervalle)
      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).not.toHaveBeenCalled()

      // Avancer de 30 minutes supplémentaires (nouvel intervalle)
      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).toHaveBeenCalledWith(feed)
    })
  })
}) 