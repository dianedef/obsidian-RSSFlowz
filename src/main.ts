import { Plugin as ObsidianPlugin, App } from 'obsidian'
import { RSSReaderSettingsTab } from './ui/SettingsTab'
import { 
  RSSService, 
  StorageService, 
  SyncService, 
  SchedulerService,
  I18nService 
} from './services'
import { PluginSettings, FeedData } from './types'

export class RSSReaderPlugin extends ObsidianPlugin {
  settings!: PluginSettings
  private rssService!: RSSService
  private storageService!: StorageService
  private syncService!: SyncService
  private schedulerService!: SchedulerService
  private i18nService!: I18nService

  async onload() {
    // Initialisation des services
    this.i18nService = new I18nService(this.app)
    this.rssService = new RSSService()
    this.storageService = new StorageService(this.app)
    this.syncService = new SyncService(this.app, this.rssService, this.storageService)
    this.schedulerService = new SchedulerService(this.app, this.syncService, this.storageService)

    // Chargement des données et initialisation des settings
    await this.loadSettings()

    // Ajout de l'onglet de paramètres
    this.addSettingTab(new RSSReaderSettingsTab(this.app, this))

    // Démarrage du planificateur
    await this.schedulerService.startScheduler()

    // Commandes
    this.addCommand({
      id: 'refresh-all-feeds',
      name: this.i18nService.t('commands.refresh.name'),
      callback: async () => {
        const data = await this.storageService.loadData()
        for (const feed of data.feeds) {
          try {
            await this.syncService.syncFeed(feed)
          } catch (error) {
            console.error(
              this.i18nService.t('notices.feed.fetchError', { title: feed.settings.url }),
              error
            )
          }
        }
      }
    })

    this.addCommand({
      id: 'add-feed',
      name: this.i18nService.t('commands.addFeed.name'),
      callback: () => {
        // TODO: Implémenter l'interface d'ajout de flux
      }
    })
  }

  async onunload() {
    await this.schedulerService.stopScheduler()
  }

  async loadSettings() {
    const data = await this.storageService.loadData()
    this.settings = data.settings
  }

  async saveSettings() {
    const data = await this.storageService.loadData()
    data.settings = this.settings
    await this.storageService.saveData(data)
  }

  async addFeed(feedData: FeedData) {
    const data = await this.storageService.loadData()
    data.feeds.push(feedData)
    await this.storageService.saveData(data)
    this.schedulerService.scheduleFeed(feedData)
  }

  async removeFeed(feedId: string) {
    const data = await this.storageService.loadData()
    data.feeds = data.feeds.filter(feed => feed.id !== feedId)
    await this.storageService.saveData(data)
    this.schedulerService.unscheduleFeed(feedId)
  }

  async updateFeed(feedData: FeedData) {
    const data = await this.storageService.loadData()
    const index = data.feeds.findIndex(feed => feed.id === feedData.id)
    if (index !== -1) {
      data.feeds[index] = feedData
      await this.storageService.saveData(data)
      this.schedulerService.scheduleFeed(feedData)
    }
  }

  // Méthode utilitaire pour accéder au service de traduction
  t(key: string, params: Record<string, string> = {}): string {
    return this.i18nService.t(key, params)
  }
} 