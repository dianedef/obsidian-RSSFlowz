import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from 'obsidian'
import { OpmlService } from '../../src/services/OpmlService'
import { StorageService } from '../../src/services/StorageService'
import { LogService } from '../../src/services/LogService'
import { requestUrl } from 'obsidian'
import { MockApp, MockStorageService } from '../types/mocks'

vi.mock('obsidian', () => ({
    requestUrl: vi.fn()
}))

const validOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSS Feeds</title>
  </head>
  <body>
    <outline text="Tech" title="Tech">
      <outline type="rss" text="Example" title="Example" xmlUrl="https://example.com/feed.xml"/>
    </outline>
  </body>
</opml>`

const defaultSettings = {
  defaultUpdateInterval: 60,
  defaultFolder: 'RSS',
  maxItemsPerFeed: 50,
  template: '# {{title}}\n\n{{description}}\n\n{{link}}'
}

describe('OpmlService', () => {
  let service: OpmlService
  let mockApp: MockApp
  let mockStorageService: MockStorageService
  let mockLogService: Partial<LogService>

  beforeEach(() => {
    vi.clearAllMocks()

    mockApp = {
      vault: {
        getFiles: vi.fn().mockReturnValue([]),
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
      }
    }

    const defaultData = {
      feeds: [],
      articles: [],
      settings: defaultSettings,
      readArticles: [],
      lastReadArticle: null
    }

    mockStorageService = {
      loadData: vi.fn().mockResolvedValue(defaultData),
      saveData: vi.fn().mockResolvedValue(undefined),
      initializeData: vi.fn().mockResolvedValue(undefined)
    }

    mockLogService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    service = new OpmlService(
      mockApp as unknown as App,
      mockStorageService as unknown as StorageService,
      mockLogService as LogService
    )
  })

  describe('importFromUrl', () => {
    it('devrait importer un fichier OPML valide', async () => {
      vi.mocked(requestUrl).mockResolvedValue({
        text: validOpml,
        status: 200
      } as any)

      const currentData = {
        feeds: [],
        articles: [],
        settings: defaultSettings,
        readArticles: [],
        lastReadArticle: null
      }

      mockStorageService.loadData.mockResolvedValue(currentData)

      await service.importFromUrl('https://example.com/feeds.opml')

      expect(mockStorageService.saveData).toHaveBeenCalledWith({
        ...currentData,
        feeds: [{
          id: expect.any(String),
          settings: {
            url: 'https://example.com/feed.xml',
            folder: 'Tech',
            updateInterval: defaultSettings.defaultUpdateInterval,
            filterDuplicates: true
          }
        }]
      })
    })
  })

  describe('exportOpml', () => {
    it('devrait exporter les flux au format OPML', async () => {
      const testData = {
        feeds: [{
          id: '1',
          settings: {
            url: 'https://example.com/feed.xml',
            folder: 'Tech',
            updateInterval: 60,
            filterDuplicates: true
          }
        }],
        articles: [],
        settings: defaultSettings,
        readArticles: [],
        lastReadArticle: null
      }

      mockStorageService.loadData.mockResolvedValue(testData)

      const opml = await service.exportOpml()

      expect(opml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(opml).toContain('<opml version="2.0">')
      expect(opml).toContain('<outline text="Tech"')
      expect(opml).toContain('xmlUrl="https://example.com/feed.xml"')
    })
  })
}) 