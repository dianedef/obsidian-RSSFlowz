import { vi } from 'vitest'
import type { StorageData } from '../../src/types/storage'

export const defaultStorageData: StorageData = {
    feeds: [],
    settings: {
        groups: [],
        openaiKey: '',
        rssFolder: 'RSS',
        fetchFrequency: 'startup',
        maxArticles: 50,
        retentionDays: 30,
        readingMode: false,
        lastFetch: Date.now(),
        lastReadArticle: null,
        currentFeed: null,
        currentFolder: null,
        articleStates: {},
        template: ''
    }
}

export const createMockStorageService = (initialData: Partial<StorageData> = {}) => ({
    loadData: vi.fn().mockResolvedValue({ ...defaultStorageData, ...initialData }),
    saveData: vi.fn().mockResolvedValue(undefined)
}); 