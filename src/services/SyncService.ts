import { App } from 'obsidian'
import { RSSService } from './RSSService'
import { StorageService } from './StorageService'
import { FeedData, RSSItem } from '../types'

export class SyncService {
  constructor(
    private app: App,
    private rssService: RSSService,
    private storageService: StorageService
  ) {}

  async syncFeed(feed: FeedData): Promise<void> {
    try {
      const rssFeed = await this.rssService.fetchFeed(feed.settings.url)
      const data = await this.storageService.loadData()
      const { maxItemsPerFeed, template } = data.settings
      
      const lastUpdate = new Date(feed.lastUpdate || 0)
      const newItems = feed.settings.filterDuplicates
        ? rssFeed.items.filter(item => new Date(item.pubDate) > lastUpdate)
        : rssFeed.items

      const itemsToProcess = newItems.slice(0, maxItemsPerFeed)
      
      await this.processItems(itemsToProcess, feed, template)
      
      feed.lastUpdate = new Date().toISOString()
      feed.error = undefined
      
      await this.storageService.saveData(data)
    } catch (error) {
      feed.error = error.message
      throw error
    }
  }

  private async processItems(items: RSSItem[], feed: FeedData, template: string): Promise<void> {
    await this.ensureFolder(feed.settings.folder)

    for (const item of items) {
      const fileName = this.sanitizeFileName(`${item.title}.md`)
      const filePath = `${feed.settings.folder}/${fileName}`

      if (await this.fileExists(filePath)) {
        continue
      }

      const content = this.renderTemplate(template, item)
      await this.app.vault.create(filePath, content)
    }
  }

  private async ensureFolder(path: string): Promise<void> {
    if (!(await this.app.vault.adapter.exists(path))) {
      await this.app.vault.createFolder(path)
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    return await this.app.vault.adapter.exists(path)
  }

  private renderTemplate(template: string, item: RSSItem): string {
    return template
      .replace(/{{title}}/g, item.title)
      .replace(/{{description}}/g, item.description || '')
      .replace(/{{link}}/g, item.link)
      .replace(/{{pubDate}}/g, item.pubDate)
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-')
      .trim()
  }
} 