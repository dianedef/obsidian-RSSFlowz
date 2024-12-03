import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RSSService } from '../../src/services/RSSService'
import { LogService } from '../../src/services/LogService'
import { requestUrl } from 'obsidian'

const validRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>Test Description</description>
    <item>
      <title>Test Item</title>
      <link>https://example.com/item</link>
      <description>Test Item Description</description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
      <guid>https://example.com/item</guid>
    </item>
  </channel>
</rss>`

describe('RSSService', () => {
  let service: RSSService
  let mockLogService: LogService
  let mockApp: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockApp = {
      vault: {
        adapter: {
          exists: vi.fn(),
          mkdir: vi.fn()
        }
      }
    }

    mockLogService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as LogService

    service = new RSSService(mockApp, mockLogService)
    vi.mocked(requestUrl).mockReset()
  })

  describe('fetchFeed', () => {
    it('devrait récupérer et parser un flux RSS valide', async () => {
      vi.mocked(requestUrl).mockResolvedValue({
        text: validRSS,
        status: 200
      } as any)

      const feed = await service.fetchFeed('https://example.com/feed.xml')

      expect(feed).toEqual({
        title: 'Test Feed',
        link: 'https://example.com',
        description: 'Test Description',
        items: [{
          title: 'Test Item',
          link: 'https://example.com/item',
          description: 'Test Item Description',
          pubDate: 'Mon, 01 Jan 2024 12:00:00 GMT',
          guid: 'https://example.com/item'
        }]
      })
    })

    it('devrait gérer les erreurs de requête', async () => {
      vi.mocked(requestUrl).mockRejectedValue(new Error('Network error'))

      await expect(service.fetchFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Network error')
    })

    it('devrait gérer les flux invalides', async () => {
      vi.mocked(requestUrl).mockResolvedValue({
        text: 'Invalid XML',
        status: 200
      } as any)

      await expect(service.fetchFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow()
    })

    it('devrait gérer les flux sans articles', async () => {
      const emptyRssXml = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <description>Test Description</description>
            <link>https://example.com</link>
          </channel>
        </rss>`

      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        text: emptyRssXml
      } as any)

      const feed = await service.fetchFeed('https://example.com/feed.xml')

      expect(feed).toEqual({
        title: 'Test Feed',
        description: 'Test Description',
        link: 'https://example.com',
        items: []
      })
    })

    it('devrait gérer les valeurs manquantes dans les articles', async () => {
      const incompleteRssXml = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <description>Test Description</description>
            <link>https://example.com</link>
            <item>
              <title>Test Article</title>
            </item>
          </channel>
        </rss>`

      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        text: incompleteRssXml
      } as any)

      const feed = await service.fetchFeed('https://example.com/feed.xml')

      expect(feed).toEqual({
        title: 'Test Feed',
        description: 'Test Description',
        link: 'https://example.com',
        items: [{
          title: 'Test Article',
          description: '',
          link: '',
          pubDate: expect.any(String),
          guid: undefined
        }]
      })
    })
  })
}) 