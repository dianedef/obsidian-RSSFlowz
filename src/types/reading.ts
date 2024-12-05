import { TFile } from 'obsidian'

export interface ReadingState {
  isReading: boolean;
  currentFile: TFile | null;
  lastFile: TFile | null;
}

export interface ReadingServiceInterface {
  enterReadingMode(): Promise<void>;
  exitReadingMode(): Promise<void>;
  navigateToArticle(file: TFile): Promise<void>;
  navigateArticles(direction: 'next' | 'previous'): Promise<void>;
  markCurrentArticleAsRead(): Promise<void>;
  getState(): ReadingState;
} 