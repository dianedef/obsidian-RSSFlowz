import { Plugin } from 'obsidian'
import { StorageData, PluginSettings } from '../types'

export class StorageService {
  private static readonly STORAGE_KEY = 'obsidian-rss-reader'

  constructor(private plugin: Plugin) {}

  async loadData(): Promise<StorageData> {
    const data = await this.plugin.loadData() as StorageData | null
    return this.initializeData(data)
  }

  async saveData(data: StorageData): Promise<void> {
    await this.plugin.saveData(data)
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