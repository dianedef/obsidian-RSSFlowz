export interface RSSItem {
  title: string;
  description: string;
  content: string;
  link: string;
  pubDate: Date;
  guid: string;
  categories: string[];
  author: string;
  feedTitle: string;
}

export interface Feed {
  id: string;
  settings: {
    title: string;
    description: string;
    url: string;
    link?: string;
    type: 'multiple' | 'single';
    status: 'active' | 'paused';
    group?: string;
    folder: string;
    summarize: boolean;
    transcribe: boolean;
    rewrite: boolean;
    maxArticles?: number;
    tags?: string[];
    filterDuplicates?: boolean;
    template?: string;
  };
  items?: RSSItem[];
  lastUpdate?: string;
  lastSuccessfulFetch?: number;
  lastError?: {
    message: string;
    timestamp: number;
  };
}

export interface RSSServiceInterface {
  fetchFeed(url: string): Promise<Feed>;
  parseRssFeed(xml: string): Feed;
  parseAtomFeed(xml: string): Feed;
}

export interface FeedParsingError extends Error {
  feedUrl: string;
  originalError: Error;
} 