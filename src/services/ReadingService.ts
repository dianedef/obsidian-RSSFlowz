import { Plugin, TFile, Notice } from 'obsidian'
import { LogServiceInterface } from '../types/logs'
import { ReadingState } from '../types/reading'
import { StorageService } from './StorageService'
import { SettingsService } from './SettingsService'
import { Article, Feed } from '../types'

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

  async navigateToArticle(file: TFile): Promise<void> {
    try {
      this.currentState.currentFile = file
      this.currentState.lastFile = file
      this.logService.debug('Navigation vers article', { path: file.path })
    } catch (error) {
      this.logService.error('Erreur lors de la navigation vers l\'article', { error })
      throw error
    }
  }

  async navigateArticles(direction: 'next' | 'previous'): Promise<void> {
    if (!this.currentState.isReading) {
      this.logService.warn('Pas en mode lecture')
      return
    }

    const currentFile = this.currentState.currentFile
    if (!currentFile) {
      this.logService.warn('Aucun article actif')
      return
    }

    const currentPath = currentFile.path
    const feedFolder = currentPath.split('/')[1] // Exemple: RSS/tech/article.md -> tech
    
    const files = this.plugin.app.vault.getFiles()
      .filter(file => file.path.startsWith(`RSS/${feedFolder}/`))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)

    const currentIndex = files.findIndex(file => file.path === currentPath)
    if (currentIndex === -1) {
      this.logService.warn('Article actuel non trouvé dans le feed')
      return
    }

    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % files.length
      : (currentIndex - 1 + files.length) % files.length

    await this.navigateToArticle(files[nextIndex])
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
          if (stat.mtime < cutoffDate) {
            await this.plugin.app.vault.adapter.remove(file);
            this.logService.debug('Article supprimé', { path: file });
          }
        } catch (error) {
          this.logService.error('Erreur lors du nettoyage de l\'article', { 
            path: file,
            error
          });
        }
      }
      
      this.logService.info('Nettoyage des anciens articles terminé');
    } catch (error) {
      this.logService.error('Erreur lors du nettoyage des anciens articles', { error });
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
      img.replaceWith(parser.parseFromString(markdown, 'text/html').body.textContent);
    });
    
    // Supprimer les styles des balises p
    doc.querySelectorAll('p').forEach(p => {
      p.removeAttribute('style');
    });
    
    // Récupérer le texte nettoyé
    return doc.body.textContent
      .replace(/\r?\n|\r/g, ' ')  // Remplace les sauts de ligne par des espaces
      .replace(/\s+/g, ' ')       // Normalise les espaces multiples
      .replace(/<img.*?src="(.*?)".*?>/g, '![]($1)') // Convertit les images HTML en Markdown
      .trim();                    // Supprime les espaces en début et fin
  }

  private getArticleId(feedUrl: string, articleLink: string): string {
    return `${feedUrl}|${articleLink}`;
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
          const isRead = settings.articleStates?.[articleId]?.read || false;
          return `# ${this.cleanText(article.title)}\n\nStatut: ${isRead ? '✓ Lu' : '◯ Non lu'}\nDate: ${article.date}\nLien: ${article.link}\n\n${this.cleanText(article.content)}`;
        }).join('\n\n---\n\n');
        
        const filePath = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
        await this.plugin.app.vault.adapter.write(filePath, content);
        this.logService.debug('Articles sauvegardés dans un fichier unique', { path: filePath });
      } else {
        // Créer un fichier par article
        const feedFolder = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}`;
        
        // S'assurer que le dossier existe
        if (!(await this.plugin.app.vault.adapter.exists(feedFolder))) {
          await this.plugin.app.vault.createFolder(feedFolder);
        }
        
        for (const article of filteredArticles) {
          const articleId = this.getArticleId(feed.url, article.link);
          const isRead = settings.articleStates?.[articleId]?.read || false;
          const fileName = `${feedFolder}/${this.cleanText(article.title).replace(/[\\/:*?"<>|]/g, '_')}.md`;
          const content = `# ${this.cleanText(article.title)}\n\nStatut: ${isRead ? '✓ Lu' : '◯ Non lu'}\nDate: ${article.date}\nLien: ${article.link}\n\n${this.cleanText(article.content)}`;
          
          await this.plugin.app.vault.adapter.write(fileName, content);
          this.logService.debug('Article sauvegardé', { path: fileName });
        }
      }
      
      this.logService.info('Articles sauvegardés avec succès', { 
        feed: feed.title,
        count: filteredArticles.length 
      });
    } catch (error) {
      this.logService.error('Erreur lors de la sauvegarde des articles', { 
        feed: feed.title,
        error 
      });
      throw error;
    }
  }

  /**
   * Extrait les informations d'un article à partir d'un fichier
   */
  private async parseArticleFromFile(file: TFile): Promise<Article> {
    const content = await this.plugin.app.vault.read(file)
    const articles = content.split('\n---\n')
    const article = articles[0] // ou sélectionner l'article actif basé sur une certaine logique
    
    const titleMatch = article.match(/# (.*)/)
    const linkMatch = article.match(/Lien: (.*)/)
    const dateMatch = article.match(/Date: (.*)/)

    return {
      title: titleMatch ? titleMatch[1] : 'Sans titre',
      link: linkMatch ? linkMatch[1] : '',
      date: dateMatch ? new Date(dateMatch[1]) : new Date(),
      content: article,
      feedUrl: file.path,
      feedTitle: titleMatch ? titleMatch[1] : 'Sans titre',
      path: file.path,
      isRead: content.includes('#read')
    }
  }

  
  updateFeedSelect(selectElement, currentFolder) {
    // Vider le select
    selectElement.innerHTML = '';
    
    // Filtrer les feeds du dossier sélectionné
    const feeds = this.settings.feeds.filter(feed => 
       (currentFolder === 'Défaut' && !feed.group) || 
       feed.group === currentFolder
    );

    // Ajouter une option par défaut
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Sélectionner un feed...';
    selectElement.appendChild(defaultOption);

    // Ajouter une option pour chaque feed
    feeds.forEach(feed => {
       const option = document.createElement('option');
       option.value = feed.url;
       option.text = feed.title;
       if (feed.url === this.settings.currentFeed) {
          option.selected = true;
       }
       selectElement.appendChild(option);
    });

    // Ajouter l'événement de changement
    selectElement.addEventListener('change', (e) => {
       this.settings.currentFeed = e.target.value;
       this.saveData(this.settings);
       // Ici vous pourrez ajouter la logique pour charger les articles du feed sélectionné
    });
 }

 async selectFolder(folderName) {
    this.settings.currentFolder = folderName;
    await this.saveData(this.settings);
    
    // Mettre à jour le sélecteur de feeds
    const feedSelect = this.readingModeContainer.querySelector('.reading-mode-select:nth-child(2)');
    if (feedSelect) {
       this.updateFeedSelect(feedSelect, folderName);
    }
 }

 getArticleId(feedUrl, articleLink) {
    return `${feedUrl}::${articleLink}`;
 }

 async markArticleAsRead(feedUrl, articleLink) {
    const articleId = this.getArticleId(feedUrl, articleLink);
    this.settings.articleStates[articleId] = {
       ...this.settings.articleStates[articleId],
       read: true,
       lastUpdate: Date.now()
    };
    await this.saveData(this.settings);
 }

 async markArticleAsDeleted(feedUrl, articleLink) {
    const articleId = this.getArticleId(feedUrl, articleLink);
    this.settings.articleStates[articleId] = {
       ...this.settings.articleStates[articleId],
       deleted: true,
       lastUpdate: Date.now()
    };
    await this.saveData(this.settings);
 }

 async markCurrentArticleAsRead() {
    if (!this.settings.currentFeed || !this.settings.lastReadArticle) return;
    
    await this.markArticleAsRead(this.settings.currentFeed, this.settings.lastReadArticle);
    // Rafraîchir l'affichage de l'article
    await this.refreshCurrentArticle();
    new Notice('Article marqué comme lu');
 }

 async deleteCurrentArticle() {
    if (!this.settings.currentFeed || !this.settings.lastReadArticle) return;
    
    await this.markArticleAsDeleted(this.settings.currentFeed, this.settings.lastReadArticle);
    // Supprimer le fichier physiquement
    const feed = this.settings.feeds.find(f => f.url === this.settings.currentFeed);
    if (feed) {
       const baseFolder = this.settings.rssFolder;
       const groupFolder = feed.group ? `${baseFolder}/${feed.group}` : baseFolder;
       const articlePath = feed.type === 'uniqueFile'
          ? `${groupFolder}/${feed.title}.md`
          : `${groupFolder}/${feed.title}/${this.settings.lastReadArticle}.md`;
       
       try {
          await this.app.vault.adapter.remove(articlePath);
          new Notice('Article supprimé');
          // Passer à l'article suivant
          await this.navigateArticles('next');
       } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          new Notice('Erreur lors de la suppression de l\'article');
       }
    }
 }

 async cleanArticleStates() {
    const now = Date.now();
    const retentionPeriod = this.settings.retentionDays * 86400000; // conversion en millisecondes
    
    const newStates = {};
    for (const [articleId, state] of Object.entries(this.settings.articleStates)) {
       if (now - state.lastUpdate < retentionPeriod) {
          newStates[articleId] = state;
       }
    }
    
    this.settings.articleStates = newStates;
    await this.saveData(this.settings);
 }

 async navigateArticles(direction) {
    try {
        // Récupérer tous les feeds du groupe actuel
        const currentGroup = this.settings.currentFolder || 'Défaut';
        let groupFeeds = this.settings.feeds.filter(feed => 
            (currentGroup === 'Défaut' && !feed.group) || 
            feed.group === currentGroup
        );

        // Si un feed spécifique est sélectionné, filtrer uniquement ses articles
        if (this.settings.currentFeed) {
            groupFeeds = groupFeeds.filter(f => f.url === this.settings.currentFeed);
        }

        if (!groupFeeds.length) {
            new Notice('Aucun feed disponible dans ce groupe');
            return;
        }

        // Récupérer tous les articles des feeds sélectionnés
        let allArticles = [];
        for (const feed of groupFeeds) {
            const baseFolder = this.settings.rssFolder;
            const groupFolder = feed.group ? `${baseFolder}/${feed.group}` : baseFolder;

            try {
                if (feed.type === 'uniqueFile') {
                    // Pour les feeds en fichier unique
                    const filePath = `${groupFolder}/${feed.title}.md`;
                    const content = await this.app.vault.adapter.read(filePath);
                    const articles = content.split('\n---\n').map(article => {
                        const titleMatch = article.match(/# (.*)/);
                        const linkMatch = article.match(/Lien: (.*)/);
                        const dateMatch = article.match(/Date: (.*)/);
                        return {
                            title: titleMatch?.[1] || 'Sans titre',
                            link: linkMatch?.[1] || '',
                            date: dateMatch?.[1] || '',
                            content: article,
                            feedUrl: feed.url,
                            feedTitle: feed.title,
                            path: filePath
                        };
                    });
                    allArticles.push(...articles);
                } else {
                    // Pour les feeds multi-fichiers
                    const feedFolder = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}`;
                    const files = await this.app.vault.adapter.list(feedFolder);
                    const articles = await Promise.all(files.files.map(async file => {
                        const content = await this.app.vault.adapter.read(file);
                        const titleMatch = content.match(/# (.*)/);
                        const linkMatch = content.match(/Lien: (.*)/);
                        const dateMatch = content.match(/Date: (.*)/);
                        return {
                            title: titleMatch?.[1] || 'Sans titre',
                            link: linkMatch?.[1] || '',
                            date: dateMatch?.[1] || '',
                            content: content,
                            feedUrl: feed.url,
                            feedTitle: feed.title,
                            path: file
                        };
                    }));
                    allArticles.push(...articles);
                }
            } catch (error) {
                console.error(`Erreur lors de la lecture du feed ${feed.title}:`, error);
            }
        }

        // Filtrer les articles supprimés
        allArticles = allArticles.filter(article => {
            const articleId = this.getArticleId(article.feedUrl, article.link);
            return !this.settings.articleStates[articleId]?.deleted;
        });

        // Trier par date (du plus récent au plus ancien)
        allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Trouver l'index de l'article actuel
        let currentIndex = allArticles.findIndex(article => 
            article.link === this.settings.lastReadArticle
        );
        if (currentIndex === -1) currentIndex = direction === 'next' ? -1 : allArticles.length;

        // Calculer le nouvel index
        let newIndex;
        if (direction === 'next') {
            newIndex = currentIndex + 1;
            if (newIndex >= allArticles.length) {
                new Notice('Fin des articles');
                return;
            }
        } else if (direction === 'previous') {
            newIndex = currentIndex - 1;
            if (newIndex < 0) {
                new Notice('Début des articles');
                return;
            }
        }

        // Ouvrir le nouvel article
        const article = allArticles[newIndex];
        this.settings.lastReadArticle = article.link;
        await this.saveData(this.settings);

        // Ouvrir le fichier
        const file = await this.app.vault.getAbstractFileByPath(article.path);
        if (file) {
            await this.app.workspace.getLeaf().openFile(file);
            
            // Si c'est un fichier unique, scroller jusqu'à l'article
            if (article.feedUrl && this.settings.feeds.find(f => f.url === article.feedUrl)?.type === 'uniqueFile') {
                setTimeout(() => {
                    const contentEl = this.app.workspace.activeLeaf.view.contentEl;
                    const sections = contentEl.querySelectorAll('h1');
                    for (const section of sections) {
                        if (section.textContent.includes(article.title)) {
                            section.scrollIntoView({ behavior: 'smooth' });
                            break;
                        }
                    }
                }, 100);
            }
        }

        // Mettre à jour l'interface
        this.updateNavigationButtons(newIndex, allArticles.length);

    } catch (error) {
        console.error('Erreur lors de la navigation:', error);
        new Notice('Erreur lors de la navigation entre les articles');
    }
 }

 // Méthode pour mettre à jour l'état des boutons de navigation
 updateNavigationButtons(currentIndex, totalArticles) {
    const prevButton = this.readingModeContainer.querySelector('button:nth-child(3)');
    const nextButton = this.readingModeContainer.querySelector('button:nth-child(4)');
    
    if (prevButton) {
       prevButton.disabled = currentIndex <= 0;
    }
    if (nextButton) {
       nextButton.disabled = currentIndex >= totalArticles - 1;
    }
 }

 // Méthode pour rafraîchir l'affichage de l'article courant
 async refreshCurrentArticle() {
    const leaf = this.app.workspace.activeLeaf;
    if (leaf && leaf.view) {
       await leaf.view.load();
    }
 }

 // Ajouter cette nouvelle méthode pour la navigation directe vers un article
 async navigateToArticle(articleLink) {
    if (!this.settings.currentFeed) return;
    
    const feed = this.settings.feeds.find(f => f.url === this.settings.currentFeed);
    if (!feed) return;

    this.settings.lastReadArticle = articleLink;
    await this.saveData(this.settings);
    await this.navigateArticles('current'); // Ajouter 'current' comme nouvelle option
 }
  
} 