import { Plugin } from 'obsidian'
import { StorageService } from './StorageService'
import { SyncService } from './SyncService'
import { LogService } from './LogService'
import { Feed } from '../types/rss'
import { PluginSettings, FetchFrequency } from '../types/settings'

/**
 * Manages automatic feed synchronization on configurable schedules
 * 
 * Scheduling strategy:
 * - Main interval: Checks every minute if sync is needed (global)
 * - Per-feed intervals: Each feed can sync independently (hourly)
 * - User-configurable: startup, hourly, or daily sync frequency
 * 
 * Design rationale:
 * - Separate intervals allow different feeds to sync at different times
 * - Main interval prevents drift (checks if sync needed based on lastFetch)
 * - Window.setInterval used for browser compatibility
 * - All intervals registered with Obsidian for proper cleanup
 * 
 * Why not cron?: Obsidian plugins use browser APIs, not Node.js
 */
export class SchedulerService {
  // Per-feed intervals for independent scheduling
  private intervals: Map<string, number> = new Map()
  
  // Main interval checks if global sync is needed
  private mainInterval?: number

  constructor(
    private plugin: Plugin,
    private storageService: StorageService,
    private syncService: SyncService,
    private logService: LogService
  ) {}

  /**
   * Initialize automatic feed synchronization
   * 
   * Two-level scheduling:
   * 1. Main interval (every minute): Checks if global sync needed based on frequency setting
   * 2. Per-feed intervals (hourly): Each active feed syncs independently
   * 
   * Frequency options:
   * - 'startup': Sync once on plugin load, then wait for manual triggers
   * - 'hourly': Check every minute if an hour has passed since last sync
   * - 'daily': Check every minute if 24 hours have passed since last sync
   * 
   * Why check every minute instead of setting exact intervals?
   * - Handles computer sleep/wake gracefully
   * - Allows settings changes to take effect without restart
   * - Prevents drift from accumulated timing errors
   * 
   * Why separate per-feed intervals?
   * - Large feed counts don't all hit servers simultaneously
   * - Failed feeds don't block other feeds
   * - User can disable individual feeds
   */
  async startScheduler(): Promise<void> {
    try {
      const data = await this.storageService.loadData()
      
      if (!data || !data.settings) {
        this.logService.warn('Aucune donnée ou paramètres trouvés lors du démarrage du planificateur', {
          dataExists: !!data,
          settingsExist: !!data?.settings
        })
        return
      }

      this.logService.debug('Démarrage du planificateur', {
        fetchFrequency: data.settings.fetchFrequency,
        feedCount: data.feeds?.length || 0
      })
      
      // 'startup' mode: Sync immediately then rely on manual triggers
      if (data.settings.fetchFrequency === 'startup') {
        this.logService.info('Synchronisation initiale au démarrage')
        await this.syncService.syncAllFeeds()
      }

      // Main interval: Check every minute if sync is due
      // This approach handles sleep/wake and setting changes gracefully
      this.mainInterval = window.setInterval(async () => {
        try {
          const currentData = await this.storageService.loadData()
          const now = Date.now()
          const timeSinceLastFetch = now - currentData.settings.lastFetch

          this.logService.debug('Vérification des mises à jour', {
            timeSinceLastFetch,
            fetchFrequency: currentData.settings.fetchFrequency
          })

          // Daily: 86400000ms = 24 hours
          if (currentData.settings.fetchFrequency === 'daily' && timeSinceLastFetch >= 86400000) {
            this.logService.info('Exécution de la synchronisation quotidienne')
            await this.syncService.syncAllFeeds()
            await this.updateLastFetchTime(currentData.settings)
          } 
          // Hourly: 3600000ms = 1 hour
          else if (currentData.settings.fetchFrequency === 'hourly' && timeSinceLastFetch >= 3600000) {
            this.logService.info('Exécution de la synchronisation horaire')
            await this.syncService.syncAllFeeds()
            await this.updateLastFetchTime(currentData.settings)
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          this.logService.error('Erreur lors de la vérification des mises à jour', { error })
        }
      }, 60000) // Check every 60 seconds

      // Register interval with Obsidian for automatic cleanup on unload
      this.plugin.registerInterval(this.mainInterval)
      
      // Schedule each active feed independently (hourly intervals)
      const activeFeeds = data.feeds?.filter(feed => feed.settings.status === 'active') || [];
      this.logService.info('Démarrage des intervalles individuels', {
        activeFeedCount: activeFeeds.length
      })

      for (const feed of activeFeeds) {
        try {
          await this.scheduleFeed(feed as Feed)
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          this.logService.error(`Erreur lors de la planification du feed ${feed.settings.title}`, { error })
        }
      }
      
      this.logService.info('Planificateur démarré avec succès', {
        mainIntervalId: this.mainInterval,
        individualIntervalsCount: this.intervals.size
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur critique lors du démarrage du planificateur', { error })
      throw error
    }
  }

  async stopScheduler(): Promise<void> {
    try {
      this.logService.debug('Arrêt du planificateur en cours')

      if (this.mainInterval) {
        window.clearInterval(this.mainInterval)
        this.mainInterval = undefined
        this.logService.debug('Intervalle principal arrêté')
      }
      
      // Nettoyer tous les intervalles individuels
      const intervalCount = this.intervals.size
      for (const [feedId, interval] of this.intervals.entries()) {
        try {
          window.clearInterval(interval)
          this.logService.debug('Intervalle individuel arrêté', { feedId })
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          this.logService.warn(`Erreur lors de l'arrêt de l'intervalle pour le feed ${feedId}`, { error })
        }
      }
      this.intervals.clear()
      
      this.logService.info('Planificateur arrêté avec succès', { intervalsStopped: intervalCount })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur lors de l\'arrêt du planificateur', { 
        error,
        mainIntervalExists: !!this.mainInterval,
        remainingIntervals: this.intervals.size
      })
      throw error
    }
  }

  /**
   * Schedule automatic syncs for a single feed
   * 
   * Per-feed scheduling allows:
   * - Individual feeds to update independently
   * - Failed feeds not to block others
   * - User to enable/disable feeds without affecting others
   * 
   * Implementation:
   * - One hour interval per feed (3600000ms)
   * - Old interval cleared before creating new one (idempotent)
   * - Only active feeds are scheduled
   * - Intervals registered with Obsidian for cleanup
   * 
   * Why hourly per-feed in addition to global scheduling?
   * - Distributes load (not all feeds sync at once)
   * - Some feeds update more frequently than others
   * - Provides backup if main interval fails
   */
  async scheduleFeed(feed: Feed): Promise<void> {
    try {
      if (!feed || !feed.settings) {
        throw new Error('Feed invalide ou paramètres manquants')
      }

      this.logService.debug('Planification du feed', {
        feedId: feed.id,
        title: feed.settings.title,
        status: feed.settings.status
      })

      // Clean up existing interval if any (idempotent operation)
      if (this.intervals.has(feed.id)) {
        window.clearInterval(this.intervals.get(feed.id))
        this.logService.debug('Ancien intervalle nettoyé', { feedId: feed.id })
      }

      // Only schedule active feeds
      if (feed.settings.status === 'active') {
        const updateInterval = 3600000 // 1 hour in milliseconds
        const interval = window.setInterval(async () => {
          try {
            this.logService.debug('Exécution de la synchronisation planifiée', { 
              feedId: feed.id, 
              title: feed.settings.title 
            })

            await this.syncService.syncFeed(feed)
            const data = await this.storageService.loadData()
            await this.updateLastFetchTime(data.settings)

            this.logService.info('Synchronisation planifiée réussie', { 
              feedId: feed.id, 
              title: feed.settings.title 
            })
          } catch (err) {
            // Log error but don't stop interval (feed might recover)
            const error = err instanceof Error ? err : new Error(String(err))
            this.logService.error('Erreur lors de la synchronisation planifiée', {
              error,
              feedId: feed.id,
              title: feed.settings.title,
              interval: updateInterval
            })
          }
        }, updateInterval)

        this.intervals.set(feed.id, interval)
        this.plugin.registerInterval(interval)  // Register for automatic cleanup

        this.logService.info('Feed planifié avec succès', {
          feedId: feed.id,
          title: feed.settings.title,
          interval: updateInterval
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur lors de la planification du feed', {
        error,
        feedId: feed.id
      })
      throw error
    }
  }

  unscheduleFeed(feedId: string): void {
    try {
      this.logService.debug('Déplanification du feed', { feedId })

      if (this.intervals.has(feedId)) {
        window.clearInterval(this.intervals.get(feedId))
        this.intervals.delete(feedId)
        this.logService.info('Feed déplanifié avec succès', { feedId })
      } else {
        this.logService.warn('Tentative de déplanification d\'un feed non planifié', { feedId })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur lors de la déplanification du feed', {
        error,
        feedId
      })
      throw error
    }
  }

  private async updateLastFetchTime(settings: PluginSettings): Promise<void> {
    try {
      settings.lastFetch = Date.now()
      const currentData = await this.storageService.loadData()
      await this.storageService.saveData({
        ...currentData,
        settings
      })
      this.logService.debug('Temps de dernière synchronisation mis à jour', {
        lastFetch: settings.lastFetch
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error('Erreur lors de la mise à jour du temps de dernière synchronisation', { error })
      throw error
    }
  }
} 