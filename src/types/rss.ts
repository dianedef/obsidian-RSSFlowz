export interface RSSFeed {
  title: string;
  description?: string;
  link: string;
  items: RSSItem[];
  feedUrl: string;
  lastUpdate?: Date;
}

export interface RSSItem {
  title: string;
  description?: string;
  content?: string;
  link: string;
  guid?: string;
  pubDate?: Date;
  author?: string;
  categories?: string[];
}

export interface RSSServiceInterface {
  fetchFeed(url: string): Promise<RSSFeed>;
  parseRssFeed(xml: string): RSSFeed;
  parseAtomFeed(xml: string): RSSFeed;
}

export interface FeedParsingError extends Error {
  feedUrl: string;
  originalError: Error;
} 