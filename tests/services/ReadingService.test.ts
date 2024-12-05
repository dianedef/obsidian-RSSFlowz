import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { ReadingService } from '../../src/services/ReadingService'
import { createMockFile, createMockVault } from '../mocks/FileMocks'
import { createMockLogService } from '../mocks/ReadingMocks'

describe('ReadingService', () => {
  // Configuration des mocks
  const mockVault = createMockVault()
  const mockWorkspace = {
    getLeaf: vi.fn().mockReturnValue({
      openFile: vi.fn()
    })
  }
  const mockPlugin = {
    app: {
      vault: mockVault,
      workspace: mockWorkspace
    }
  }
  const mockLogService = createMockLogService()
  
  let service: ReadingService

  // Création des fichiers de test pour différents feeds
  const mockFiles = {
    tech: [
      createMockFile('RSS/tech/typescript-tips.md', Date.now() - 1000),
      createMockFile('RSS/tech/react-hooks.md', Date.now() - 2000),
      createMockFile('RSS/tech/nodejs-best-practices.md', Date.now() - 3000)
    ],
    news: [
      createMockFile('RSS/news/breaking-news.md', Date.now() - 1500),
      createMockFile('RSS/news/tech-news.md', Date.now() - 2500)
    ],
    blog: [
      createMockFile('RSS/blog/javascript-future.md', Date.now() - 500),
      createMockFile('RSS/blog/web-components.md', Date.now() - 1500),
      createMockFile('RSS/blog/css-grid-tips.md', Date.now() - 2500)
    ]
  }

  beforeAll(() => {
    service = new ReadingService(mockPlugin as any, mockLogService)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation entre feeds', () => {
    it('devrait naviguer dans le feed tech', async () => {
      // Configuration des fichiers pour ce test
      vi.mocked(mockVault.getFiles).mockReturnValue(mockFiles.tech)

      await service.enterReadingMode()
      await service.navigateToArticle(mockFiles.tech[0])

      for (let i = 1; i < mockFiles.tech.length; i++) {
        await service.navigateArticles('next')
        const current = service.getState().currentFile
        expect(current).toBe(mockFiles.tech[i])
      }
    })

    it('devrait naviguer dans le feed news', async () => {
      // Configuration des fichiers pour ce test
      vi.mocked(mockVault.getFiles).mockReturnValue(mockFiles.news)

      await service.enterReadingMode()
      await service.navigateToArticle(mockFiles.news[0])

      for (let i = 1; i < mockFiles.news.length; i++) {
        await service.navigateArticles('next')
        const current = service.getState().currentFile
        expect(current).toBe(mockFiles.news[i])
      }
    })

    it('devrait naviguer dans le feed blog', async () => {
      // Configuration des fichiers pour ce test
      vi.mocked(mockVault.getFiles).mockReturnValue(mockFiles.blog)

      await service.enterReadingMode()
      await service.navigateToArticle(mockFiles.blog[0])

      for (let i = 1; i < mockFiles.blog.length; i++) {
        await service.navigateArticles('next')
        const current = service.getState().currentFile
        expect(current).toBe(mockFiles.blog[i])
      }
    })
  })

  describe('Marquage comme lu', () => {
    it('devrait marquer un article comme lu', async () => {
      const file = mockFiles.tech[0]
      const content = '# Test Article'

      vi.mocked(mockVault.read).mockResolvedValue(content)
      
      await service.enterReadingMode()
      await service.navigateToArticle(file)
      await service.markCurrentArticleAsRead()

      expect(mockVault.modify).toHaveBeenCalledWith(
        file,
        content + '\n#read'
      )
    })

    it('ne devrait pas ajouter #read en double', async () => {
      const file = mockFiles.tech[0]
      const content = '# Test Article\n#read'

      vi.mocked(mockVault.read).mockResolvedValue(content)
      
      await service.enterReadingMode()
      await service.navigateToArticle(file)
      await service.markCurrentArticleAsRead()

      expect(mockVault.modify).not.toHaveBeenCalled()
    })
  })

  describe('Navigation circulaire', () => {
    it('devrait faire une boucle complète dans chaque feed', async () => {
      for (const [feedName, feedFiles] of Object.entries(mockFiles)) {
        // Configuration des fichiers pour ce test
        vi.mocked(mockVault.getFiles).mockReturnValue(feedFiles)

        await service.enterReadingMode()
        await service.navigateToArticle(feedFiles[0])

        // Aller jusqu'à la fin
        for (let i = 1; i < feedFiles.length; i++) {
          await service.navigateArticles('next')
          const current = service.getState().currentFile
          expect(current).toBe(feedFiles[i])
        }

        // Retour au début
        await service.navigateArticles('next')
        const current = service.getState().currentFile
        expect(current).toBe(feedFiles[0])
      }
    })
  })
}) 