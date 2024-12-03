import { App, TFile, WorkspaceLeaf } from 'obsidian'
import { StorageService } from './StorageService'
import { LogService } from './LogService'

export class ReadingService {
  private isReadingMode = false

  constructor(
    private app: App,
    private storageService: StorageService,
    private logService: LogService
  ) {}

  async enterReadingMode(): Promise<void> {
    if (this.isReadingMode) {
      return
    }

    this.isReadingMode = true
    this.addReadingModeStyles()

    try {
      const data = await this.storageService.loadData()
      if (data.lastReadArticle) {
        const file = this.app.vault.getAbstractFileByPath(data.lastReadArticle)
        if (file instanceof TFile) {
          await this.openArticle(file)
        }
      } else {
        const currentFile = this.app.workspace.getActiveFile()
        if (currentFile) {
          await this.openArticle(currentFile)
        }
      }
    } catch (error) {
      this.logService.error('Erreur lors de l\'entrée en mode lecture', error as Error)
    }
  }

  async exitReadingMode(): Promise<void> {
    if (!this.isReadingMode) {
      return
    }

    this.isReadingMode = false
    this.removeReadingModeStyles()
  }

  async navigateArticles(direction: 'next' | 'previous'): Promise<void> {
    const currentFile = this.app.workspace.getActiveFile()
    if (!currentFile) {
      return
    }

    const files = this.app.vault.getFiles()
      .filter(file => file.extension === 'md')
      .sort((a, b) => a.path.localeCompare(b.path))

    const currentIndex = files.findIndex(file => file.path === currentFile.path)
    if (currentIndex === -1) {
      return
    }

    const nextIndex = direction === 'next'
      ? currentIndex + 1
      : currentIndex - 1

    if (nextIndex >= 0 && nextIndex < files.length) {
      await this.openArticle(files[nextIndex])
    }
  }

  async navigateToArticle(path: string): Promise<void> {
    try {
      const file = this.app.vault.getAbstractFileByPath(path)
      if (file instanceof TFile) {
        await this.openArticle(file)
      }
    } catch (error) {
      this.logService.error('Erreur lors de la navigation vers l\'article', error as Error)
    }
  }

  async markCurrentArticleAsRead(): Promise<void> {
    const currentFile = this.app.workspace.getActiveFile()
    if (!currentFile) {
      return
    }

    const data = await this.storageService.loadData()
    if (!data.readArticles) {
      data.readArticles = []
    }

    if (!data.readArticles.includes(currentFile.path)) {
      data.readArticles.push(currentFile.path)
    }

    data.lastReadArticle = currentFile.path
    await this.storageService.saveData(data)
  }

  private addReadingModeStyles(): void {
    const styleEl = document.createElement('style')
    styleEl.id = 'rss-reading-mode'
    styleEl.textContent = `
      .workspace-leaf-content[data-type='markdown'] {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        font-size: 1.1em;
        line-height: 1.6;
      }
      .rss-reading-mode img {
        max-width: 100%;
        height: auto;
      }
      .rss-reading-mode h1 {
        font-size: 2em;
        margin-bottom: 1em;
      }
      .rss-reading-mode a {
        color: var(--text-accent);
        text-decoration: none;
      }
      .rss-reading-mode a:hover {
        text-decoration: underline;
      }
    `
    document.head.appendChild(styleEl)
  }

  private removeReadingModeStyles(): void {
    const styleEl = document.getElementById('rss-reading-mode')
    if (styleEl) {
      styleEl.remove()
    }
  }

  private async openArticle(file: TFile): Promise<void> {
    try {
      const leaf = this.app.workspace.getLeaf(false)
      if (!leaf) {
        this.logService.error('Impossible d\'obtenir une feuille de travail')
        return
      }

      await leaf.openFile(file)
      const data = await this.storageService.loadData()
      await this.storageService.saveData({
        ...data,
        lastReadArticle: file.path
      })
    } catch (error) {
      this.logService.error('Erreur lors de l\'ouverture du fichier', error as Error)
    }
  }
} 