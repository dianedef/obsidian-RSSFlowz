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
      
      if (!data || !data.feeds) {
        this.logService.warn('Aucun feed trouvé dans les données')
        return
      }

      for (const feed of data.feeds) {
        if (!feed || !feed.url) {
          this.logService.warn('Feed invalide trouvé dans les données')
          continue
        }
        await this.scheduleFeed({
          id: feed.url,
          settings: {
            url: feed.url,
            folder: data.settings?.defaultFolder || 'RSS',
            filterDuplicates: true
          }
        })
      }

      this.logService.info('Planificateur démarré')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur lors de l\'arrêt du planificateur', { error })
      throw error
    }
  }

  async scheduleFeed(feed: FeedData): Promise<void> {
    try {
      if (!feed || !feed.settings?.url) {
        throw new Error('Feed invalide')
      }

      // Arrêter l'intervalle existant s'il y en a un
      if (this.intervals.has(feed.id)) {
        clearInterval(this.intervals.get(feed.id))
      }

      const data = await this.storageService.loadData()
      const updateInterval = data.settings?.defaultUpdateInterval || 60

      const interval = setInterval(async () => {
        try {
          await this.syncService.syncFeed(feed)
          this.logService.debug('Synchronisation planifiée exécutée', { 
            feed: feed.id,
            url: feed.settings.url
          })
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          this.logService.error('Erreur lors de la synchronisation planifiée', { error })
        }
      }, updateInterval * 60 * 1000) // Conversion minutes -> millisecondes

      this.intervals.set(feed.id, interval)
      this.logService.info('Feed planifié', {
        feed: feed.id,
        url: feed.settings.url,
        interval: updateInterval
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur lors de la planification du feed', { error })
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur lors de la déplanification du feed', { error })
      throw error
    }
  }
} 