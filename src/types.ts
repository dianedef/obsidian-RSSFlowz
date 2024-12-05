export interface RSSFeed {
  title: string
  description: string
  link: string
  items: RSSItem[]
}

export interface RSSItem {
  title: string
  description: string
  link: string
  pubDate: string
  guid?: string
}

export interface FeedSettings {
  url: string
  folder: string
  filterDuplicates: boolean
}

export interface FeedData {
  id: string
  settings: FeedSettings
  lastUpdate?: string
  error?: string
}

export interface PluginSettings {
  defaultUpdateInterval: number
  defaultFolder: string
  maxItemsPerFeed: number
  template: string
}

export interface StorageData {
  feeds: FeedData[]
  settings: PluginSettings
  readArticles?: string[]
  lastReadArticle?: string | null
} 