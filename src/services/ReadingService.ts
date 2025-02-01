import { Plugin, TFile, Notice } from 'obsidian'
import { LogServiceInterface } from '../types/logs'
import { ReadingState } from '../types/reading'
import { StorageService } from './StorageService'
import { SettingsService } from './SettingsService'
import { Article, Feed, FeedSettings } from '../types'
import { PluginSettings } from '../types/settings'

export class ReadingService {
  private currentState: ReadingState = {
    isReading: false,
    currentFile: null,
    lastFile: null
  }

  private static readonly READING_MODE_STYLE_ID = 'rss-reading-mode-styles'

  constructor(
    private plugin: Plugin,
    private storageService: StorageService,
    private settingsService: SettingsService,
    private logService: LogServiceInterface
  ) {}

  async enterReadingMode(): Promise<void> {
    if (this.currentState.isReading) {
      this.logService.warn('Déjà en mode lecture')
      return
    }

    try {
      // Appliquer les styles CSS
      this.applyReadingModeStyles()

      const lastFile = this.currentState.lastFile
      if (lastFile) {
        await this.navigateToArticle(lastFile)
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
   * Applique les styles CSS du mode lecture
   */
  private applyReadingModeStyles(): void {
    const existingStyle = document.getElementById(ReadingService.READING_MODE_STYLE_ID)
    if (existingStyle) {
      return
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

    const currentPath = currentFile.path;
    const feedFolder = currentPath.split('/')[1]; // Exemple: RSS/tech/article.md -> tech
    
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

  async cleanOldArticles(): Promise<void> {
    try {
      const settings = this.settingsService.getSettings();
      const folder = settings.rssFolder;
      const files = await this.plugin.app.vault.adapter.list(folder);
      const cutoffDate = Date.now() - (settings.retentionDays * 86400000); // 86400000 = 24h * 60m * 60s * 1000ms

      for (const file of files.files) {
        try {
          const stat = await this.plugin.app.vault.adapter.stat(file);
          if (stat && stat.mtime < cutoffDate) {
            await this.plugin.app.vault.adapter.remove(file);
            this.logService.debug('Article supprimé', { error: new Error(file) });
          }
        } catch (error) {
          if (error instanceof Error) {
            this.logService.error('Erreur lors du nettoyage de l\'article', { error });
          }
        }
      }
      
      this.logService.info('Nettoyage des anciens articles terminé');
    } catch (error) {
      if (error instanceof Error) {
        this.logService.error('Erreur lors du nettoyage des anciens articles', { error });
      }
      throw error;
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

  private cleanText(text: string): string {
    // Utiliser DOMParser pour parser correctement le HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    
    // Convertir les images en Markdown
    doc.querySelectorAll('img').forEach(img => {
      const markdown = `![](${img.src})`;
      const textNode = document.createTextNode(markdown);
      if (img.parentNode) {
        img.parentNode.replaceChild(textNode, img);
      }
    });
    
    // Supprimer les styles des balises p
    doc.querySelectorAll('p').forEach(p => {
      p.removeAttribute('style');
    });
    
    // Récupérer le texte nettoyé
    const cleanedText = doc.body?.textContent || '';
    return cleanedText
      .replace(/\r?\n|\r/g, ' ')  // Remplace les sauts de ligne par des espaces
      .replace(/\s+/g, ' ')       // Normalise les espaces multiples
      .replace(/<img.*?src="(.*?)".*?>/g, '![]($1)') // Convertit les images HTML en Markdown
      .trim();                    // Supprime les espaces en début et fin
  }

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
    const settings = this.settingsService.getSettings()
    
    // Vider le select
    selectElement.innerHTML = ''
    
    // Filtrer les feeds du dossier sélectionné
    const feeds = settings.feeds.filter((feed: FeedSettings) => 
      (currentFolder === 'Défaut' && !feed.group) || 
      feed.group === currentFolder
    )

    // Ajouter une option par défaut
    const defaultOption = document.createElement('option')
    defaultOption.value = ''
    defaultOption.text = 'Sélectionner un feed...'
    selectElement.appendChild(defaultOption)

    // Ajouter une option pour chaque feed
    feeds.forEach((feed: FeedSettings) => {
      const option = document.createElement('option')
      option.value = feed.url
      option.text = feed.title
      if (feed.url === settings.currentFeed) {
        option.selected = true
      }
      selectElement.appendChild(option)
    })

    // Ajouter l'événement de changement
    selectElement.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLSelectElement
      await this.settingsService.updateSettings({
        ...settings,
        currentFeed: target.value
      })
    })
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
} 