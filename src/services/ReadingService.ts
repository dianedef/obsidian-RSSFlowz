import { Plugin, TFile } from 'obsidian'
import { LogServiceInterface } from '../types/logs'
import { ReadingState } from '../types/reading'

export class ReadingService {
  private currentState: ReadingState = {
    isReading: false,
    currentFile: null,
    lastFile: null
  }

  constructor(
    private plugin: Plugin,
    private logService: LogServiceInterface
  ) {}

  async enterReadingMode(): Promise<void> {
    if (this.currentState.isReading) {
      this.logService.warn('Déjà en mode lecture')
      return
    }

    const lastFile = this.currentState.lastFile
    if (lastFile) {
      await this.navigateToArticle(lastFile)
    }

    this.currentState.isReading = true
    this.logService.info('Mode lecture activé')
  }

  async exitReadingMode(): Promise<void> {
    if (!this.currentState.isReading) {
      this.logService.warn('Pas en mode lecture')
      return
    }

    this.currentState.isReading = false
    this.currentState.currentFile = null
    this.logService.info('Mode lecture désactivé')
  }

  async navigateToArticle(file: TFile): Promise<void> {
    try {
      const leaf = this.plugin.app.workspace.getLeaf()
      if (!leaf) {
        throw new Error('Impossible de créer une nouvelle feuille')
      }

      await leaf.openFile(file)
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

  getState(): ReadingState {
    return { ...this.currentState }
  }
} 