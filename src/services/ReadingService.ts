import { App, TFile, WorkspaceLeaf } from 'obsidian'
import { RSSItem } from '../types'

export interface ReadingState {
  isActive: boolean
  currentFeedId?: string
  currentArticleId?: string
  lastReadArticleId?: string
}

export class ReadingService {
  private state: ReadingState = {
    isActive: false
  }

  constructor(private app: App) {}

  /**
   * Active le mode lecture
   */
  async enterReadingMode(): Promise<void> {
    if (this.state.isActive) return

    try {
      // Ajouter les styles CSS pour le mode lecture
      this.addReadingModeStyles()
      
      // Mettre à jour l'état
      this.state.isActive = true

      // Charger le dernier article lu s'il existe
      if (this.state.lastReadArticleId) {
        await this.navigateToArticle(this.state.lastReadArticleId)
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation du mode lecture:', error)
      throw error
    }
  }

  /**
   * Désactive le mode lecture
   */
  exitReadingMode(): void {
    if (!this.state.isActive) return

    try {
      // Supprimer les styles CSS
      this.removeReadingModeStyles()
      
      // Réinitialiser l'état
      this.state = {
        isActive: false
      }
    } catch (error) {
      console.error('Erreur lors de la désactivation du mode lecture:', error)
      throw error
    }
  }

  /**
   * Navigue vers l'article suivant ou précédent
   * @param direction - Direction de navigation ('next' ou 'previous')
   */
  async navigateArticles(direction: 'next' | 'previous'): Promise<void> {
    if (!this.state.isActive || !this.state.currentFeedId) return

    try {
      const currentFile = this.app.workspace.getActiveFile()
      if (!currentFile) return

      const folder = currentFile.parent
      if (!folder) return

      // Récupérer tous les fichiers du dossier
      const files = await this.getArticleFiles(folder.path)
      
      // Trier par date de modification (du plus récent au plus ancien)
      files.sort((a, b) => b.stat.mtime - a.stat.mtime)

      // Trouver l'index de l'article actuel
      const currentIndex = files.findIndex(f => f.path === currentFile.path)
      if (currentIndex === -1) return

      // Calculer le nouvel index
      let newIndex: number
      if (direction === 'next') {
        newIndex = currentIndex + 1
        if (newIndex >= files.length) return
      } else {
        newIndex = currentIndex - 1
        if (newIndex < 0) return
      }

      // Ouvrir le nouvel article
      await this.openArticle(files[newIndex])
      
      // Mettre à jour l'état
      this.state.currentArticleId = files[newIndex].basename
      this.state.lastReadArticleId = files[newIndex].basename
    } catch (error) {
      console.error('Erreur lors de la navigation entre les articles:', error)
      throw error
    }
  }

  /**
   * Navigue directement vers un article spécifique
   * @param articleId - ID de l'article
   */
  async navigateToArticle(articleId: string): Promise<void> {
    if (!this.state.isActive) return

    try {
      const file = this.app.vault.getFiles().find(f => f.basename === articleId)
      if (!file) return

      await this.openArticle(file)
      
      // Mettre à jour l'état
      this.state.currentArticleId = articleId
      this.state.lastReadArticleId = articleId
    } catch (error) {
      console.error('Erreur lors de la navigation vers l\'article:', error)
      throw error
    }
  }

  /**
   * Marque l'article actuel comme lu
   */
  async markCurrentArticleAsRead(): Promise<void> {
    if (!this.state.currentArticleId) return

    try {
      const file = this.app.workspace.getActiveFile()
      if (!file) return

      // Lire le contenu actuel
      const content = await this.app.vault.read(file)
      
      // Mettre à jour le statut
      const updatedContent = content.replace(
        /Statut: ◯ Non lu/,
        'Statut: ✓ Lu'
      )
      
      // Sauvegarder les modifications
      await this.app.vault.modify(file, updatedContent)
    } catch (error) {
      console.error('Erreur lors du marquage de l\'article comme lu:', error)
      throw error
    }
  }

  /**
   * Vérifie si le mode lecture est actif
   */
  isReadingModeActive(): boolean {
    return this.state.isActive
  }

  /**
   * Récupère l'état actuel du mode lecture
   */
  getState(): ReadingState {
    return { ...this.state }
  }

  /**
   * Ajoute les styles CSS pour le mode lecture
   */
  private addReadingModeStyles(): void {
    const styleEl = document.createElement('style')
    styleEl.id = 'rss-reading-mode-styles'
    styleEl.textContent = `
      .rss-reading-mode {
        --header-height: 0px !important;
        --file-explorer-width: 0px !important;
        max-width: 800px !important;
        margin: 0 auto !important;
        padding: 2rem !important;
      }

      .rss-reading-mode .markdown-preview-view {
        padding: 0 !important;
      }

      .rss-reading-mode h1 {
        font-size: 2.5em !important;
        margin-bottom: 1.5rem !important;
      }

      .rss-reading-mode img {
        max-width: 100% !important;
        height: auto !important;
        margin: 1rem 0 !important;
      }

      .rss-reading-mode .nav-buttons {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        display: flex;
        gap: 1rem;
        z-index: 1000;
      }

      .rss-reading-mode .nav-button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        cursor: pointer;
        border: none;
      }

      .rss-reading-mode .nav-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `
    document.head.appendChild(styleEl)
  }

  /**
   * Supprime les styles CSS du mode lecture
   */
  private removeReadingModeStyles(): void {
    const styleEl = document.getElementById('rss-reading-mode-styles')
    if (styleEl) {
      styleEl.remove()
    }
  }

  /**
   * Récupère les fichiers d'articles d'un dossier
   * @param folderPath - Chemin du dossier
   */
  private async getArticleFiles(folderPath: string): Promise<TFile[]> {
    return this.app.vault.getFiles()
      .filter(file => 
        file.parent?.path === folderPath &&
        file.extension === 'md'
      )
  }

  /**
   * Ouvre un article dans l'éditeur
   * @param file - Fichier à ouvrir
   */
  private async openArticle(file: TFile): Promise<void> {
    const leaf = this.getOrCreateLeaf()
    await leaf.openFile(file)
    
    // Ajouter la classe pour le mode lecture
    const contentEl = leaf.view.contentEl
    contentEl.classList.add('rss-reading-mode')
  }

  /**
   * Récupère ou crée un nouvel onglet
   */
  private getOrCreateLeaf(): WorkspaceLeaf {
    const leaf = this.app.workspace.getLeaf(false)
    if (!leaf) {
      return this.app.workspace.getLeaf(true)
    }
    return leaf
  }
} 