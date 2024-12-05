import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { FileService } from '../../src/services/FileService'
import { RSSItem } from '../../src/types'
import { createMockFile, createMockVault } from '../mocks/FileMocks'

// Configuration unique des mocks pour tous les tests
const mockVault = createMockVault()
const mockPlugin = {
  app: { vault: mockVault }
}
const service = new FileService(mockPlugin as any)

// Création minimale des fichiers de test
const TEST_FILES = {
  recent: createMockFile('RSS/recent.md', Date.now() - 1000),
  old: createMockFile('RSS/old.md', Date.now() - 15 * 86400000)
}

describe('FileService', () => {
  beforeAll(() => {
    // Configuration globale des mocks
    vi.mocked(mockVault.getFiles).mockReturnValue(Object.values(TEST_FILES))
  })

  beforeEach(() => {
    // Réinitialisation des mocks avant chaque test
    vi.clearAllMocks()
  })

  describe('Gestion des dossiers', () => {
    it('devrait gérer la création de dossier', async () => {
      vi.mocked(mockVault.adapter.exists).mockResolvedValueOnce(false)
      await service.ensureFolder('test')
      expect(mockVault.createFolder).toHaveBeenCalledWith('test')
    })

    it('devrait gérer la suppression de dossier', async () => {
      vi.mocked(mockVault.adapter.exists).mockResolvedValueOnce(true)
      vi.mocked(mockVault.adapter.list).mockResolvedValueOnce({
        files: ['test.md'],
        folders: []
      })
      await service.removeFolder('test')
      expect(mockVault.adapter.rmdir).toHaveBeenCalledWith('test')
    })
  })

  describe('Gestion des articles', () => {
    it('devrait nettoyer les vieux articles', async () => {
      // Configuration spécifique pour ce test
      const files = [
        createMockFile('RSS/recent.md', Date.now() - 5 * 86400000),
        createMockFile('RSS/old.md', Date.now() - 15 * 86400000)
      ]
      vi.mocked(mockVault.getFiles).mockReturnValueOnce(files)

      await service.cleanOldArticles('RSS', 10)
      
      expect(mockVault.delete).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'RSS/old.md' })
      )
    })

    it('devrait sauvegarder un nouvel article', async () => {
      const article: RSSItem = {
        title: 'Test',
        description: 'Test',
        link: 'test.com',
        pubDate: new Date().toISOString()
      }

      vi.mocked(mockVault.getAbstractFileByPath).mockReturnValueOnce(null)
      await service.saveArticle(article, 'test.md', '{{title}}')
      expect(mockVault.create).toHaveBeenCalledWith(
        'test.md',
        expect.stringContaining('Test')
      )
    })
  })

  describe('Utilitaires', () => {
    const testCases = [
      ['file/with\\chars', 'file-with-chars'],
      ['file with spaces', 'file-with-spaces'],
      ['-file-name-', 'file-name'],
      ['FILE NAME', 'file-name'],
      ['Mixed_Case_File', 'mixed-case-file'],
      ['  spaces  ', 'spaces'],
      ['multiple---dashes', 'multiple-dashes']
    ]

    it.each(testCases)('devrait nettoyer le nom %s', (input, expected) => {
      const result = service.sanitizeFileName(input)
      expect(result.toLowerCase()).toBe(expected)
    })
  })
}) 