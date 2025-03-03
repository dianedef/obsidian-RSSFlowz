import { FetchFrequency, DigestMode } from './settings';
import { Feed } from './rss';

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
  feeds: Feed[];
  digest: DigestSettings;
  readingMode: boolean;
  lastFetch: number;
  lastReadArticle: string | null;
  currentFeed: string | null;
  currentFolder: string | null;
  articleStates: Record<string, any>;
}

// Interface pour les données stockées
export interface StorageData {
  feeds: Feed[];
  settings: PluginSettings;
}

// Export des types de base
export * from './article';
export * from './rss';
export * from './settings';

// Export des types d'erreurs
export * from './errors';

// Export des types de services
export * from './reading';
export * from './logs';
export * from './scheduler';
export * from './storage';
export * from './sync';
export * from './i18n';
export * from './file';

// Interface pour les données du plugin
export interface PluginData extends StorageData {
    version?: string;
}