import { Plugin } from 'obsidian'
import { extract, FeedData as ExtractedFeed } from '@extractus/feed-extractor'
import { LogService } from './LogService'
import { createRSSError, RSSErrorCode } from '../types/errors'
import { RSSFeed, RSSItem, FeedData } from '../types'

export class RSSServiceFallback {
  constructor(
    private plugin: Plugin,
    private logService: LogService
  ) {}

  async fetchFeed(url: string, feedData: FeedData): Promise<RSSFeed> {
    try {
      this.logService.debug({
        message: '[Fallback] Récupération du flux RSS',
        data: { url }
      })

      const extractedFeed = await extract(url, {
        getExtraEntryFields: true,
        descriptionMaxLength: 10000,
        useISODateFormat: true,
        requestOptions: {
          headers: {
            'User-Agent': 'Obsidian RSS Reader',
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
            'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache'
          }
        }
      })

      return this.convertToRSSFeed(extractedFeed, feedData, url)
    } catch (error) {
      this.logService.error({
        message: '[Fallback] Erreur lors de la récupération du flux RSS',
        error,
        data: { url }
      })

      throw createRSSError(
        RSSErrorCode.FETCH_ERROR,
        error instanceof Error ? error.message : 'Erreur inconnue',
        url
      )
    }
  }

  private convertToRSSFeed(feed: ExtractedFeed, feedData: FeedData, feedUrl: string): RSSFeed {
    return {
      title: feed.title || feedData.settings.title || '',
      description: feed.description || '',
      link: feed.link || '',
      items: feed.entries.slice(0, feedData.settings.maxArticles || 50)
        .map(entry => this.convertToRSSItem(entry, feedData)),
      feedUrl,
      lastUpdate: new Date()
    }
  }

  private convertToRSSItem(entry: ExtractedFeed['entries'][0], feedData: FeedData): RSSItem {
    return {
      title: entry.title || 'Sans titre',
      description: entry.description || '',
      content: entry.content || entry.description || '',
      link: entry.link || '',
      pubDate: new Date(entry.published),
      guid: entry.id || entry.link || '',
      categories: [...(entry.categories || []), ...(feedData.settings.tags || [])],
      author: entry.author || '',
      feedTitle: feedData.settings.title,
      // Champs supplémentaires disponibles avec feed-extractor
      media: entry.media,
      enclosures: entry.enclosures,
      language: entry.language
    }
  }
} 