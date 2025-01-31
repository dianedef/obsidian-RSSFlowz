import { Plugin } from 'obsidian'
import { StorageService } from './StorageService'
import { SyncService } from './SyncService'
import { LogService } from './LogService'
import { FeedData } from '../types'
import { PluginSettings, FetchFrequency } from '../types/settings'

export class SchedulerService {
  private intervals: Map<string, number> = new Map()
  private mainInterval?: number

  constructor(
    private plugin: Plugin,
    private storageService: StorageService,
    private syncService: SyncService,
    private logService: LogService
  ) {}

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
        feedCount: data.settings.feeds?.length || 0
      })
      
      // Si la fréquence est 'startup', synchroniser immédiatement
      if (data.settings.fetchFrequency === 'startup') {
        this.logService.info('Synchronisation initiale au démarrage')
        await this.syncService.syncAllFeeds()
      }

      // Démarrer l'intervalle principal pour vérifier les mises à jour
      this.mainInterval = window.setInterval(async () => {
        try {
          const currentData = await this.storageService.loadData()
          const now = Date.now()
          const timeSinceLastFetch = now - currentData.settings.lastFetch

          this.logService.debug('Vérification des mises à jour', {
            timeSinceLastFetch,
            fetchFrequency: currentData.settings.fetchFrequency
          })

          if (currentData.settings.fetchFrequency === 'daily' && timeSinceLastFetch >= 86400000) {
            this.logService.info('Exécution de la synchronisation quotidienne')
            await this.syncService.syncAllFeeds()
            await this.updateLastFetchTime(currentData.settings)
          } else if (currentData.settings.fetchFrequency === 'hourly' && timeSinceLastFetch >= 3600000) {
            this.logService.info('Exécution de la synchronisation horaire')
            await this.syncService.syncAllFeeds()
            await this.updateLastFetchTime(currentData.settings)
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          this.logService.error('Erreur lors de la vérification des mises à jour', { error })
        }
      }, 60000) // Vérifier toutes les minutes

      // Enregistrer l'intervalle pour le nettoyage
      this.plugin.registerInterval(this.mainInterval)
      
      // Démarrer les intervalles individuels pour chaque feed actif
      const activeFeeds = data.settings.feeds.filter(feed => feed.settings.status === 'active')
      this.logService.info('Démarrage des intervalles individuels', {
        activeFeedCount: activeFeeds.length
      })

      for (const feed of activeFeeds) {
        try {
          await this.scheduleFeed(feed)
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

  async scheduleFeed(feed: FeedData): Promise<void> {
    try {
      if (!feed || !feed.settings) {
        throw new Error('Feed invalide ou paramètres manquants')
      }

      this.logService.debug('Planification du feed', {
        feedId: feed.id,
        title: feed.settings.title,
        status: feed.settings.status
      })

      // Si un intervalle existe déjà pour ce feed, le nettoyer
      if (this.intervals.has(feed.id)) {
        window.clearInterval(this.intervals.get(feed.id))
        this.logService.debug('Ancien intervalle nettoyé', { feedId: feed.id })
      }

      // Créer un nouvel intervalle si le feed est actif
      if (feed.settings.status === 'active') {
        const updateInterval = feed.settings.updateInterval || 3600000
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
        this.plugin.registerInterval(interval)

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