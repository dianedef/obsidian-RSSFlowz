import { App, TFile, Vault, WorkspaceLeaf } from 'obsidian';
import { Mock } from 'vitest';

export interface StorageData {
    feeds: any[];
    articles: any[];
    settings: {
        defaultUpdateInterval: number;
        defaultFolder: string;
        maxItemsPerFeed: number;
        template: string;
    };
    readArticles: string[];
    lastReadArticle: string | null;
}

export interface MockApp {
    workspace: {
        getLeaf: ReturnType<typeof vi.fn>;
        getActiveFile: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
    };
    vault: {
        getFiles: ReturnType<typeof vi.fn>;
        getAbstractFileByPath: ReturnType<typeof vi.fn>;
    };
}

export interface MockStorageService {
    loadData: Mock<any, Promise<StorageData>>;
    saveData: Mock<any, Promise<void>>;
    initializeData: Mock<any, Promise<void>>;
} 