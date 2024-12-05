import { TFile, TFolder } from "obsidian";
import { RSSItem } from "./rss";

export interface FileOperationOptions {
	overwrite?: boolean;
	createFolder?: boolean;
}

export interface ArticleFileData {
	item: RSSItem;
	folder: string;
	filename: string;
	template: string;
}

export interface FileCleanupOptions {
	olderThan?: Date;
	folder?: string;
	dryRun?: boolean;
}

export interface FileServiceInterface {
	ensureFolder(path: string): Promise<TFolder>;
	removeFolder(path: string): Promise<void>;
	fileExists(path: string): Promise<boolean>;
	saveArticle(data: ArticleFileData): Promise<TFile>;
	cleanOldArticles(options: FileCleanupOptions): Promise<string[]>;
	sanitizeFileName(filename: string): string;
}

export interface FileError extends Error {
	path: string;
	operation: "create" | "delete" | "read" | "write" | "clean";
	originalError?: Error;
}
