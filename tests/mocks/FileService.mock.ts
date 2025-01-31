import { vi } from 'vitest'
import type { TFile } from 'obsidian'

export const createMockFileService = () => ({
    ensureFolder: vi.fn().mockResolvedValue(undefined),
    saveArticle: vi.fn().mockResolvedValue(undefined),
    cleanOldArticles: vi.fn().mockResolvedValue(undefined),
    getArticleFiles: vi.fn().mockResolvedValue([]),
    getArticleContent: vi.fn().mockResolvedValue(''),
    updateArticle: vi.fn().mockResolvedValue(undefined),
    deleteArticle: vi.fn().mockResolvedValue(undefined),
    getFolderFiles: vi.fn().mockResolvedValue([]),
    getFilePath: vi.fn().mockReturnValue('test.md'),
    sanitizePath: vi.fn().mockReturnValue('test'),
    getArticleId: vi.fn().mockReturnValue('test::test')
}); 