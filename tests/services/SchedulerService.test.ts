import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { App } from 'obsidian'
import { SchedulerService } from '../../src/services/SchedulerService'
import { SyncService } from '../../src/services/SyncService'
import { StorageService } from '../../src/services/StorageService'
import { FeedData, StorageData } from '../../src/types'

describe('SchedulerService', () => {
  let app: App
  let syncService: SyncService
  let storageService: StorageService
  let schedulerService: SchedulerService
  let mockSyncFeed: ReturnType<typeof vi.fn>
  let mockLoadData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    
    mockSyncFeed = vi.fn()
    mockLoadData = vi.fn()

    syncService = { syncFeed: mockSyncFeed } as unknown as SyncService
    storageService = { loadData: mockLoadData } as unknown as StorageService
    app = {} as App

    schedulerService = new SchedulerService(app, syncService, storageService)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('startScheduler', () => {
    it('devrait démarrer la planification pour tous les flux', async () => {
      const testData: StorageData = {
        feeds: [
          {
            id: '1',
            settings: {
              url: 'https://test1.com',
              folder: 'Test1',
              updateInterval: 30,
              filterDuplicates: true
            }
          },
          {
            id: '2',
            settings: {
              url: 'https://test2.com',
              folder: 'Test2',
              updateInterval: 60,
              filterDuplicates: false
            }
          }
        ],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: 'test'
        }
      }

      mockLoadData.mockResolvedValue(testData)

      await schedulerService.startScheduler()

      vi.advanceTimersByTime(30 * 60 * 1000) // Avance de 30 minutes
      expect(mockSyncFeed).toHaveBeenCalledWith(testData.feeds[0])

      vi.advanceTimersByTime(30 * 60 * 1000) // Avance de 30 minutes supplémentaires
      expect(mockSyncFeed).toHaveBeenCalledWith(testData.feeds[1])
    })
  })

  describe('stopScheduler', () => {
    it('devrait arrêter tous les planificateurs', async () => {
      const feed: FeedData = {
        id: '1',
        settings: {
          url: 'https://test.com',
          folder: 'Test',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      schedulerService.scheduleFeed(feed)
      await schedulerService.stopScheduler()

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).not.toHaveBeenCalled()
    })
  })

  describe('scheduleFeed', () => {
    it('devrait planifier la synchronisation d\'un flux', () => {
      const feed: FeedData = {
        id: '1',
        settings: {
          url: 'https://test.com',
          folder: 'Test',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      schedulerService.scheduleFeed(feed)

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).toHaveBeenCalledWith(feed)
    })

    it('devrait remplacer un planificateur existant', () => {
      const feed: FeedData = {
        id: '1',
        settings: {
          url: 'https://test.com',
          folder: 'Test',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      schedulerService.scheduleFeed(feed)
      schedulerService.scheduleFeed({ ...feed, settings: { ...feed.settings, updateInterval: 60 } })

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).not.toHaveBeenCalled()

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).toHaveBeenCalled()
    })
  })

  describe('unscheduleFeed', () => {
    it('devrait arrêter la planification d\'un flux', () => {
      const feed: FeedData = {
        id: '1',
        settings: {
          url: 'https://test.com',
          folder: 'Test',
          updateInterval: 30,
          filterDuplicates: true
        }
      }

      schedulerService.scheduleFeed(feed)
      schedulerService.unscheduleFeed(feed.id)

      vi.advanceTimersByTime(30 * 60 * 1000)
      expect(mockSyncFeed).not.toHaveBeenCalled()
    })
  })
}) 