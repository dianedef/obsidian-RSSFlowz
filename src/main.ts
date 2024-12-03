import { Plugin as ObsidianPlugin, App } from 'obsidian'
import { RSSReaderSettingsTab } from './ui/SettingsTab'
import { 
  RSSService, 
  StorageService, 
  SyncService, 
  SchedulerService,
  I18nService,
  LogService,
  FileService,
  ReadingService,
  OpmlService
} from './services'
import { PluginSettings, FeedData } from './types'

export class RSSReaderPlugin extends ObsidianPlugin {
  settings: PluginSettings
  
  // Services
  private storageService: StorageService
  private logService: LogService
  private i18nService: I18nService
  private fileService: FileService
  private rssService: RSSService
  private syncService: SyncService
  private schedulerService: SchedulerService
  private readingService: ReadingService
  private opmlService: OpmlService

  async onload() {
    // Initialisation des services
    this.logService = new LogService(this.app)
    this.storageService = new StorageService(this.app)
    this.i18nService = new I18nService(this.app)
    this.fileService = new FileService(this.app)
    this.rssService = new RSSService(this.app, this.logService)
    this.syncService = new SyncService(this.app, this.rssService, this.storageService, this.logService)
    this.schedulerService = new SchedulerService(this.app, this.syncService, this.storageService)
    this.readingService = new ReadingService(this.app, this.storageService, this.logService)
    this.opmlService = new OpmlService(this.app, this.storageService, this.logService)

    // Chargement des paramètres
    await this.loadSettings()

    // Ajout de l'onglet de paramètres
    this.addSettingTab(new RSSReaderSettingsTab(this.app, this))

    // Démarrage du planificateur
    await this.schedulerService.startScheduler()

    // Commandes
    this.addCommand({
      id: 'refresh-feeds',
      name: this.i18nService.t('commands.refresh.name'),
      callback: async () => {
        this.logService.info(this.i18nService.t('commands.refresh.start'))
        const data = await this.storageService.loadData()
        for (const feed of data.feeds) {
          await this.syncService.syncFeed(feed).catch(error => {
            this.logService.error(
              this.i18nService.t('commands.refresh.error', { url: feed.settings.url }),
              error
            )
          })
        }
        this.logService.info(this.i18nService.t('commands.refresh.complete'))
      }
    })

    this.addCommand({
      id: 'import-opml',
      name: this.i18nService.t('commands.import.name'),
      callback: async () => {
        // TODO: Ajouter l'interface utilisateur pour l'import OPML
      }
    })

    this.addCommand({
      id: 'export-opml',
      name: this.i18nService.t('commands.export.name'),
      callback: async () => {
        try {
          const opml = await this.opmlService.exportOpml()
          const path = 'RSS/export.opml'
          await this.app.vault.create(path, opml)
          this.logService.info(this.i18nService.t('commands.export.success', { path }))
        } catch (error) {
          this.logService.error(this.i18nService.t('commands.export.error'), error)
        }
      }
    })

    this.addCommand({
      id: 'toggle-reading-mode',
      name: this.i18nService.t('commands.reading.toggle'),
      callback: () => {
        if (this.readingService.isActive()) {
          this.readingService.exitReadingMode()
        } else {
          this.readingService.enterReadingMode()
        }
      }
    })

    this.logService.info(this.i18nService.t('plugin.loaded'))
  }

  async onunload() {
    await this.schedulerService.stopScheduler()
    this.logService.info(this.i18nService.t('plugin.unloaded'))
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

  // Méthodes utilitaires pour la gestion des flux
  async addFeed(feedData: FeedData) {
    const data = await this.storageService.loadData()
    data.feeds.push(feedData)
    await this.storageService.saveData(data)
    this.schedulerService.scheduleFeed(feedData)
    this.logService.info(this.i18nService.t('feeds.added', { url: feedData.settings.url }))
  }

  async removeFeed(feedId: string) {
    const data = await this.storageService.loadData()
    const feed = data.feeds.find(f => f.id === feedId)
    if (feed) {
      data.feeds = data.feeds.filter(f => f.id !== feedId)
      await this.storageService.saveData(data)
      this.schedulerService.unscheduleFeed(feedId)
      await this.fileService.removeFolder(feed.settings.folder)
      this.logService.info(this.i18nService.t('feeds.removed', { url: feed.settings.url }))
    }
  }

  async updateFeed(feedData: FeedData) {
    const data = await this.storageService.loadData()
    const index = data.feeds.findIndex(f => f.id === feedData.id)
    if (index !== -1) {
      data.feeds[index] = feedData
      await this.storageService.saveData(data)
      this.schedulerService.scheduleFeed(feedData)
      this.logService.info(this.i18nService.t('feeds.updated', { url: feedData.settings.url }))
    }
  }

  // Méthode utilitaire pour accéder au service de traduction
  t(key: string, params: Record<string, string> = {}): string {
    return this.i18nService.t(key, params)
  }
} 