import { Plugin } from 'obsidian'
import { StorageService } from './StorageService'
import { SyncService } from './SyncService'
import { LogService } from './LogService'
import { FeedData } from '../types'

export class SchedulerService {
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(
    private plugin: Plugin,
    private storageService: StorageService,
    private syncService: SyncService,
    private logService: LogService
  ) {}

  async startScheduler(): Promise<void> {
    try {
      const data = await this.storageService.loadData()
      
      for (const feed of data.feeds) {
        await this.scheduleFeed(feed)
      }

      this.logService.info('Planificateur démarré')
    } catch (error) {
      this.logService.error('Erreur lors du démarrage du planificateur', { error })
      throw error
    }
  }

  async stopScheduler(): Promise<void> {
    try {
      for (const interval of this.intervals.values()) {
        clearInterval(interval)
      }
      this.intervals.clear()
      this.logService.info('Planificateur arrêté')
    } catch (error) {
      this.logService.error('Erreur lors de l\'arrêt du planificateur', { error })
      throw error
    }
  }

  async scheduleFeed(feed: FeedData): Promise<void> {
    try {
      // Arrêter l'intervalle existant s'il y en a un
      if (this.intervals.has(feed.id)) {
        clearInterval(this.intervals.get(feed.id))
      }

      const data = await this.storageService.loadData()
      const updateInterval = data.settings.defaultUpdateInterval

      const interval = setInterval(async () => {
        try {
          await this.syncService.syncFeed(feed)
          this.logService.debug('Synchronisation planifiée exécutée', { 
            feed: feed.id,
            url: feed.settings.url
          })
        } catch (error) {
          this.logService.error('Erreur lors de la synchronisation planifiée', {
            feed: feed.id,
            url: feed.settings.url,
            error
          })
        }
      }, updateInterval * 60 * 1000) // Conversion minutes -> millisecondes

      this.intervals.set(feed.id, interval)
      this.logService.info('Feed planifié', {
        feed: feed.id,
        url: feed.settings.url,
        interval: updateInterval
      })
    } catch (error) {
      this.logService.error('Erreur lors de la planification du feed', {
        feed: feed.id,
        error
      })
      throw error
    }
  }

  unscheduleFeed(feedId: string): void {
    try {
      if (this.intervals.has(feedId)) {
        clearInterval(this.intervals.get(feedId))
        this.intervals.delete(feedId)
        this.logService.info('Feed déplanifié', { feed: feedId })
      }
    } catch (error) {
      this.logService.error('Erreur lors de la déplanification du feed', {
        feed: feedId,
        error
      })
      throw error
    }
  }
} 