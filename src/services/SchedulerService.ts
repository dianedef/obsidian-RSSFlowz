import { Plugin } from 'obsidian'
import { StorageService } from './StorageService'
import { SyncService } from './SyncService'
import { LogService } from './LogService'
import { FeedData, Settings } from '../types'

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
        this.logService.warn({
          message: 'Aucune donnée ou paramètres trouvés lors du démarrage du planificateur',
          data: { dataExists: !!data, settingsExist: !!data?.settings }
        })
        return
      }

      this.logService.debug({
        message: 'Démarrage du planificateur',
        data: {
          fetchFrequency: data.settings.fetchFrequency,
          feedCount: data.settings.feeds?.length || 0
        }
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

          this.logService.debug({
            message: 'Vérification des mises à jour',
            data: {
              timeSinceLastFetch,
              fetchFrequency: currentData.settings.fetchFrequency
            }
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
          this.logService.error({
            message: 'Erreur lors de la vérification des mises à jour',
            error,
            data: { mainInterval: this.mainInterval }
          })
        }
      }, 60000) // Vérifier toutes les minutes

      // Enregistrer l'intervalle pour le nettoyage
      this.plugin.registerInterval(this.mainInterval)
      
      // Démarrer les intervalles individuels pour chaque feed actif
      const activeFeeds = data.settings.feeds.filter(feed => feed.settings.status === 'active')
      this.logService.info({
        message: 'Démarrage des intervalles individuels',
        data: { activeFeedCount: activeFeeds.length }
      })

      for (const feed of activeFeeds) {
        try {
          await this.scheduleFeed(feed)
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          this.logService.error({
            message: `Erreur lors de la planification du feed ${feed.settings.title}`,
            error,
            data: { feedId: feed.id }
          })
        }
      }
      
      this.logService.info({
        message: 'Planificateur démarré avec succès',
        data: {
          mainIntervalId: this.mainInterval,
          individualIntervalsCount: this.intervals.size
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error({
        message: 'Erreur critique lors du démarrage du planificateur',
        error,
        data: {
          mainIntervalExists: !!this.mainInterval,
          individualIntervalsCount: this.intervals.size
        }
      })
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
          this.logService.debug({
            message: 'Intervalle individuel arrêté',
            data: { feedId }
          })
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          this.logService.warn({
            message: `Erreur lors de l'arrêt de l'intervalle pour le feed ${feedId}`,
            error
          })
        }
      }
      this.intervals.clear()
      
      this.logService.info({
        message: 'Planificateur arrêté avec succès',
        data: { intervalsStopped: intervalCount }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error({
        message: 'Erreur lors de l\'arrêt du planificateur',
        error,
        data: {
          mainIntervalExists: !!this.mainInterval,
          remainingIntervals: this.intervals.size
        }
      })
      throw error
    }
  }

  async scheduleFeed(feed: FeedData): Promise<void> {
    try {
      if (!feed || !feed.settings) {
        throw new Error('Feed invalide ou paramètres manquants')
      }

      this.logService.debug({
        message: 'Planification du feed',
        data: {
          feedId: feed.id,
          title: feed.settings.title,
          status: feed.settings.status
        }
      })

      // Si un intervalle existe déjà pour ce feed, le nettoyer
      if (this.intervals.has(feed.id)) {
        window.clearInterval(this.intervals.get(feed.id))
        this.logService.debug({
          message: 'Ancien intervalle nettoyé',
          data: { feedId: feed.id }
        })
      }

      // Créer un nouvel intervalle si le feed est actif
      if (feed.settings.status === 'active') {
        const updateInterval = feed.settings.updateInterval || 3600000
        const interval = window.setInterval(async () => {
          try {
            this.logService.debug({
              message: 'Exécution de la synchronisation planifiée',
              data: { feedId: feed.id, title: feed.settings.title }
            })

            await this.syncService.syncFeed(feed)
            const data = await this.storageService.loadData()
            await this.updateLastFetchTime(data.settings)

            this.logService.info({
              message: 'Synchronisation planifiée réussie',
              data: { feedId: feed.id, title: feed.settings.title }
            })
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            this.logService.error({
              message: 'Erreur lors de la synchronisation planifiée',
              error,
              data: {
                feedId: feed.id,
                title: feed.settings.title,
                interval: updateInterval
              }
            })
          }
        }, updateInterval)

        this.intervals.set(feed.id, interval)
        this.plugin.registerInterval(interval)

        this.logService.info({
          message: 'Feed planifié avec succès',
          data: {
            feedId: feed.id,
            title: feed.settings.title,
            interval: updateInterval
          }
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error({
        message: 'Erreur lors de la planification du feed',
        error,
        data: { feedId: feed.id }
      })
      throw error
    }
  }

  unscheduleFeed(feedId: string): void {
    try {
      this.logService.debug({
        message: 'Déplanification du feed',
        data: { feedId }
      })

      if (this.intervals.has(feedId)) {
        window.clearInterval(this.intervals.get(feedId))
        this.intervals.delete(feedId)
        this.logService.info({
          message: 'Feed déplanifié avec succès',
          data: { feedId }
        })
      } else {
        this.logService.warn({
          message: 'Tentative de déplanification d\'un feed non planifié',
          data: { feedId }
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error({
        message: 'Erreur lors de la déplanification du feed',
        error,
        data: { feedId }
      })
      throw error
    }
  }

  private async updateLastFetchTime(settings: Settings): Promise<void> {
    try {
      settings.lastFetch = Date.now()
      await this.storageService.saveData({ settings })
      this.logService.debug({
        message: 'Temps de dernière synchronisation mis à jour',
        data: { lastFetch: settings.lastFetch }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error({
        message: 'Erreur lors de la mise à jour du temps de dernière synchronisation',
        error,
        data: { attemptedLastFetch: Date.now() }
      })
      throw error
    }
  }
} 