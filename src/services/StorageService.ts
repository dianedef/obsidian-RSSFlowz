import { App } from 'obsidian'
import { StorageData, PluginSettings, FeedData } from '../types'

export class StorageService {
  private static readonly STORAGE_KEY = 'obsidian-rss-reader'

  constructor(private app: App) {}

  async loadData(): Promise<StorageData> {
    const data = await this.app.loadData(StorageService.STORAGE_KEY) as StorageData | null
    return this.initializeData(data)
  }

  async saveData(data: StorageData): Promise<void> {
    await this.app.saveData(StorageService.STORAGE_KEY, data)
  }

  private initializeData(data: StorageData | null): StorageData {
    const defaultSettings: PluginSettings = {
      defaultUpdateInterval: 60,
      defaultFolder: 'RSS',
      maxItemsPerFeed: 50,
      template: '# {{title}}\n\n{{description}}\n\n{{link}}'
    }

    if (!data) {
      return {
        feeds: [],
        settings: defaultSettings
      }
    }

    return {
      feeds: data.feeds || [],
      settings: {
        ...defaultSettings,
        ...data.settings
      }
    }
  }
} 