export interface Article {
    id?: string;
    title: string;
    link: string;
    pubDate: Date;
    content?: string;
    description?: string;
    excerpt?: string;
    author?: string;
    siteName?: string;
    language?: string;
    readingTime?: number;
    feed: string;
    group?: string;
    isRead: boolean;
    isFavorite: boolean;
    tags?: string[];
    feedUrl?: string;
    feedTitle?: string;
    path?: string;
} 