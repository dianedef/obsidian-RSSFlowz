import { Plugin, Notice, Modal } from 'obsidian'
import { extract } from '@extractus/feed-extractor'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { StorageService } from './StorageService'
import { LogService } from './LogService'
import { createOpmlError, OpmlErrorCode } from '../types/errors'
import { Feed } from '../types'

export class OpmlServiceFallback {
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

  // La partie export reste identique car elle fonctionne bien
  async exportOpml(): Promise<void> {
    // ... code existant ...
  }

  async importOpml(fileContent: string): Promise<{
    success: boolean;
    imported: number;
    errors: Array<{ title: string; url: string; error: string }>;
    duplicates: Array<{ title: string; url: string; error: string }>;
  }> {
    try {
      const cleanedContent = this.sanitizeXmlContent(fileContent)
      const doc = this.parseOpmlDocument(cleanedContent)
      const feedOutlines = this.extractFeedOutlines(doc)

      if (!feedOutlines.length) {
        this.logService.warn('[Fallback] Aucun feed RSS trouvé dans le fichier OPML')
        return { success: false, imported: 0, errors: [], duplicates: [] }
      }

      const data = await this.storageService.loadData()
      if (!data.feeds) data.feeds = []

      let successCount = 0
      const errorFeeds: Array<{ title: string; url: string; error: string }> = []
      const duplicateFeeds: Array<{ title: string; url: string; error: string }> = []

      for (const feed of feedOutlines) {
        try {
          const feedUrl = this.sanitizeUrl(feed.xmlUrl)
          const feedTitle = feed.title || feed.text || feedUrl

          // Vérifier les doublons
          const existingFeed = data.feeds.find(f => 
            f.settings.url.toLowerCase() === feedUrl.toLowerCase()
          )

          if (existingFeed) {
            duplicateFeeds.push({
              title: feedTitle,
              url: feedUrl,
              error: 'Feed déjà présent dans la liste'
            })
            continue
          }

          // Valider le feed avec feed-extractor
          try {
            await extract(feedUrl)
          } catch (error) {
            throw new Error('Feed invalide ou inaccessible')
          }

          const newFeed: Feed = {
            id: crypto.randomUUID(),
            settings: {
              title: feedTitle,
              url: feedUrl,
              type: (feed.saveType || 'multiple') as 'multiple' | 'single',
              status: (feed.status || 'active') as 'active' | 'paused',
              summarize: feed.summarize === 'true',
              transcribe: feed.transcribe === 'true',
              category: feed.category,
              folder: feed.category || 'RSS',
              description: feed.description,
              link: feed.htmlUrl
            }
          }

          data.feeds.push(newFeed)
          successCount++

        } catch (error) {
          errorFeeds.push({
            title: feed.title || feed.xmlUrl,
            url: feed.xmlUrl,
            error: this.getReadableErrorMessage(error)
          })
        }
      }

      if (successCount > 0) {
        await this.storageService.saveData(data)
        this.logService.info(`[Fallback] ${successCount} feeds importés avec succès`)
      }

      this.showImportSummary(feedOutlines.length, successCount, duplicateFeeds, errorFeeds)

      return {
        success: successCount > 0,
        imported: successCount,
        errors: errorFeeds,
        duplicates: duplicateFeeds
      }

    } catch (error) {
      this.logService.error('[Fallback] Erreur lors du parsing du fichier OPML', { error })
      throw createOpmlError(OpmlErrorCode.IMPORT_FAILED, 'Erreur lors de l\'import OPML')
    }
  }

  // Les méthodes utilitaires restent les mêmes
  private sanitizeXmlContent(content: string): string {
    // ... code existant ...
  }

  private parseOpmlDocument(content: string): any {
    // ... code existant ...
  }

  private sanitizeUrl(url: string): string {
    // ... code existant ...
  }

  private extractFeedOutlines(doc: any): Array<{
    title: string;
    xmlUrl: string;
    text?: string;
    category?: string;
    saveType?: 'multiple' | 'single';
    status?: 'active' | 'paused';
    summarize?: string;
    transcribe?: string;
    description?: string;
    htmlUrl?: string;
  }> {
    // ... code existant ...
  }

  private getReadableErrorMessage(error: any): string {
    // ... code existant ...
  }

  private showImportSummary(
    total: number,
    successCount: number,
    duplicateFeeds: Array<{ title: string; url: string; error: string }>,
    errorFeeds: Array<{ title: string; url: string; error: string }>
  ): void {
    // ... code existant ...
  }
} 