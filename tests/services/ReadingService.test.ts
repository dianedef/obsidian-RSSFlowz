import { describe, beforeEach, it, expect, vi } from 'vitest'
import { App, TFile, View, WorkspaceLeaf } from 'obsidian'
import { ReadingService } from '../../src/services/ReadingService'
import { StorageService } from '../../src/services/StorageService'
import { LogService } from '../../src/services/LogService'
import type { MockApp, StorageData } from '../types/mocks'

interface TestStorageService {
    loadData: ReturnType<typeof vi.fn>;
    saveData: ReturnType<typeof vi.fn>;
    initializeData: ReturnType<typeof vi.fn>;
}

const defaultSettings = {
    defaultUpdateInterval: 60,
    defaultFolder: 'RSS',
    maxItemsPerFeed: 50,
    template: '# {{title}}\n\n{{description}}\n\n{{link}}'
}

const defaultData: StorageData = {
    feeds: [],
    articles: [],
    settings: defaultSettings,
    readArticles: [],
    lastReadArticle: null
}

describe('ReadingService', () => {
    let service: ReadingService
    let mockApp: MockApp
    let mockStorageService: TestStorageService
    let mockLogService: Partial<LogService>
    let mockLeaf: WorkspaceLeaf
    let mockView: View
    let mockFile: TFile

    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()

        // Mock du DOM
        document.getElementById = vi.fn()
        document.createElement = vi.fn().mockReturnValue({
            classList: {
                add: vi.fn(),
                remove: vi.fn()
            },
            setAttribute: vi.fn(),
            remove: vi.fn()
        })
        document.head.appendChild = vi.fn()

        // Mock de l'app Obsidian
        mockApp = {
            workspace: {
                getLeaf: vi.fn(),
                getActiveFile: vi.fn(),
                on: vi.fn()
            },
            vault: {
                getFiles: vi.fn().mockReturnValue([]),
                getAbstractFileByPath: vi.fn()
            }
        }

        // Mock des fichiers
        mockFile = {
            path: 'test/path',
            basename: 'test',
            extension: 'md',
            name: 'test.md',
            parent: null,
            vault: mockApp.vault,
            stat: {
                ctime: Date.now(),
                mtime: Date.now(),
                size: 0
            }
        } as TFile

        // Mock de la vue
        mockView = {
            getViewType: vi.fn().mockReturnValue('markdown'),
            contentEl: document.createElement('div')
        } as unknown as View

        // Mock de la feuille
        mockLeaf = {
            view: mockView,
            openFile: vi.fn().mockResolvedValue(undefined)
        } as unknown as WorkspaceLeaf

        // Configuration des mocks
        mockApp.workspace.getLeaf = vi.fn().mockReturnValue(mockLeaf)
        mockApp.workspace.getActiveFile.mockReturnValue(mockFile)
        mockApp.vault.getFiles.mockReturnValue([mockFile])
        mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile)

        // Mock des services
        mockStorageService = {
            loadData: vi.fn().mockResolvedValue(defaultData),
            saveData: vi.fn().mockResolvedValue(undefined),
            initializeData: vi.fn().mockResolvedValue(undefined)
        }

        mockLogService = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        }

        service = new ReadingService(
            mockApp as unknown as App,
            mockStorageService as unknown as StorageService,
            mockLogService as LogService
        )
    })

    describe('enterReadingMode', () => {
        it('devrait activer le mode lecture', async () => {
            await service.enterReadingMode()

            expect(document.head.appendChild).toHaveBeenCalled()
            expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile)
        })

        it('ne devrait pas réactiver le mode lecture s\'il est déjà actif', async () => {
            await service.enterReadingMode()
            await service.enterReadingMode()

            expect(document.head.appendChild).toHaveBeenCalledTimes(1)
        })

        it('devrait charger le dernier article lu s\'il existe', async () => {
            mockStorageService.loadData.mockResolvedValueOnce({
                ...defaultData,
                lastReadArticle: 'test/path'
            })
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile)
            mockApp.workspace.getLeaf.mockReturnValue(mockLeaf)
            mockLeaf.openFile.mockResolvedValue(undefined)

            await service.enterReadingMode()
            await vi.runAllTimersAsync()

            expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile)
        })
    })

    describe('exitReadingMode', () => {
        it('devrait désactiver le mode lecture', async () => {
            const mockStyleElement = {
                remove: vi.fn()
            }
            vi.mocked(document.getElementById).mockReturnValue(mockStyleElement as unknown as HTMLElement)

            await service.enterReadingMode()
            await service.exitReadingMode()

            expect(mockStyleElement.remove).toHaveBeenCalled()
        })

        it('ne devrait rien faire si le mode lecture n\'est pas actif', async () => {
            await service.exitReadingMode()

            expect(document.getElementById).not.toHaveBeenCalled()
        })
    })

    describe('navigateArticles', () => {
        beforeEach(() => {
            if (!mockApp.vault?.getFiles || !mockApp.workspace?.getActiveFile) {
                throw new Error('Mock methods not initialized')
            }
            vi.clearAllMocks()
            
            // S'assurer que getLeaf retourne toujours le mockLeaf
            mockApp.workspace.getLeaf = vi.fn().mockReturnValue(mockLeaf)
        })

        it('devrait naviguer vers l\'article suivant', async () => {
            const mockFiles = [
                { path: 'test1.md', extension: 'md' } as TFile,
                { path: 'test2.md', extension: 'md' } as TFile
            ]
            mockApp.vault.getFiles.mockReturnValue(mockFiles)
            mockApp.workspace.getActiveFile.mockReturnValue(mockFiles[0])
            mockApp.vault.getAbstractFileByPath = vi.fn().mockReturnValue(mockFiles[1])

            await service.navigateArticles('next')

            expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFiles[1])
        })

        it('devrait naviguer vers l\'article précédent', async () => {
            const mockFiles = [
                { path: 'test1.md', extension: 'md' } as TFile,
                { path: 'test2.md', extension: 'md' } as TFile
            ]
            mockApp.vault.getFiles.mockReturnValue(mockFiles)
            mockApp.workspace.getActiveFile.mockReturnValue(mockFiles[1])
            mockApp.vault.getAbstractFileByPath = vi.fn().mockReturnValue(mockFiles[0])

            await service.navigateArticles('previous')

            expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFiles[0])
        })

        it('ne devrait pas naviguer si on est au début ou à la fin', async () => {
            const mockFiles = [
                { path: 'test1.md' } as TFile,
                { path: 'test2.md' } as TFile
            ]
            mockApp.vault.getFiles.mockReturnValue(mockFiles)
            mockApp.workspace.getActiveFile.mockReturnValue(mockFiles[0])

            await service.navigateArticles('previous')

            expect(mockLeaf.openFile).not.toHaveBeenCalled()
        })
    })

    describe('markCurrentArticleAsRead', () => {
        it('devrait marquer l\'article comme lu', async () => {
            mockApp.workspace.getActiveFile.mockReturnValue(mockFile)

            await service.markCurrentArticleAsRead()

            expect(mockStorageService.saveData).toHaveBeenCalledWith(
                expect.objectContaining({
                    readArticles: ['test/path'],
                    lastReadArticle: 'test/path'
                })
            )
        })

        it('ne devrait rien faire sans article actif', async () => {
            mockApp.workspace.getActiveFile.mockReturnValue(null)

            await service.markCurrentArticleAsRead()

            expect(mockStorageService.saveData).not.toHaveBeenCalled()
        })
    })

    describe('navigateToArticle', () => {
        it('devrait naviguer vers l\'article spécifié', async () => {
            const targetFile = { path: 'test/path', extension: 'md' } as TFile
            mockApp.vault.getAbstractFileByPath.mockReturnValue(targetFile)
            mockApp.workspace.getLeaf.mockReturnValue(mockLeaf)
            mockLeaf.openFile.mockResolvedValue(undefined)

            await service.navigateToArticle('test/path')
            await vi.runAllTimersAsync()

            expect(mockLeaf.openFile).toHaveBeenCalledWith(targetFile)
        })

        it('ne devrait rien faire si l\'article n\'existe pas', async () => {
            mockApp.vault.getFiles.mockReturnValue([])

            await service.navigateToArticle('nonexistent.md')

            expect(mockLeaf.openFile).not.toHaveBeenCalled()
        })
    })
}) 