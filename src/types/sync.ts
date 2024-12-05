import { RSSFeed, RSSItem } from './rss'

export interface SyncOptions {
  force?: boolean;
  feedUrl?: string;
}

export interface SyncResult {
  feed: RSSFeed;
  newItems: RSSItem[];
  errors?: SyncError[];
}

export interface SyncError {
  type: 'fetch' | 'parse' | 'save';
  feedUrl: string;
  message: string;
  error: Error;
}

export interface SyncServiceInterface {
  syncAllFeeds(options?: SyncOptions): Promise<SyncResult[]>;
  syncFeed(feedUrl: string, options?: SyncOptions): Promise<SyncResult>;
  issyncing(): boolean;
  getLastSyncDate(feedUrl?: string): Date | null;
} 