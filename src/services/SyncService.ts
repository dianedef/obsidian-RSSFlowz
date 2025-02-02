import { Plugin } from 'obsidian'
import { RSSService } from './RSSService'
import { StorageService } from './StorageService'
import { LogService } from './LogService'
import { FeedData, RSSItem, StorageData } from '../types'
import { createSyncError, SyncErrorCode } from '../types/errors'
import { ContentEnhancerService } from './ContentEnhancerService'

export class SyncService {
  private contentEnhancer: ContentEnhancerService;

  constructor(
    private plugin: Plugin,
    private rssService: RSSService,
    private storageService: StorageService,
    private logService: LogService
  ) {
    this.contentEnhancer = new ContentEnhancerService(logService);
  }

  async syncAllFeeds(): Promise<void> {
    try {
      const data = await this.storageService.loadData();
      
      for (const feed of data.feeds) {
        if (!feed?.settings) {
          this.logService.error(
            `Feed ignoré car mal formaté: ${feed?.id || 'ID inconnu'}`,
            { error: new Error('Feed mal formaté') }
          );
          continue;
        }

        const status = feed.settings.status || 'active';
        
        if (status !== 'active') {
          this.logService.debug(`Feed ${feed.settings.title} ignoré (inactif)`);
          continue;
        }

        try {
          await this.syncFeed(feed);
        } catch (error) {
          this.logService.error(
            `Erreur lors de la synchronisation du feed ${feed.settings.title}`,
            { error: error as Error }
          );
        }
      }
      
      this.logService.info('Synchronisation de tous les flux terminée');
    } catch (error) {
      this.logService.error(
        'Erreur lors de la synchronisation des flux',
        { error: error as Error }
      );
      throw error;
    }
  }

  async syncFeed(feed: FeedData): Promise<void> {
    try {
      this.logService.debug(`Synchronisation du feed ${feed.settings.title}`);
      const rssFeed = await this.rssService.fetchFeed(feed.settings.url, feed);
      const data = await this.storageService.loadData();
      const { maxArticles, retentionDays } = data.settings;
      
      const lastUpdate = new Date(feed.lastUpdate || 0);
      const newItems = feed.settings.filterDuplicates
        ? rssFeed.items.filter(item => new Date(item.pubDate) > lastUpdate)
        : rssFeed.items;

      // Limiter le nombre d'articles selon le paramètre maxArticles
      const itemsToProcess = newItems.slice(0, maxArticles);
      
      // Traiter les nouveaux articles
      await this.processItems(itemsToProcess, feed);
      
      // Nettoyer les anciens articles si nécessaire
      if (retentionDays > 0) {
        await this.cleanOldArticles(feed, retentionDays);
      }
      
      feed.lastUpdate = new Date().toISOString();
      feed.lastSuccessfulFetch = Date.now();
      feed.lastError = undefined;
      
      await this.saveUpdatedFeed(feed);
      
      this.logService.debug(`Feed ${feed.settings.title} synchronisé avec succès (${itemsToProcess.length} articles)`);
    } catch (error) {
      const syncError = error instanceof Error 
        ? createSyncError(SyncErrorCode.SYNC_FAILED, error.message, feed.id)
        : createSyncError(SyncErrorCode.SYNC_FAILED, 'Erreur inconnue lors de la synchronisation', feed.id);
      
      feed.lastError = {
        message: syncError.message,
        timestamp: Date.now()
      };
      
      await this.saveUpdatedFeed(feed);
      throw syncError;
    }
  }

  private async processItems(items: RSSItem[], feed: FeedData): Promise<void> {
    await this.ensureFolder(feed.settings.folder);

    if (feed.settings.type === 'single') {
      // Mode fichier unique : tous les articles dans un seul fichier
      const filePath = `${feed.settings.folder}/${feed.settings.title}.md`;
      let newContent = '';
      
      for (const item of items) {
        let enhancedItem = await this.enhanceItem(item, feed);
        newContent += this.renderTemplate(
          feed.settings.template || this.getSingleFileTemplate(),
          enhancedItem
        ) + '\n\n---\n\n';
      }
      
      if (await this.fileExists(filePath)) {
        // Récupérer le contenu existant et ajouter les nouveaux articles à la fin
        const existingContent = await this.plugin.app.vault.adapter.read(filePath);
        await this.plugin.app.vault.adapter.write(
          filePath,
          existingContent + newContent
        );
      } else {
        // Créer le fichier avec un en-tête et les nouveaux articles
        const content = `# ${feed.settings.title}\n\n${newContent}`;
        await this.plugin.app.vault.create(filePath, content);
      }
    } else {
      // Mode fichiers multiples : un fichier par article
      for (const item of items) {
        const fileName = this.sanitizeFileName(`${item.title}.md`);
        const filePath = `${feed.settings.folder}/${fileName}`;

        if (await this.fileExists(filePath)) {
          continue;
        }

        let enhancedItem = await this.enhanceItem(item, feed);
        const content = this.renderTemplate(
          feed.settings.template || this.getDefaultTemplate(),
          enhancedItem
        );
        
        await this.plugin.app.vault.create(filePath, content);
      }
    }
  }

  private async enhanceItem(item: RSSItem, feed: FeedData): Promise<any> {
    let enhancedItem = {
      title: item.title,
      link: item.link,
      pubDate: new Date(item.pubDate || Date.now()),
      content: item.content,
      description: item.description,
      feed: feed.settings.title,
      isRead: false,
      isFavorite: false,
      author: item.author,
      tags: item.categories
    };

    // N'utiliser Readability que si le contenu est vide ou trop court
    const minContentLength = 500; // Minimum 500 caractères
    const currentContent = item.content || item.description || '';
    
    if (currentContent.length < minContentLength) {
      try {
        this.logService.debug(`Récupération du contenu complet pour ${item.title}`);
        enhancedItem = await this.contentEnhancer.enhanceArticleContent(enhancedItem);
      } catch (error) {
        this.logService.warn(
          `Impossible de récupérer le contenu complet pour ${item.title}`,
          { error }
        );
      }
    }

    return enhancedItem;
  }

  private async saveUpdatedFeed(feed: FeedData): Promise<void> {
    const data = await this.storageService.loadData();
    const index = data.feeds.findIndex(f => f.id === feed.id);
    if (index !== -1) {
      data.feeds[index] = feed;
      await this.storageService.saveData(data);
    }
  }

  private async ensureFolder(path: string): Promise<void> {
    if (!(await this.plugin.app.vault.adapter.exists(path))) {
      await this.plugin.app.vault.createFolder(path);
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    return await this.plugin.app.vault.adapter.exists(path)
  }

  private renderTemplate(template: string, item: any): string {
    return template
      .replace(/{{title}}/g, item.title)
      .replace(/{{description}}/g, item.description || '')
      .replace(/{{content}}/g, item.content || item.description || '')
      .replace(/{{link}}/g, item.link)
      .replace(/{{pubDate}}/g, item.pubDate)
      .replace(/{{author}}/g, item.author || '')
      .replace(/{{readingTime}}/g, item.readingTime ? `Temps de lecture : ${item.readingTime} min` : '')
      .replace(/{{siteName}}/g, item.siteName || '')
      .replace(/{{excerpt}}/g, item.excerpt || '')
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-')
      .trim()
  }

  private getDefaultTemplate(): string {
    return [
      '# {{title}}',
      '',
      '{{description}}',
      '',
      'Source: {{link}}',
      'Date: {{pubDate}}'
    ].join('\n')
  }

  private getSingleFileTemplate(): string {
    return [
      '## {{title}}',
      '',
      '{{description}}',
      '',
      'Source: {{link}}',
      'Date: {{pubDate}}'
    ].join('\n')
  }

  private async cleanOldArticles(feed: FeedData, retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const files = await this.plugin.app.vault.getFiles();
    const feedPath = feed.settings.folder;

    for (const file of files) {
      // Vérifier si le fichier appartient à ce feed
      if (!file.path.startsWith(feedPath)) continue;

      const stat = await this.plugin.app.vault.adapter.stat(file.path);
      if (!stat) continue;

      const fileDate = new Date(stat.mtime);
      if (fileDate < cutoffDate) {
        try {
          await this.plugin.app.vault.delete(file);
          this.logService.debug(`Article supprimé car trop ancien : ${file.path}`);
        } catch (error) {
          this.logService.warn(`Impossible de supprimer l'article : ${file.path}`, { error });
        }
      }
    }
  }
} 