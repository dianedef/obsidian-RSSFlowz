import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileService } from '../../src/services/FileService'
import { RSSItem } from '../../src/types'
import { App, TFile } from 'obsidian'

describe('FileService', () => {
  // Mock de l'API Obsidian
  const mockVault = {
    adapter: {
      exists: vi.fn(),
      list: vi.fn(),
      remove: vi.fn(),
      rmdir: vi.fn(),
      mkdir: vi.fn()
    },
    getFiles: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    modify: vi.fn(),
    getAbstractFileByPath: vi.fn()
  }

  const mockApp = {
    vault: mockVault
  } as unknown as App

  let service: FileService

  beforeEach(() => {
    service = new FileService(mockApp)
    vi.clearAllMocks()
  })

  describe('ensureFolder', () => {
    it('devrait créer un dossier s\'il n\'existe pas', async () => {
      mockVault.adapter.exists.mockResolvedValue(false)

      await service.ensureFolder('test-folder')

      expect(mockVault.adapter.exists).toHaveBeenCalledWith('test-folder')
      expect(mockVault.adapter.mkdir).toHaveBeenCalledWith('test-folder')
    })

    it('ne devrait pas créer un dossier s\'il existe déjà', async () => {
      mockVault.adapter.exists.mockResolvedValue(true)

      await service.ensureFolder('test-folder')

      expect(mockVault.adapter.exists).toHaveBeenCalledWith('test-folder')
      expect(mockVault.adapter.mkdir).not.toHaveBeenCalled()
    })

    it('devrait propager les erreurs', async () => {
      mockVault.adapter.exists.mockRejectedValue(new Error('Test error'))

      await expect(service.ensureFolder('test-folder'))
        .rejects
        .toThrow('Test error')
    })
  })

  describe('removeFolder', () => {
    it('devrait supprimer un dossier et son contenu', async () => {
      mockVault.adapter.exists.mockResolvedValue(true)
      mockVault.adapter.list.mockResolvedValue({
        files: ['file1.md', 'file2.md'],
        folders: ['subfolder1', 'subfolder2']
      })

      await service.removeFolder('test-folder')

      expect(mockVault.adapter.exists).toHaveBeenCalledWith('test-folder')
      expect(mockVault.adapter.remove).toHaveBeenCalledTimes(2)
      expect(mockVault.adapter.rmdir).toHaveBeenCalledWith('test-folder')
    })

    it('ne devrait rien faire si le dossier n\'existe pas', async () => {
      mockVault.adapter.exists.mockResolvedValue(false)

      await service.removeFolder('test-folder')

      expect(mockVault.adapter.list).not.toHaveBeenCalled()
      expect(mockVault.adapter.remove).not.toHaveBeenCalled()
      expect(mockVault.adapter.rmdir).not.toHaveBeenCalled()
    })
  })

  describe('cleanOldArticles', () => {
    const mockFiles = [
      {
        path: 'RSS/test1.md',
        stat: { mtime: Date.now() - 5 * 86400000 } // 5 jours
      } as TFile,
      {
        path: 'RSS/test2.md',
        stat: { mtime: Date.now() - 15 * 86400000 } // 15 jours
      } as TFile
    ]

    it('devrait supprimer les articles plus anciens que la période de rétention', async () => {
      mockVault.getFiles.mockReturnValue(mockFiles)

      await service.cleanOldArticles('RSS', 10) // 10 jours de rétention

      expect(mockVault.delete).toHaveBeenCalledTimes(1)
      expect(mockVault.delete).toHaveBeenCalledWith(mockFiles[1])
    })

    it('devrait ignorer les fichiers hors du dossier RSS', async () => {
      const mixedFiles = [
        ...mockFiles,
        {
          path: 'other/test.md',
          stat: { mtime: Date.now() - 15 * 86400000 }
        } as TFile
      ]

      mockVault.getFiles.mockReturnValue(mixedFiles)

      await service.cleanOldArticles('RSS', 10)

      expect(mockVault.delete).toHaveBeenCalledTimes(1)
    })
  })

  describe('saveArticle', () => {
    const mockArticle: RSSItem = {
      title: 'Test Article',
      description: 'Test Description',
      link: 'https://example.com',
      pubDate: '2024-01-01'
    }

    const mockTemplate = '# {{title}}\n\n{{description}}\n\n{{link}}\n\n{{pubDate}}'

    it('devrait créer un nouveau fichier si inexistant', async () => {
      mockVault.getAbstractFileByPath.mockReturnValue(null)

      await service.saveArticle(mockArticle, 'test.md', mockTemplate)

      expect(mockVault.create).toHaveBeenCalledWith(
        'test.md',
        expect.stringContaining('Test Article')
      )
    })

    it('devrait mettre à jour un fichier existant', async () => {
      const mockFile = { path: 'test.md' } as TFile
      mockVault.getAbstractFileByPath.mockReturnValue(mockFile)

      await service.saveArticle(mockArticle, 'test.md', mockTemplate)

      expect(mockVault.modify).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('Test Article')
      )
    })

    it('devrait remplacer toutes les variables du template', async () => {
      mockVault.getAbstractFileByPath.mockReturnValue(null)

      await service.saveArticle(mockArticle, 'test.md', mockTemplate)

      const expectedContent = mockTemplate
        .replace(/{{title}}/g, mockArticle.title)
        .replace(/{{description}}/g, mockArticle.description)
        .replace(/{{link}}/g, mockArticle.link)
        .replace(/{{pubDate}}/g, mockArticle.pubDate)

      expect(mockVault.create).toHaveBeenCalledWith('test.md', expectedContent)
    })
  })

  describe('sanitizeFileName', () => {
    it('devrait remplacer les caractères invalides', () => {
      const tests = [
        { input: 'file/with\\invalid:chars', expected: 'file-with-invalid-chars' },
        { input: 'file with spaces', expected: 'file-with-spaces' },
        { input: 'file___with___underscores', expected: 'file-with-underscores' },
        { input: '  file with spaces  ', expected: 'file-with-spaces' },
        { input: 'file?with*special<chars>', expected: 'file-with-special-chars' }
      ]

      tests.forEach(({ input, expected }) => {
        expect(service.sanitizeFileName(input)).toBe(expected)
      })
    })

    it('devrait éviter les tirets multiples', () => {
      expect(service.sanitizeFileName('file---with---dashes'))
        .toBe('file-with-dashes')
    })

    it('devrait supprimer les tirets en début et fin', () => {
      expect(service.sanitizeFileName('-file-name-'))
        .toBe('file-name')
    })
  })
}) 