import { Plugin, requestUrl } from 'obsidian'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { StorageService } from './StorageService'
import { LogService } from './LogService'
import { createOpmlError, OpmlErrorCode } from '../types/errors'
import { FeedData, FeedSettings } from '../types'

export class OpmlService {
  private parser: XMLParser
  private builder: XMLBuilder

  constructor(
    private plugin: Plugin,
    private storageService: StorageService,
    private logService: LogService
  ) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      format: true
    })
  }

  async importFromUrl(url: string): Promise<void> {
    try {
      const response = await requestUrl(url)
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`)
      }

      const parsed = this.parser.parse(response.text)
      if (!parsed.opml?.body?.outline) {
        throw new Error('Format OPML invalide')
      }

      const newFeeds = this.extractFeeds(parsed.opml.body.outline)
      const storageData = await this.storageService.loadData()
      
      storageData.feeds = [...storageData.feeds, ...newFeeds]
      await this.storageService.saveData(storageData)

      this.logService.info(`${newFeeds.length} flux importés avec succès`)
    } catch (error) {
      this.logService.error('Erreur lors de l\'import OPML', error as Error)
      throw createOpmlError(OpmlErrorCode.IMPORT_FAILED, 'Erreur lors de l\'import OPML')
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
      
      return this.builder.build(opml)
    } catch (error) {
      this.logService.error('Erreur lors de l\'export OPML', error as Error)
      throw createOpmlError(OpmlErrorCode.EXPORT_FAILED, 'Erreur lors de l\'export OPML')
    }
  }

  private extractFeeds(outlines: any[], folder: string = 'RSS'): FeedData[] {
    const feeds: FeedData[] = []

    const processOutline = (outline: any, currentFolder: string) => {
      if (outline['@_xmlUrl']) {
        const settings: FeedSettings = {
          url: outline['@_xmlUrl'],
          folder: currentFolder,
          filterDuplicates: true
        }
        feeds.push({
          id: crypto.randomUUID(),
          settings
        })
      }

      const newFolder = outline['@_text'] || outline['@_title'] || currentFolder
      if (Array.isArray(outline.outline)) {
        outline.outline.forEach((child: any) => processOutline(child, newFolder))
      } else if (outline.outline) {
        processOutline(outline.outline, newFolder)
      }
    }

    if (Array.isArray(outlines)) {
      outlines.forEach(outline => processOutline(outline, folder))
    } else {
      processOutline(outlines, folder)
    }

    return feeds
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