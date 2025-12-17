import { Plugin } from 'obsidian'
import { RSSService } from './RSSService'
import { StorageService } from './StorageService'
import { LogService } from './LogService'
import { RSSItem, StorageData } from '../types'
import { Feed } from '../types/rss'
import { createSyncError, SyncErrorCode } from '../types/errors'
import { ContentEnhancerService } from './ContentEnhancerService'

/**
 * Orchestrates feed synchronization and article processing
 * 
 * Key responsibilities:
 * - Fetch new articles from all active feeds
 * - Filter duplicates based on publication date
 * - Enhance article content using Readability when needed
 * - Create/update markdown files in vault
 * - Clean up old articles based on retention policy
 * - Track sync status and errors per feed
 * 
 * Design decisions:
 * - One file per article OR single file per feed (user-configurable)
 * - ContentEnhancer only used when RSS content is insufficient (<500 chars)
 * - Template-based rendering for consistency
 */
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

  /**
   * Synchronize a single feed
   * 
   * Workflow:
   * 1. Fetch RSS/Atom feed
   * 2. Filter new articles (if duplicate filtering enabled)
   * 3. Limit to maxArticles setting
   * 4. Process each article (create/update markdown files)
   * 5. Clean old articles (if retention policy set)
   * 6. Update feed metadata (lastUpdate, error state)
   * 
   * Error handling: Feed-level errors are caught and stored in feed.lastError
   * This allows other feeds to continue syncing even if one fails
   */
  async syncFeed(feed: Feed): Promise<void> {
    try {
      this.logService.debug(`Synchronisation du feed ${feed.settings.title}`);
      const rssFeed = await this.rssService.fetchFeed(feed.settings.url, feed);
      const data = await this.storageService.loadData();
      const { maxArticles, retentionDays } = data.settings;
      
      // Filter duplicates by comparing publication date with last sync
      // This prevents re-creating articles that already exist
      const lastUpdate = new Date(feed.lastUpdate || 0);
      const newItems = feed.settings.filterDuplicates
        ? rssFeed.items.filter(item => new Date(item.pubDate) > lastUpdate)
        : rssFeed.items;

      // Respect maxArticles to avoid overwhelming vault with thousands of articles
      const itemsToProcess = newItems.slice(0, maxArticles);
      
      // Create markdown files for new articles
      await this.processItems(itemsToProcess, feed);
      
      // Remove old articles to keep vault clean (if enabled)
      if (retentionDays > 0) {
        await this.cleanOldArticles(feed, retentionDays);
      }
      
      // Update feed status on success
      feed.lastUpdate = new Date().toISOString();
      feed.lastSuccessfulFetch = Date.now();
      feed.lastError = undefined;  // Clear any previous errors
      
      await this.saveUpdatedFeed(feed);
      
      this.logService.debug(`Feed ${feed.settings.title} synchronisé avec succès (${itemsToProcess.length} articles)`);
    } catch (error) {
      // Store error in feed for debugging, but don't stop other feeds
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

  /**
   * Process articles and create markdown files
   * 
   * Two modes supported:
   * 1. Single file mode: All articles appended to one file (like a digest)
   *    - Good for: Daily news roundups, brief summaries
   *    - Appends to existing file to preserve history
   * 
   * 2. Multiple files mode: One markdown file per article (default)
   *    - Good for: Long-form content, research articles
   *    - Easier to organize with tags and backlinks
   * 
   * Skip existing files to avoid duplicates (idempotent operation)
   */
  private async processItems(items: RSSItem[], feed: Feed): Promise<void> {
    await this.ensureFolder(feed.settings.folder);

    if (feed.settings.type === 'single') {
      // Single file mode: Append all articles to one file
      const filePath = `${feed.settings.folder}/${feed.settings.title}.md`;
      let newContent = '';
      
      for (const item of items) {
        const enhancedItem = await this.enhanceItem(item, feed);
        newContent += this.renderTemplate(
          feed.settings.template || this.getSingleFileTemplate(),
          enhancedItem
        ) + '\n\n---\n\n';  // Separator: '---' is Markdown horizontal rule
                              // Renders as visual divider between articles in Obsidian
                              // Also used by Obsidian for page breaks in exports
      }
      
      if (await this.fileExists(filePath)) {
        // Append to existing file to preserve article history
        const existingContent = await this.plugin.app.vault.adapter.read(filePath);
        await this.plugin.app.vault.adapter.write(
          filePath,
          existingContent + newContent
        );
      } else {
        // Create new file with header
        const content = `# ${feed.settings.title}\n\n${newContent}`;
        await this.plugin.app.vault.create(filePath, content);
      }
    } else {
      // Multiple files mode: Create one file per article
      for (const item of items) {
        const fileName = this.sanitizeFileName(`${item.title}.md`);
        const filePath = `${feed.settings.folder}/${fileName}`;

        // Skip if file already exists (idempotent sync)
        if (await this.fileExists(filePath)) {
          continue;
        }

        const enhancedItem = await this.enhanceItem(item, feed);
        const content = this.renderTemplate(
          feed.settings.template || this.getDefaultTemplate(),
          enhancedItem
        );
        
        await this.plugin.app.vault.create(filePath, content);
      }
    }
  }

  /**
   * Enhance article content when RSS feed provides insufficient content
   * 
   * Strategy:
   * - Use RSS content if available and sufficiently long (≥500 chars)
   * - Otherwise, fetch full article HTML and extract main content with Readability
   * 
   * Why 500 chars threshold:
   * - Many feeds only include summaries (100-200 chars)
   * - Full articles are typically 1000+ chars
   * - 500 chars is a good middle ground to detect truncated content
   * 
   * Readability fallback:
   * - Fetches article URL
   * - Parses HTML and extracts main content
   * - Strips ads, navigation, and clutter
   * - Estimates reading time
   * 
   * Trade-off: Additional HTTP request per article, but much better user experience
   */
  private async enhanceItem(item: RSSItem, feed: Feed): Promise<any> {
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

    // Only use Readability if RSS content is insufficient
    const minContentLength = 500;
    const currentContent = item.content || item.description || '';
    
    if (currentContent.length < minContentLength) {
      try {
        this.logService.debug(`Récupération du contenu complet pour ${item.title}`);
        enhancedItem = await this.contentEnhancer.enhanceArticleContent(enhancedItem);
      } catch (error) {
        // Readability might fail (paywalls, anti-scraping, etc.)
        // Fall back to original RSS content rather than failing sync
        this.logService.warn(
          `Impossible de récupérer le contenu complet pour ${item.title}`,
          { error }
        );
      }
    }

    return enhancedItem;
  }

  private async saveUpdatedFeed(feed: Feed): Promise<void> {
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

  /**
   * Delete articles older than retention period
   * 
   * Purpose: Prevent vault from growing infinitely with old articles
   * 
   * Implementation:
   * - Uses file modification time (mtime) as age indicator
   * - Only processes files in this feed's folder (to avoid accidents)
   * - Deletion failures are logged but don't stop cleanup
   * 
   * Safety: Only deletes within feed folder to avoid deleting user's other notes
   */
  private async cleanOldArticles(feed: Feed, retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const files = await this.plugin.app.vault.getFiles();
    const feedPath = feed.settings.folder;

    for (const file of files) {
      // Safety check: Only delete files in this feed's folder
      if (!file.path.startsWith(feedPath)) continue;

      const stat = await this.plugin.app.vault.adapter.stat(file.path);
      if (!stat) continue;

      // Use modification time as age indicator
      const fileDate = new Date(stat.mtime);
      if (fileDate < cutoffDate) {
        try {
          await this.plugin.app.vault.delete(file);
          this.logService.debug(`Article supprimé car trop ancien : ${file.path}`);
        } catch (error) {
          // Don't fail entire cleanup if one file can't be deleted
          this.logService.warn(`Impossible de supprimer l'article : ${file.path}`, { error });
        }
      }
    }
  }
} 