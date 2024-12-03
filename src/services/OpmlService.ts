import { App, requestUrl } from 'obsidian'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { StorageService } from './StorageService'
import { LogService } from './LogService'
import { createOpmlError, OpmlErrorCode, OpmlError } from '../types/errors'
import { FeedData } from '../types'

export class OpmlService {
  private parser: XMLParser
  private builder: XMLBuilder

  constructor(
    private app: App,
    private storageService: StorageService,
    private logService: LogService
  ) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
  }

  async importFromUrl(url: string): Promise<void> {
    try {
      const response = await requestUrl(url)
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`)
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      })
      const opml = parser.parse(response.text)

      const data = await this.storageService.loadData()
      const newFeeds = this.parseFeedsFromOpml(opml)
      
      await this.storageService.saveData({
        ...data,
        feeds: [...data.feeds, ...newFeeds]
      })
      
      this.logService.info(`${newFeeds.length} flux importés avec succès`)
    } catch (error) {
      this.logService.error('Erreur lors de l\'import OPML', error)
      throw createOpmlError('ImportError', 'Erreur lors de l\'import OPML', error)
    }
  }

  async exportOpml(): Promise<string> {
    try {
      const data = await this.storageService.loadData()
      const feedsByFolder = this.groupFeedsByFolder(data.feeds)
      
      const opml = {
        '?xml': { '@version': '1.0', '@encoding': 'UTF-8' },
        opml: {
          '@version': '2.0',
          head: {
            title: 'RSS Feeds'
          },
          body: {
            outline: Object.entries(feedsByFolder).map(([folder, feeds]) => ({
              '@text': folder,
              '@title': folder,
              outline: feeds.map(feed => ({
                '@type': 'rss',
                '@text': feed.settings.folder,
                '@title': feed.settings.folder,
                '@xmlUrl': feed.settings.url
              }))
            }))
          }
        }
      }

      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@',
        format: true
      })
      
      return builder.build(opml)
    } catch (error) {
      this.logService.error('Erreur lors de l\'export OPML', error)
      throw createOpmlError('ExportError', 'Erreur lors de l\'export OPML', error)
    }
  }

  private parseOpmlOutlines(outlines: any[], parentFolder: string = 'RSS'): FeedData[] {
    const feeds: FeedData[] = []
    const processOutline = (outline: any, folder: string) => {
      if (outline['@_type'] === 'rss') {
        feeds.push({
          id: crypto.randomUUID(),
          settings: {
            url: outline['@_xmlUrl'],
            folder: folder,
            updateInterval: 60,
            filterDuplicates: true
          }
        })
      } else {
        const newFolder = outline['@_text'] || outline['@_title'] || folder
        if (Array.isArray(outline.outline)) {
          outline.outline.forEach(child => processOutline(child, newFolder))
        } else if (outline.outline) {
          processOutline(outline.outline, newFolder)
        }
      }
    }

    if (Array.isArray(outlines)) {
      outlines.forEach(outline => processOutline(outline, parentFolder))
    } else if (outlines) {
      processOutline(outlines, parentFolder)
    }

    return feeds
  }

  private parseFeedsFromOpml(opml: any): FeedData[] {
    if (!opml.opml?.body?.outline) {
      throw new Error('Format OPML invalide')
    }
    return this.parseOpmlOutlines(opml.opml.body.outline)
  }

  private groupFeedsByFolder(feeds: FeedData[]): Record<string, FeedData[]> {
    return feeds.reduce((acc, feed) => {
      const folder = feed.settings.folder || 'RSS'
      if (!acc[folder]) {
        acc[folder] = []
      }
      acc[folder].push(feed)
      return acc
    }, {} as Record<string, FeedData[]>)
  }
} 