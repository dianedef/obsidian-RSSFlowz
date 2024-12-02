import { App } from 'obsidian'
import { StorageService } from './StorageService'
import { FeedData } from '../types'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

export class OpmlService {
  private parser: XMLParser
  private builder: XMLBuilder

  constructor(
    private app: App,
    private storageService: StorageService
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

  async importOpml(fileContent: string): Promise<void> {
    try {
      const parsed = this.parser.parse(fileContent)
      const outlines = this.extractOutlines(parsed.opml.body.outline)
      
      const data = await this.storageService.loadData()
      const existingIds = new Set(data.feeds.map(f => f.settings.url))
      
      const newFeeds: FeedData[] = outlines
        .filter(outline => !existingIds.has(outline.xmlUrl))
        .map(outline => ({
          id: crypto.randomUUID(),
          settings: {
            url: outline.xmlUrl,
            folder: outline.category || data.settings.defaultFolder,
            updateInterval: data.settings.defaultUpdateInterval,
            filterDuplicates: true
          }
        }))

      data.feeds.push(...newFeeds)
      await this.storageService.saveData(data)
    } catch (error) {
      console.error('Erreur lors de l\'import OPML:', error)
      throw new Error('Format OPML invalide ou fichier corrompu')
    }
  }

  async exportOpml(): Promise<string> {
    try {
      const data = await this.storageService.loadData()
      
      const outlines = data.feeds.map(feed => ({
        '@_text': feed.settings.folder,
        '@_title': feed.settings.folder,
        '@_type': 'rss',
        '@_xmlUrl': feed.settings.url,
        '@_category': feed.settings.folder
      }))

      const opml = {
        opml: {
          '@_version': '2.0',
          head: {
            title: 'Obsidian RSS Feeds',
            dateCreated: new Date().toISOString()
          },
          body: {
            outline: outlines
          }
        }
      }

      return this.builder.build(opml)
    } catch (error) {
      console.error('Erreur lors de l\'export OPML:', error)
      throw new Error('Erreur lors de la génération du fichier OPML')
    }
  }

  private extractOutlines(outlines: any | any[]): Array<{ xmlUrl: string; category?: string }> {
    if (!outlines) return []
    
    const results: Array<{ xmlUrl: string; category?: string }> = []
    const processOutline = (outline: any, category?: string) => {
      if (outline['@_xmlUrl']) {
        results.push({
          xmlUrl: outline['@_xmlUrl'],
          category: category || outline['@_text'] || outline['@_title']
        })
      }
      
      if (Array.isArray(outline.outline)) {
        outline.outline.forEach((sub: any) => 
          processOutline(sub, outline['@_text'] || outline['@_title'])
        )
      } else if (outline.outline) {
        processOutline(outline.outline, outline['@_text'] || outline['@_title'])
      }
    }

    if (Array.isArray(outlines)) {
      outlines.forEach(outline => processOutline(outline))
    } else {
      processOutline(outlines)
    }

    return results
  }
} 