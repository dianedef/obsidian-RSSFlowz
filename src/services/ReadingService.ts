import { Plugin, TFile, Notice } from 'obsidian'
import { LogServiceInterface } from '../types/logs'
import { ReadingState } from '../types/reading'
import { StorageService } from './StorageService'
import { SettingsService } from './SettingsService'
import { Article, Feed, FeedSettings } from '../types'
import { PluginSettings } from '../types/settings'
import { VIEW_TYPE_READING } from '../ui/ReadingViewUI'

/**
 * Manages distraction-free reading mode for RSS articles
 * 
 * Features:
 * - Full-screen modal view for focused reading
 * - Article navigation (next/previous with keyboard shortcuts)
 * - Read status tracking per article
 * - Group/feed filtering
 * - Custom CSS for immersive experience
 * 
 * Design philosophy:
 * - Inspired by reader modes in browsers and RSS readers (Feedly, Reeder)
 * - Removes Obsidian UI chrome for distraction-free reading
 * - Keyboard-first navigation (Cmd+Left/Right)
 * - Preserves reading position between sessions
 * 
 * Implementation:
 * - Uses Obsidian's modal API for full-screen experience
 * - Injects custom CSS scoped to reading mode
 * - Tracks state (current file, reading status) for navigation
 */
export class ReadingService {
  private currentState: ReadingState = {
    isReading: false,
    currentFile: null,      // Currently displayed article
    lastFile: null          // Last read article (for resuming)
  }

  // CSS element ID for scoped styling (prevents conflicts)
  private static readonly READING_MODE_STYLE_ID = 'rss-reading-mode-styles'

  constructor(
    private plugin: Plugin,
    private storageService: StorageService,
    private settingsService: SettingsService,
    private logService: LogServiceInterface
  ) {}

  /**
   * Enter distraction-free reading mode
   * 
   * Article selection strategy (priority order):
   * 1. Currently active file (if in RSS folder)
   * 2. Last read article (resume reading)
   * 3. Most recent article (by modification time)
   * 
   * This ensures users always have something to read and can resume where they left off.
   * 
   * UI setup:
   * - Injects custom CSS for full-screen experience
   * - Opens reading view in right sidebar
   * - Updates modal with article content
   * 
   * Why right sidebar?: Obsidian convention for auxiliary views (outline, backlinks, etc.)
   */
  async enterReadingMode(): Promise<void> {
    if (this.currentState.isReading) {
      this.logService.warn('Déjà en mode lecture')
      return
    }

    try {
      // Inject CSS for full-screen reading experience
      this.applyReadingModeStyles()

      // Determine which article to display
      const activeLeaf = this.plugin.app.workspace.activeLeaf
      const activeFile = activeLeaf?.view && 'file' in activeLeaf.view ? (activeLeaf.view as any).file as TFile | null : null
      const settings = this.settingsService.getSettings()
      const rssFolder = settings.rssFolder || 'RSS'

      if (activeFile && activeFile.path.startsWith(rssFolder)) {
        // Priority 1: Use currently active RSS article
        await this.navigateToArticle(activeFile)
      } else if (this.currentState.lastFile) {
        // Priority 2: Resume last read article
        await this.navigateToArticle(this.currentState.lastFile)
      } else {
        // Priority 3: Find most recent article
        const files = this.plugin.app.vault.getFiles()
          .filter(file => file.path.startsWith(rssFolder))
          .sort((a, b) => b.stat.mtime - a.stat.mtime)  // Newest first

        if (files.length > 0) {
          await this.navigateToArticle(files[0])
        } else {
          this.logService.warn('Aucun article RSS disponible')
          new Notice('Aucun article RSS disponible')
          return
        }
      }

      // Open reading view in right sidebar
      const leaf = this.plugin.app.workspace.getRightLeaf(false)
      await leaf.setViewState({
        type: VIEW_TYPE_READING,
        active: true
      })

      // Update modal content with selected article
      const view = leaf.view as any
      if (view && typeof view.updateModal === 'function') {
        await view.updateModal()
      }
      
      this.currentState.isReading = true
      this.logService.info('Mode lecture activé')
    } catch (error) {
      this.logService.error('Erreur lors de l\'entrée en mode lecture:', error)
      new Notice('Erreur lors de l\'activation du mode lecture')
      throw error
    }
  }

  async exitReadingMode(): Promise<void> {
    if (!this.currentState.isReading) {
      this.logService.warn('Pas en mode lecture')
      return
    }

    try {
      // Retirer les styles CSS
      this.removeReadingModeStyles()

      this.currentState.isReading = false
      this.currentState.currentFile = null
      this.logService.info('Mode lecture désactivé')
    } catch (error) {
      this.logService.error('Erreur lors de la sortie du mode lecture:', error)
      new Notice('Erreur lors de la désactivation du mode lecture')
      throw error
    }
  }

  /**
   * Inject CSS for distraction-free reading experience
   * 
   * Design goals:
   * - Full-screen modal (90vw × 90vh) for immersion
   * - Hide Obsidian UI chrome (header, sidebars)
   * - Readable typography and spacing
   * - Dark/light mode compatible (uses CSS variables)
   * 
   * Scoping strategy:
   * - All CSS scoped to .rss-reading-modal class
   * - Prevents conflicts with Obsidian's global styles
   * - Easy to remove when exiting reading mode
   * 
   * Why inject CSS instead of external file?
   * - Simplifies distribution (one plugin file)
   * - Dynamic loading/unloading
   * - No CSS file conflicts
   */
  private applyReadingModeStyles(): void {
    const existingStyle = document.getElementById(ReadingService.READING_MODE_STYLE_ID)
    if (existingStyle) {
      return  // Idempotent: only inject once
    }

    const styleEl = document.createElement('style')
    styleEl.id = ReadingService.READING_MODE_STYLE_ID
    styleEl.textContent = `
      /* Limiter la portée du CSS à notre modal uniquement */
      .modal.rss-reading-modal {
        --header-height: 0px !important;
        --file-explorer-width: 0px !important;
        width: 90vw !important;
        height: 90vh !important;
        max-width: none !important;
        max-height: none !important;
        position: fixed !important;
        border-radius: 0 !important;
        border: 1px solid var(--background-modifier-border) !important;
        top: 5vh !important;
        left: 5vw !important;
        z-index: 9999;
        background-color: var(--background-primary);
      }

      .rss-reading-modal .modal-content {
        padding: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .rss-reading-modal .reading-mode-controls {
        display: flex;
        gap: 10px;
        justify-content: center;
        align-items: center;
        padding: 10px;
        border-top: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
        position: sticky;
        bottom: 0;
      }

      .rss-reading-modal .reading-mode-select {
        padding: 8px;
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
        background: var(--background-primary);
        color: var(--text-normal);
        min-width: 150px;
      }

      .rss-reading-modal button {
        padding: 8px 16px;
        border-radius: 4px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        cursor: pointer;
      }

      .rss-reading-modal button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `
    document.head.appendChild(styleEl)

    // Ajouter la classe spécifique à notre modal
    const modalEl = document.querySelector('.modal')
    if (modalEl) {
      modalEl.classList.add('rss-reading-modal')
    }
  }

  /**
   * Retire les styles CSS du mode lecture
   */
  private removeReadingModeStyles(): void {
    const styleEl = document.getElementById(ReadingService.READING_MODE_STYLE_ID)
    if (styleEl) {
      styleEl.remove()
    }

    const modalEl = document.querySelector('.modal')
    if (modalEl) {
      modalEl.classList.remove('rss-reading-modal')
    }
  }

  async navigateToArticle(target: TFile | string): Promise<void> {
    try {
      if (target instanceof TFile) {
        // Cas d'un fichier TFile
        this.currentState.currentFile = target;
        this.currentState.lastFile = target;
        this.logService.debug('Navigation vers article', { path: target.path });
      } else {
        // Cas d'un lien d'article
        const settings = this.settingsService.getSettings();
        const currentFeed = settings.currentFeed;
        if (!currentFeed) return;

        const feed = settings.feeds.find((f: FeedSettings) => f.url === currentFeed);
        if (!feed) return;

        await this.settingsService.updateSettings({
          ...settings,
          lastReadArticle: target
        });
        await this.navigateArticles('current');
      }
    } catch (error) {
      this.logService.error('Erreur lors de la navigation vers l\'article', { error });
      throw error;
    }
  }

  /**
   * Navigate between articles in reading mode
   * 
   * Navigation scope: Articles within the same feed folder
   * - Keeps user focused on one feed at a time
   * - Articles sorted by modification time (newest first)
   * 
   * Wraparound behavior:
   * - 'next' from last article → wraps to first article
   * - 'previous' from first article → wraps to last article
   * 
   * This provides infinite navigation without dead ends.
   * 
   * Keyboard shortcuts (registered in main.ts):
   * - Cmd+Right: next article
   * - Cmd+Left: previous article
   */
  async navigateArticles(direction: 'next' | 'previous' | 'current'): Promise<void> {
    if (!this.currentState.isReading) {
      this.logService.warn('Pas en mode lecture');
      return;
    }

    const currentFile = this.currentState.currentFile;
    if (!currentFile) {
      this.logService.warn('Aucun article actif');
      return;
    }

    // Extract feed folder from path (RSS/tech/article.md → tech)
    const currentPath = currentFile.path;
    const feedFolder = currentPath.split('/')[1];
    
    // Get all articles in same feed, sorted by recency
    const files = this.plugin.app.vault.getFiles()
      .filter(file => file.path.startsWith(`RSS/${feedFolder}/`))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    const currentIndex = files.findIndex(file => file.path === currentPath);
    if (currentIndex === -1) {
      this.logService.warn('Article actuel non trouvé dans le feed');
      return;
    }

    if (direction === 'current') {
      await this.navigateToArticle(files[currentIndex]);
      return;
    }

    // Wraparound navigation: modulo ensures index stays in bounds
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % files.length
      : (currentIndex - 1 + files.length) % files.length;

    await this.navigateToArticle(files[nextIndex]);
  }

  async markCurrentArticleAsRead(): Promise<void> {
    const currentFile = this.currentState.currentFile
    if (!currentFile) {
      this.logService.warn('Aucun article actif')
      return
    }

    try {
      const content = await this.plugin.app.vault.read(currentFile)
      if (!content.includes('#read')) {
        await this.plugin.app.vault.modify(
          currentFile,
          content + '\n#read'
        )
        this.logService.info('Article marqué comme lu', { path: currentFile.path })
      } else {
        this.logService.debug('Article déjà marqué comme lu', { path: currentFile.path })
      }
    } catch (error) {
      this.logService.error('Erreur lors du marquage de l\'article comme lu', { error })
      throw error
    }
  }

  async getGroups(): Promise<string[]> {
    try {
      const data = await this.storageService.loadData();
      return ['Sans groupe', ...(data.groups || [])];
    } catch (error) {
      this.logService.error('Erreur lors de la récupération des groupes', { error });
      return ['Sans groupe'];
    }
  }

  async updateFeedFolder(oldFolder: string, newFolder: string): Promise<void> {
    try {
      const data = await this.storageService.loadData();
      const feeds = data.feeds.map(feed => {
        if (feed.settings.folder === oldFolder) {
          return { 
            ...feed, 
            settings: { 
              ...feed.settings, 
              folder: newFolder 
            } 
          };
        }
        return feed;
      });

      await this.storageService.saveData({ ...data, feeds });
      this.logService.info('Dossier du feed mis à jour', { oldFolder, newFolder });
    } catch (error) {
      this.logService.error('Erreur lors de la mise à jour du dossier du feed', { error });
      throw error;
    }
  }

  isActive(): boolean {
    return this.currentState.isReading;
  }

  getState(): ReadingState {
    return { ...this.currentState };
  }

  /**
   * Sanitize HTML content for clean Markdown display
   * 
   * Transformations:
   * 1. Parse HTML with DOMParser (handles malformed HTML)
   * 2. Convert <img> tags to Markdown ![](url)
   * 3. Strip inline styles (prevents formatting issues)
   * 4. Normalize whitespace (collapsed newlines/spaces)
   * 
   * Why needed:
   * - RSS content often has inline styles from original sites
   * - Obsidian's Markdown renderer expects clean text
   * - Images need Markdown syntax for proper rendering
   * 
   * Double conversion (DOM + regex):
   * - DOM conversion: Handles complex nested HTML
   * - Regex conversion: Catches any remaining HTML images
   * This redundancy ensures robustness with diverse RSS feeds
   */
  private cleanText(text: string): string {
    // Parse HTML safely with browser's DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    
    // Convert HTML images to Markdown syntax
    doc.querySelectorAll('img').forEach(img => {
      const markdown = `![](${img.src})`;
      const textNode = document.createTextNode(markdown);
      if (img.parentNode) {
        img.parentNode.replaceChild(textNode, img);
      }
    });
    
    // Remove inline styles that interfere with Obsidian's theme
    doc.querySelectorAll('p').forEach(p => {
      p.removeAttribute('style');
    });
    
    // Extract and normalize text
    const cleanedText = doc.body?.textContent || '';
    return cleanedText
      .replace(/\r?\n|\r/g, ' ')     // Collapse line breaks
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/<img.*?src="(.*?)".*?>/g, '![]($1)')  // Regex fallback for images
                                      // Pattern: <img...src="URL"...> → ![](URL)
                                      // Limitations: Doesn't handle src='single-quotes' or unquoted src
                                      // Acceptable: DOM parser above handles most cases
                                      // This catches any remaining HTML images in text
      .trim();
  }

  /**
   * Generate unique ID for article state tracking
   * 
   * Format: feedUrl::articleLink
   * 
   * Why composite key:
   * - Same article URL can appear in multiple feeds (syndication)
   * - Need to track read status per feed-article pair
   * - :: delimiter unlikely to appear in URLs (safe separator)
   * 
   * Used for: Tracking read/deleted status in settings.articleStates
   */
  private getArticleId(feedUrl: string, articleLink: string): string {
    return `${feedUrl}::${articleLink}`;
  }

  async saveArticles(articles: Article[], feed: Feed): Promise<void> {
    try {
      const settings = this.settingsService.getSettings();
      const baseFolder = settings.rssFolder;
      const groupFolder = feed.group 
        ? `${baseFolder}/${feed.group}` 
        : baseFolder;
      
      // Filtrer les articles déjà supprimés
      const filteredArticles = articles.filter(article => {
        const articleId = this.getArticleId(feed.url, article.link);
        const state = settings.articleStates?.[articleId];
        return !state?.deleted;
      });
      
      if (feed.type === 'uniqueFile') {
        // Créer un seul fichier pour tous les articles
        const content = filteredArticles.map(article => {
          const articleId = this.getArticleId(feed.url, article.link);
          const state = settings.articleStates?.[articleId];
          const readStatus = state?.read ? '✓ Lu' : '◯ Non lu';
          return `# ${this.cleanText(article.title)}\n\nStatut: ${readStatus}\nDate: ${article.date}\nLien: ${article.link}\n\n${this.cleanText(article.content)}`;
        }).join('\n\n---\n\n');
        
        const filePath = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
        await this.plugin.app.vault.adapter.write(filePath, content);
        this.logService.debug('Articles sauvegardés dans un fichier unique', { error: new Error(filePath) });
      } else {
        // Créer un fichier par article
        const feedFolder = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}`;
        
        // S'assurer que le dossier existe
        if (!(await this.plugin.app.vault.adapter.exists(feedFolder))) {
          await this.plugin.app.vault.createFolder(feedFolder);
        }
        
        for (const article of filteredArticles) {
          const articleId = this.getArticleId(feed.url, article.link);
          const state = settings.articleStates?.[articleId];
          const readStatus = state?.read ? '✓ Lu' : '◯ Non lu';
          const fileName = `${feedFolder}/${this.cleanText(article.title).replace(/[\\/:*?"<>|]/g, '_')}.md`;
          const content = `# ${this.cleanText(article.title)}\n\nStatut: ${readStatus}\nDate: ${article.date}\nLien: ${article.link}\n\n${this.cleanText(article.content)}`;
          
          await this.plugin.app.vault.adapter.write(fileName, content);
          this.logService.debug('Article sauvegardé', { error: new Error(fileName) });
        }
      }
      
      this.logService.info('Articles sauvegardés avec succès', { 
        error: new Error(`${feed.title} (${filteredArticles.length} articles)`)
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logService.error('Erreur lors de la sauvegarde des articles', { error });
      }
      throw error;
    }
  }

  /**
   * Extrait les informations d'un article à partir d'un fichier
   */
  private async parseArticleFromFile(file: TFile): Promise<Article> {
    const content = await this.plugin.app.vault.read(file);
    const articles = content.split('\n---\n');
    const article = articles[0]; // ou sélectionner l'article actif basé sur une certaine logique
    
    const titleMatch = article.match(/# (.*)/);
    const linkMatch = article.match(/Lien: (.*)/);
    const dateMatch = article.match(/Date: (.*)/);

    // Mettre à jour l'état de lecture dans les articleStates si nécessaire
    if (content.includes('#read')) {
      const settings = this.settingsService.getSettings();
      const articleId = this.getArticleId(file.path, linkMatch ? linkMatch[1] : '');
      if (settings.articleStates) {
        settings.articleStates[articleId] = {
          ...settings.articleStates[articleId],
          read: true,
          lastUpdate: Date.now()
        };
        await this.settingsService.updateSettings(settings);
      }
    }

    return {
      title: titleMatch ? titleMatch[1] : 'Sans titre',
      link: linkMatch ? linkMatch[1] : '',
      date: dateMatch ? new Date(dateMatch[1]) : new Date(),
      content: article,
      feedUrl: file.path,
      feedTitle: titleMatch ? titleMatch[1] : 'Sans titre',
      path: file.path
    };
  }

  async deleteCurrentArticle(): Promise<void> {
    if (!this.currentState.currentFile) {
      this.logService.warn('Aucun article actif');
      return;
    }

    try {
      const settings = this.settingsService.getSettings();
      const currentFeed = settings.currentFeed;
      const lastReadArticle = settings.lastReadArticle;

      if (currentFeed && lastReadArticle) {
        await this.markArticleAsDeleted(currentFeed, lastReadArticle);
      }

      const feed = settings.feeds.find((f: FeedSettings) => f.url === currentFeed);
      if (feed && feed.type === 'single') {
        const leaf = this.plugin.app.workspace.activeLeaf;
        if (leaf?.view) {
          const view = leaf.view as any;
          // Vider le contenu de la vue si possible
          if (view.containerEl && view.containerEl.empty) {
            view.containerEl.empty();
          }
        }
      } else {
        await this.plugin.app.vault.delete(this.currentState.currentFile);
      }

      this.logService.info('Article supprimé', { error: new Error(this.currentState.currentFile.path) });
      await this.navigateArticles('next');
    } catch (error) {
      if (error instanceof Error) {
        this.logService.error('Erreur lors de la suppression de l\'article', { error });
      }
      throw error;
    }
  }

  updateNavigationButtons(currentIndex: number, totalArticles: number): void {
    const prevButton = document.querySelector('.rss-nav-prev') as HTMLButtonElement
    const nextButton = document.querySelector('.rss-nav-next') as HTMLButtonElement

    if (prevButton) {
      prevButton.disabled = currentIndex <= 0
    }
    if (nextButton) {
      nextButton.disabled = currentIndex >= totalArticles - 1
    }
  }

  async refreshCurrentArticle(): Promise<void> {
    const leaf = this.plugin.app.workspace.activeLeaf;
    if (leaf) {
      const view = leaf.view as any; // Type assertion nécessaire car le type exact n'est pas disponible
      if (view && typeof view.load === 'function') {
        await view.load();
      }
    }
  }

  async markArticleAsRead(feedUrl: string, articleLink: string): Promise<void> {
    const settings = this.settingsService.getSettings()
    const articleId = this.getArticleId(feedUrl, articleLink)
    const articleStates = settings.articleStates || {}
    
    articleStates[articleId] = {
      ...articleStates[articleId],
      read: true,
      lastUpdate: Date.now()
    }

    await this.settingsService.updateSettings({
      ...settings,
      articleStates
    })
  }

  async markArticleAsDeleted(feedUrl: string, articleLink: string): Promise<void> {
    const settings = this.settingsService.getSettings()
    const articleId = this.getArticleId(feedUrl, articleLink)
    const articleStates = settings.articleStates || {}
    
    articleStates[articleId] = {
      ...articleStates[articleId],
      deleted: true,
      lastUpdate: Date.now()
    }

    await this.settingsService.updateSettings({
      ...settings,
      articleStates
    })
  }

  async updateFeedSelect(selectElement: HTMLSelectElement, currentFolder: string): Promise<void> {
    const settings = this.settingsService.getSettings();
    
    // Vider le select
    selectElement.innerHTML = '';
    
    // Filtrer les feeds du dossier sélectionné
    const feeds = settings.feeds.filter((feed: FeedSettings) => 
      (!currentFolder && !feed.group) || 
      feed.group === currentFolder
    );

    // Ajouter une option vide
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Sélectionner un feed...';
    selectElement.appendChild(defaultOption);

    // Ajouter une option pour chaque feed
    feeds.forEach((feed: FeedSettings) => {
      const option = document.createElement('option');
      option.value = feed.url;
      option.text = feed.title;
      if (feed.url === settings.currentFeed) {
        option.selected = true;
      }
      selectElement.appendChild(option);
    });

    // Ajouter l'événement de changement
    selectElement.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      await this.settingsService.updateSettings({
        ...settings,
        currentFeed: target.value
      });
    });
  }

  async selectFolder(folderName: string): Promise<void> {
    const settings = this.settingsService.getSettings()
    await this.settingsService.updateSettings({
      ...settings,
      currentFolder: folderName
    })
    
    // Mettre à jour le sélecteur de feeds
    const feedSelect = document.querySelector('.reading-mode-select:nth-child(2)') as HTMLSelectElement
    if (feedSelect) {
      await this.updateFeedSelect(feedSelect, folderName)
    }
  }

  async cleanArticleStates(): Promise<void> {
    const settings = this.settingsService.getSettings()
    const now = Date.now()
    const retentionPeriod = settings.retentionDays * 86400000 // conversion en millisecondes
    
    const newStates: Record<string, any> = {}
    for (const [articleId, state] of Object.entries(settings.articleStates || {})) {
      if (now - state.lastUpdate < retentionPeriod) {
        newStates[articleId] = state
      }
    }
    
    await this.settingsService.updateSettings({
      ...settings,
      articleStates: newStates
    })
  }

  async cleanup(): Promise<void> {
    try {
      // Sortir du mode lecture si actif
      if (this.isActive()) {
        await this.exitReadingMode();
      }
      
      // Nettoyage des états
      this.currentState.currentFile = null;
      this.currentState.lastFile = null;
      
      this.logService.debug('ReadingService nettoyé avec succès');
    } catch (error) {
      this.logService.error('Erreur lors du nettoyage du ReadingService', { error: error as Error });
      throw error;
    }
  }
} 