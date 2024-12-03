import { App, requestUrl } from 'obsidian'
import { createRSSError, RSSErrorCode } from '../types/errors'
import { LogService } from './LogService'
import { RSSFeed, RSSItem } from '../types'
import { XMLParser } from 'fast-xml-parser'

export class RSSService {
  private parser: XMLParser

  constructor(
    private app: App,
    private logService: LogService
  ) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
  }

  async fetchFeed(url: string): Promise<RSSFeed> {
    try {
      this.logService.debug('Récupération du flux RSS', { url })
      
      const response = await requestUrl({
        url,
        headers: {
          'User-Agent': 'Obsidian RSS Reader',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
        }
      })

      if (response.status !== 200) {
        throw createRSSError(
          RSSErrorCode.FETCH_ERROR,
          `Erreur HTTP ${response.status} lors de la récupération du flux`,
          url
        )
      }

      try {
        const parsed = this.parser.parse(response.text)
        return this.parseFeedData(parsed, url)
      } catch (parseError) {
        throw createRSSError(
          RSSErrorCode.PARSE_ERROR,
          'Erreur lors du parsing du flux XML',
          url
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logService.error('Erreur lors de la récupération du flux RSS', error)
        throw error
      }
      const rssError = createRSSError(
        RSSErrorCode.NETWORK_ERROR,
        'Erreur réseau lors de la récupération du flux',
        url
      )
      this.logService.error('Erreur réseau', rssError)
      throw rssError
    }
  }

  private parseFeedData(data: any, url: string): RSSFeed {
    if (data.rss?.channel) {
      return this.parseRSSFeed(data.rss.channel)
    } else if (data.feed) {
      return this.parseAtomFeed(data.feed)
    }

    throw createRSSError(
      RSSErrorCode.PARSE_ERROR,
      'Format de flux non supporté',
      url
    )
  }

  private parseRSSFeed(channel: any): RSSFeed {
    const feed: RSSFeed = {
      title: channel.title || '',
      description: channel.description || '',
      link: channel.link || '',
      items: []
    }

    if (channel.item) {
      const items = Array.isArray(channel.item) ? channel.item : [channel.item]
      feed.items = items.map(this.parseRSSItem)
    }

    return feed
  }

  private parseRSSItem(item: any): RSSItem {
    return {
      title: item.title || '',
      description: item.description || '',
      link: item.link || '',
      pubDate: item.pubDate || new Date().toISOString(),
      guid: item.guid || item.link
    }
  }

  private parseAtomFeed(feed: any): RSSFeed {
    const atomFeed: RSSFeed = {
      title: feed.title || '',
      description: feed.subtitle || '',
      link: this.getAtomLink(feed.link) || '',
      items: []
    }

    if (feed.entry) {
      const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry]
      atomFeed.items = entries.map(this.parseAtomEntry)
    }

    return atomFeed
  }

  private parseAtomEntry(entry: any): RSSItem {
    return {
      title: entry.title || '',
      description: entry.content || entry.summary || '',
      link: this.getAtomLink(entry.link) || '',
      pubDate: entry.updated || entry.published || new Date().toISOString(),
      guid: entry.id || this.getAtomLink(entry.link)
    }
  }

  private getAtomLink(link: any): string {
    if (!link) {
      return ''
    }

    if (typeof link === 'string') {
      return link
    }

    if (Array.isArray(link)) {
      const alternate = link.find(l => l['@_rel'] === 'alternate')
      return alternate ? alternate['@_href'] : link[0]['@_href']
    }

    return link['@_href'] || ''
  }
} 