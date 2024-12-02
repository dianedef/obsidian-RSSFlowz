import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReadingService } from '../../src/services/ReadingService'

describe('ReadingService', () => {
  // Mock de l'API Obsidian
  const mockLeaf = {
    openFile: vi.fn(),
    view: {
      contentEl: {
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      }
    }
  }

  const mockFile = {
    path: 'RSS/feed1/article1.md',
    basename: 'article1',
    parent: {
      path: 'RSS/feed1'
    },
    extension: 'md',
    stat: {
      mtime: Date.now()
    }
  }

  const mockVault = {
    getFiles: vi.fn().mockReturnValue([mockFile]),
    read: vi.fn(),
    modify: vi.fn()
  }

  const mockWorkspace = {
    getActiveFile: vi.fn(),
    getLeaf: vi.fn().mockReturnValue(mockLeaf)
  }

  const mockApp = {
    vault: mockVault,
    workspace: mockWorkspace
  }

  let service: ReadingService
  let mockDocument: any

  beforeEach(() => {
    // Mock du DOM
    mockDocument = {
      createElement: vi.fn().mockReturnValue({
        id: '',
        textContent: '',
        remove: vi.fn()
      }),
      head: {
        appendChild: vi.fn()
      },
      getElementById: vi.fn().mockReturnValue({
        remove: vi.fn()
      })
    }

    // Remplacer document global
    global.document = mockDocument as any

    service = new ReadingService(mockApp as any)
    vi.clearAllMocks()
  })

  describe('enterReadingMode', () => {
    it('devrait activer le mode lecture', async () => {
      await service.enterReadingMode()

      expect(service.isReadingModeActive()).toBe(true)
      expect(mockDocument.createElement).toHaveBeenCalledWith('style')
      expect(mockDocument.head.appendChild).toHaveBeenCalled()
    })

    it('ne devrait pas réactiver le mode lecture s\'il est déjà actif', async () => {
      await service.enterReadingMode()
      await service.enterReadingMode()

      expect(mockDocument.createElement).toHaveBeenCalledTimes(1)
    })

    it('devrait charger le dernier article lu s\'il existe', async () => {
      // Simuler un dernier article lu
      await service.enterReadingMode()
      const state = service.getState()
      state.lastReadArticleId = 'lastArticle'
      
      mockVault.getFiles.mockReturnValueOnce([{
        ...mockFile,
        basename: 'lastArticle'
      }])

      await service.enterReadingMode()

      expect(mockLeaf.openFile).toHaveBeenCalled()
    })
  })

  describe('exitReadingMode', () => {
    it('devrait désactiver le mode lecture', async () => {
      await service.enterReadingMode()
      service.exitReadingMode()

      expect(service.isReadingModeActive()).toBe(false)
      expect(mockDocument.getElementById).toHaveBeenCalledWith('rss-reading-mode-styles')
    })

    it('ne devrait rien faire si le mode lecture est déjà désactivé', () => {
      service.exitReadingMode()

      expect(mockDocument.getElementById).not.toHaveBeenCalled()
    })
  })

  describe('navigateArticles', () => {
    beforeEach(async () => {
      await service.enterReadingMode()
      const state = service.getState()
      state.currentFeedId = 'feed1'
    })

    it('devrait naviguer vers l\'article suivant', async () => {
      mockWorkspace.getActiveFile.mockReturnValue(mockFile)
      
      const nextFile = {
        ...mockFile,
        basename: 'article2',
        path: 'RSS/feed1/article2.md'
      }

      mockVault.getFiles.mockReturnValueOnce([mockFile, nextFile])

      await service.navigateArticles('next')

      expect(mockLeaf.openFile).toHaveBeenCalledWith(nextFile)
    })

    it('devrait naviguer vers l\'article précédent', async () => {
      const prevFile = {
        ...mockFile,
        basename: 'article0',
        path: 'RSS/feed1/article0.md'
      }

      mockWorkspace.getActiveFile.mockReturnValue(mockFile)
      mockVault.getFiles.mockReturnValueOnce([prevFile, mockFile])

      await service.navigateArticles('previous')

      expect(mockLeaf.openFile).toHaveBeenCalledWith(prevFile)
    })

    it('ne devrait pas naviguer si on est au début ou à la fin', async () => {
      mockWorkspace.getActiveFile.mockReturnValue(mockFile)
      mockVault.getFiles.mockReturnValueOnce([mockFile])

      await service.navigateArticles('next')
      expect(mockLeaf.openFile).not.toHaveBeenCalled()

      await service.navigateArticles('previous')
      expect(mockLeaf.openFile).not.toHaveBeenCalled()
    })
  })

  describe('markCurrentArticleAsRead', () => {
    it('devrait marquer l\'article comme lu', async () => {
      const state = service.getState()
      state.currentArticleId = 'article1'

      mockWorkspace.getActiveFile.mockReturnValue(mockFile)
      mockVault.read.mockResolvedValue('Statut: ◯ Non lu')

      await service.markCurrentArticleAsRead()

      expect(mockVault.modify).toHaveBeenCalledWith(
        mockFile,
        'Statut: ✓ Lu'
      )
    })

    it('ne devrait rien faire sans article actif', async () => {
      await service.markCurrentArticleAsRead()

      expect(mockVault.read).not.toHaveBeenCalled()
      expect(mockVault.modify).not.toHaveBeenCalled()
    })
  })

  describe('navigateToArticle', () => {
    beforeEach(async () => {
      await service.enterReadingMode()
    })

    it('devrait naviguer vers l\'article spécifié', async () => {
      const targetFile = {
        ...mockFile,
        basename: 'targetArticle'
      }

      mockVault.getFiles.mockReturnValueOnce([targetFile])

      await service.navigateToArticle('targetArticle')

      expect(mockLeaf.openFile).toHaveBeenCalledWith(targetFile)
      expect(service.getState().currentArticleId).toBe('targetArticle')
    })

    it('ne devrait rien faire si l\'article n\'existe pas', async () => {
      mockVault.getFiles.mockReturnValueOnce([])

      await service.navigateToArticle('nonexistentArticle')

      expect(mockLeaf.openFile).not.toHaveBeenCalled()
    })
  })
}) 