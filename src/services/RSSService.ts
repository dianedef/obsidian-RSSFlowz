import { Plugin, requestUrl } from 'obsidian'
import { createRSSError, RSSErrorCode } from '../types/errors'
import { LogService } from './LogService'
import { Feed, RSSFeed, RSSItem } from '../types'
import { XMLParser } from 'fast-xml-parser'

export class RSSService {
  private parser: XMLParser

  constructor(
    private plugin: Plugin,
    private logService: LogService
  ) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      textNodeName: '_text',
      parseAttributeValue: true,
      trimValues: true
    })
  }

  private cleanXML(xml: string): string {
    return xml
      .replace(/^\s+/, '')
      .replace(/^\uFEFF/, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }

  async fetchFeed(url: string, feed: Feed): Promise<RSSFeed> {
    try {
      this.logService.debug({
        message: 'Récupération du flux RSS',
        data: { url }
      })
      
      const response = await request({
        url,
        headers: {
          'User-Agent': 'Obsidian RSS Reader',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response) {
        throw createRSSError(
          RSSErrorCode.FETCH_ERROR,
          'Pas de réponse du serveur',
          url
        )
      }

      try {
        const cleanedXML = this.cleanXML(response)
        const parsed = this.parser.parse(cleanedXML)

        if (parsed.parsererror) {
          throw createRSSError(
            RSSErrorCode.PARSE_ERROR,
            `Erreur de parsing XML: ${parsed.parsererror._text || 'Format XML invalide'}`,
            url
          )
        }

        return this.parseFeedData(parsed, url, feed)
      } catch (parseError) {
        throw createRSSError(
          RSSErrorCode.PARSE_ERROR,
          'Erreur lors du parsing du flux XML',
          url
        )
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.logService.error({
        message: 'Erreur lors de la récupération du flux RSS',
        error,
        data: { url }
      })
      throw error
    }
  }

  private parseFeedData(data: Record<string, any>, url: string, feed: Feed): RSSFeed {
    if (data.rss?.channel) {
      return this.parseRSSFeed(data.rss.channel, feed, url)
    } else if (data.feed) {
      return this.parseAtomFeed(data.feed, feed, url)
    }

    throw createRSSError(
      RSSErrorCode.PARSE_ERROR,
      'Format de flux non supporté',
      url
    )
  }

  private parseRSSFeed(channel: Record<string, any>, feed: Feed, feedUrl: string): RSSFeed {
    const rssFeed: RSSFeed = {
      title: channel.title?._text || feed.settings.title || '',
      description: channel.description?._text || '',
      link: channel.link?._text || '',
      items: [],
      feedUrl,
      lastUpdate: new Date()
    }

    if (channel.item) {
      const items = Array.isArray(channel.item) ? channel.item : [channel.item]
      rssFeed.items = items
        .slice(0, feed.settings.maxArticles || 50)
        .map((item: Record<string, any>) => this.parseRSSItem(item, feed))
    }

    return rssFeed
  }

  private parseRSSItem(item: Record<string, any>, feed: Feed): RSSItem {
    const content = 
      item['content:encoded']?._text?.trim() || 
      item.encoded?._text?.trim() ||
      item.description?._text?.trim() || 
      ''

    return {
      title: item.title?._text?.trim() || 'Sans titre',
      description: item.description?._text?.trim() || '',
      content: content,
      link: item.link?._text?.trim() || '',
      pubDate: item.pubDate?._text ? new Date(item.pubDate._text) : new Date(),
      guid: item.guid?._text || item.link?._text || '',
      categories: feed.settings.tags || [],
      author: item.author?._text || item.creator?._text || '',
      feedTitle: feed.settings.title
    }
  }

  private parseAtomFeed(atomData: Record<string, any>, feed: Feed, feedUrl: string): RSSFeed {
    const atomFeed: RSSFeed = {
      title: atomData.title?._text || feed.settings.title || '',
      description: atomData.subtitle?._text || '',
      link: this.getAtomLink(atomData.link) || '',
      items: [],
      feedUrl,
      lastUpdate: new Date()
    }

    if (atomData.entry) {
      const entries = Array.isArray(atomData.entry) ? atomData.entry : [atomData.entry]
      atomFeed.items = entries
        .slice(0, feed.settings.maxArticles || 50)
        .map((entry: Record<string, any>) => this.parseAtomEntry(entry, feed))
    }

    return atomFeed
  }

  private parseAtomEntry(entry: Record<string, any>, feed: Feed): RSSItem {
    const content = 
      entry.content?._text?.trim() || 
      entry.summary?._text?.trim() || 
      ''
    
    return {
      title: entry.title?._text?.trim() || 'Sans titre',
      description: entry.summary?._text?.trim() || content,
      content: content,
      link: this.getAtomLink(entry.link) || '',
      pubDate: entry.updated?._text ? new Date(entry.updated._text) : 
               entry.published?._text ? new Date(entry.published._text) : new Date(),
      guid: entry.id?._text || this.getAtomLink(entry.link),
      categories: feed.settings.tags || [],
      author: entry.author?.name?._text || '',
      feedTitle: feed.settings.title
    }
  }

  private getAtomLink(link: Record<string, any> | Record<string, any>[] | string | undefined): string {
    if (!link) {
      return ''
    }

    if (typeof link === 'string') {
      return link
    }

    if (Array.isArray(link)) {
      const alternate = link.find(l => l['@_rel'] === 'alternate' || !l['@_rel'])
      return alternate ? alternate['@_href'] : link[0]['@_href']
    }

    return link['@_href'] || ''
  }

  async cleanup(): Promise<void> {
    try {
      // Annuler toutes les requêtes en cours si nécessaire
      // Nettoyer le cache si existant
      this.logService.debug('RSSService nettoyé avec succès');
    } catch (error) {
      this.logService.error('Erreur lors du nettoyage du RSSService', { error: error as Error });
      throw error;
    }
  }
} 