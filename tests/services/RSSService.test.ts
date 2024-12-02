import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RSSService } from '../../src/services/RSSService'

describe('RSSService', () => {
  let service: RSSService

  // Mock de la fonction requestUrl d'Obsidian
  const mockRequestUrl = vi.fn()
  vi.mock('obsidian', () => ({
    requestUrl: mockRequestUrl
  }))

  beforeEach(() => {
    service = new RSSService()
    vi.clearAllMocks()
  })

  describe('fetchFeed', () => {
    it('devrait récupérer et parser un flux RSS', async () => {
      // Préparer les données de test
      const rssXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Mon Feed RSS</title>
            <description>Description du feed</description>
            <link>https://example.com</link>
            <item>
              <title>Article 1</title>
              <description>Description de l'article 1</description>
              <link>https://example.com/article1</link>
              <pubDate>Thu, 01 Jan 2024 12:00:00 GMT</pubDate>
              <guid>https://example.com/article1</guid>
            </item>
          </channel>
        </rss>
      `

      // Mocker la réponse HTTP
      mockRequestUrl.mockResolvedValueOnce({
        text: rssXml,
        status: 200
      })

      // Exécuter le test
      const feed = await service.fetchFeed('https://example.com/feed.xml')

      // Vérifier les résultats
      expect(feed).toBeDefined()
      expect(feed.title).toBe('Mon Feed RSS')
      expect(feed.description).toBe('Description du feed')
      expect(feed.link).toBe('https://example.com')
      expect(feed.items).toHaveLength(1)
      expect(feed.items[0]).toEqual({
        title: 'Article 1',
        description: 'Description de l\'article 1',
        link: 'https://example.com/article1',
        pubDate: 'Thu, 01 Jan 2024 12:00:00 GMT',
        guid: 'https://example.com/article1'
      })
    })

    it('devrait récupérer et parser un flux Atom', async () => {
      // Préparer les données de test
      const atomXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Mon Feed Atom</title>
          <subtitle>Description du feed</subtitle>
          <link href="https://example.com"/>
          <entry>
            <title>Article 1</title>
            <content>Contenu de l'article 1</content>
            <link href="https://example.com/article1"/>
            <updated>2024-01-01T12:00:00Z</updated>
            <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
          </entry>
        </feed>
      `

      // Mocker la réponse HTTP
      mockRequestUrl.mockResolvedValueOnce({
        text: atomXml,
        status: 200
      })

      // Exécuter le test
      const feed = await service.fetchFeed('https://example.com/feed.atom')

      // Vérifier les résultats
      expect(feed).toBeDefined()
      expect(feed.title).toBe('Mon Feed Atom')
      expect(feed.description).toBe('Description du feed')
      expect(feed.link).toBe('https://example.com')
      expect(feed.items).toHaveLength(1)
      expect(feed.items[0]).toEqual({
        title: 'Article 1',
        description: 'Contenu de l\'article 1',
        link: 'https://example.com/article1',
        pubDate: '2024-01-01T12:00:00Z',
        guid: 'urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a'
      })
    })

    it('devrait gérer les erreurs de parsing XML', async () => {
      // XML invalide
      const invalidXml = '<?xml version="1.0"?><invalid>'

      mockRequestUrl.mockResolvedValueOnce({
        text: invalidXml,
        status: 200
      })

      // Vérifier que l'erreur est bien levée
      await expect(service.fetchFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Erreur de parsing XML')
    })

    it('devrait gérer les erreurs HTTP', async () => {
      mockRequestUrl.mockRejectedValueOnce(new Error('Erreur réseau'))

      await expect(service.fetchFeed('https://example.com/feed.xml'))
        .rejects
        .toThrow('Erreur réseau')
    })

    it('devrait gérer les flux sans articles', async () => {
      const emptyRssXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Feed Vide</title>
            <description>Feed sans articles</description>
            <link>https://example.com</link>
          </channel>
        </rss>
      `

      mockRequestUrl.mockResolvedValueOnce({
        text: emptyRssXml,
        status: 200
      })

      const feed = await service.fetchFeed('https://example.com/feed.xml')

      expect(feed).toBeDefined()
      expect(feed.title).toBe('Feed Vide')
      expect(feed.items).toHaveLength(0)
    })

    it('devrait gérer les valeurs manquantes dans les articles', async () => {
      const incompleteRssXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Feed Incomplet</title>
            <link>https://example.com</link>
            <item>
              <title>Article Sans Description</title>
              <link>https://example.com/article1</link>
            </item>
          </channel>
        </rss>
      `

      mockRequestUrl.mockResolvedValueOnce({
        text: incompleteRssXml,
        status: 200
      })

      const feed = await service.fetchFeed('https://example.com/feed.xml')

      expect(feed.items[0]).toEqual({
        title: 'Article Sans Description',
        description: '',
        link: 'https://example.com/article1',
        pubDate: expect.any(String),
        guid: 'https://example.com/article1'
      })
    })
  })
}) 