export type FetchFrequency = 'startup' | 'daily' | 'hourly';

export interface PluginSettings {
  feeds: any[];
  groups: string[];
  openaiKey: string;
  rssFolder: string;
  fetchFrequency: FetchFrequency;
  fetchInterval: number;
  maxArticles: number;
  retentionDays: number;
  lastFetch: number;
  readingMode: boolean;
  lastReadArticle: string | null;
  currentFeed: string | null;
  currentFolder: string | null;
  articleStates: Record<string, any>;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  feeds: [],
  groups: ['Défaut'],
  openaiKey: '',
  rssFolder: 'RSS',
  fetchFrequency: 'hourly',
  fetchInterval: 3600,
  maxArticles: 50,
  retentionDays: 30,
  lastFetch: Date.now(),
  readingMode: false,
  lastReadArticle: null,
  currentFeed: null,
  currentFolder: null,
  articleStates: {},
}; 