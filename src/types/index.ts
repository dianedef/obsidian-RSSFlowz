import { FetchFrequency, DigestMode } from './settings';

// Interface pour un feed RSS
export interface FeedData {
  id: string;
  title: string;
  url: string;
  type: 'multiple' | 'single';
  status: 'active' | 'paused';
  summarize: boolean;
  transcribe: boolean;
  rewrite: boolean;
  group: string;
  folder: string;
  lastError?: {
    message: string;
    timestamp: number;
  };
  lastSuccessfulFetch?: number;
}

// Interface pour les paramètres du digest
export interface DigestSettings {
  enabled: boolean;
  mode: DigestMode;
  template: string;
  folderPath: string;
}

// Interface pour les paramètres du plugin
export interface PluginSettings {
  template: string;
  openaiKey: string;
  rssFolder: string;
  fetchFrequency: FetchFrequency;
  maxArticles: number;
  retentionDays: number;
  groups: string[];
  digest: DigestSettings;
}

// Interface pour les données stockées
export interface StorageData {
  feeds: FeedData[];
  settings: PluginSettings;
}

// Export des autres types
export * from './reading';
export * from './logs';
export * from './scheduler';
export * from './storage';
export * from './sync';
export * from './rss';