import { vi } from 'vitest'
import type { StorageData } from '../../src/types/storage'

export const defaultStorageData: StorageData = {
    feeds: [],
    settings: {
        rssFolder: "RSS",
        maxArticles: 50,
        retentionDays: 30,
        template: "# {{title}}\n\n{{description}}\n\n{{link}}",
        fetchFrequency: "startup",
        groups: ["Défaut"],
        currentFolder: null,
        currentFeed: null,
        lastReadArticle: null,
        readingMode: false,
        lastFetch: Date.now() + 24 * 60 * 60 * 1000, // tomorrow
        articleStates: {},
        feeds: [],
        openaiKey: ""
    }
}

export const createMockStorageService = (initialData: Partial<StorageData> = {}) => ({
    loadData: vi.fn().mockResolvedValue({ ...defaultStorageData, ...initialData }),
    saveData: vi.fn().mockResolvedValue(undefined)
}); 