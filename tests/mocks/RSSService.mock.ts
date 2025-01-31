import { vi } from 'vitest'
import type { RSSFeed } from '../../src/types/rss'

export const mockRSSFeed: RSSFeed = {
    title: 'Test Feed',
    description: 'A test feed',
    link: 'https://example.com',
    items: [
        {
            title: 'Test Article 1',
            description: 'Test description 1',
            link: 'https://example.com/1',
            pubDate: new Date().toISOString(),
            content: 'Test content 1'
        }
    ]
}

export const createMockRSSService = () => ({
    fetchFeed: vi.fn().mockResolvedValue(mockRSSFeed)
}); 