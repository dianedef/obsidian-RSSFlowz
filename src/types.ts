import { PluginSettings } from './types/settings'

export interface RSSFeed {
  title: string
  description: string
  link: string
  items: RSSItem[]
  feedUrl: string
  lastUpdate: Date
}

export interface RSSItem {
  title: string
  description: string
  link: string
  pubDate: Date
  guid?: string
  content?: string
  categories?: string[]
  author?: string
  feedTitle?: string
}

export interface Article {
  title: string
  link: string
  date: Date
  content: string
  feedUrl: string
  feedTitle: string
  path: string
}

export interface Feed {
  url: string
  title: string
  type: 'multiple' | 'single' | 'uniqueFile'
  group?: string
}

export interface FeedSettings {
  url: string
  folder: string
  title: string
  template?: string
  type: 'multiple' | 'single'
  status: 'active' | 'paused'
  filterDuplicates?: boolean
  group?: string
  summarize?: boolean
  transcribe?: boolean
  rewrite?: boolean
  maxArticles?: number
  tags?: string[]
  updateInterval?: number
  link?: string
  description?: string
  category?: string
} 

export interface FeedData {
  id: string
  settings: FeedSettings
  lastUpdate?: string
  lastSuccessfulFetch?: number
  lastError?: {
    message: string
    timestamp: number
  }
}

export interface StorageData {
  feeds: FeedData[]
  settings: PluginSettings
  readArticles?: string[]
  lastReadArticle?: string | null
  groups?: string[]
  articleStates?: {
    [key: string]: {
      read?: boolean
      deleted?: boolean
      lastUpdate: number
    }
  }
} 