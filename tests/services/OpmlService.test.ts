import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App } from 'obsidian'
import { OpmlService } from '../../src/services/OpmlService'
import { StorageService } from '../../src/services/StorageService'
import { StorageData } from '../../src/types'

describe('OpmlService', () => {
  let app: App
  let storageService: StorageService
  let opmlService: OpmlService
  let mockLoadData: ReturnType<typeof vi.fn>
  let mockSaveData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLoadData = vi.fn()
    mockSaveData = vi.fn()

    storageService = {
      loadData: mockLoadData,
      saveData: mockSaveData
    } as unknown as StorageService

    app = {} as App

    opmlService = new OpmlService(app, storageService)
  })

  describe('importOpml', () => {
    const mockStorageData: StorageData = {
      feeds: [
        {
          id: 'existing-feed',
          settings: {
            url: 'https://existing.com/feed',
            folder: 'Existing',
            updateInterval: 60,
            filterDuplicates: true
          }
        }
      ],
      settings: {
        defaultUpdateInterval: 60,
        defaultFolder: 'RSS',
        maxItemsPerFeed: 50,
        template: 'test'
      }
    }

    const validOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSS Feeds</title>
  </head>
  <body>
    <outline text="Tech" title="Tech">
      <outline text="Blog 1" title="Blog 1" type="rss" xmlUrl="https://blog1.com/feed"/>
      <outline text="Blog 2" title="Blog 2" type="rss" xmlUrl="https://blog2.com/feed"/>
    </outline>
    <outline text="News" title="News">
      <outline text="News 1" title="News 1" type="rss" xmlUrl="https://news1.com/feed"/>
    </outline>
  </body>
</opml>`

    it('devrait importer des flux OPML avec succès', async () => {
      mockLoadData.mockResolvedValue(mockStorageData)
      
      await opmlService.importOpml(validOpml)

      expect(mockSaveData).toHaveBeenCalledTimes(1)
      const savedData = mockSaveData.mock.calls[0][0]
      expect(savedData.feeds).toHaveLength(4) // 1 existant + 3 nouveaux
      
      const newFeeds = savedData.feeds.slice(1) // Exclure le flux existant
      expect(newFeeds.map(f => f.settings.url)).toEqual([
        'https://blog1.com/feed',
        'https://blog2.com/feed',
        'https://news1.com/feed'
      ])
      expect(newFeeds[0].settings.folder).toBe('Tech')
      expect(newFeeds[2].settings.folder).toBe('News')
    })

    it('devrait ignorer les flux existants', async () => {
      const existingOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>RSS Feeds</title></head>
  <body>
    <outline text="Existing" title="Existing" type="rss" xmlUrl="https://existing.com/feed"/>
    <outline text="New" title="New" type="rss" xmlUrl="https://new.com/feed"/>
  </body>
</opml>`

      mockLoadData.mockResolvedValue(mockStorageData)
      
      await opmlService.importOpml(existingOpml)

      const savedData = mockSaveData.mock.calls[0][0]
      expect(savedData.feeds).toHaveLength(2)
      expect(savedData.feeds[1].settings.url).toBe('https://new.com/feed')
    })

    it('devrait gérer les erreurs de parsing XML', async () => {
      const invalidOpml = 'Invalid XML content'
      mockLoadData.mockResolvedValue(mockStorageData)

      await expect(opmlService.importOpml(invalidOpml)).rejects.toThrow('Format OPML invalide ou fichier corrompu')
      expect(mockSaveData).not.toHaveBeenCalled()
    })
  })

  describe('exportOpml', () => {
    it('devrait exporter les flux au format OPML', async () => {
      const mockData: StorageData = {
        feeds: [
          {
            id: '1',
            settings: {
              url: 'https://blog.com/feed',
              folder: 'Tech',
              updateInterval: 60,
              filterDuplicates: true
            }
          },
          {
            id: '2',
            settings: {
              url: 'https://news.com/feed',
              folder: 'News',
              updateInterval: 30,
              filterDuplicates: true
            }
          }
        ],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: 'test'
        }
      }

      mockLoadData.mockResolvedValue(mockData)

      const opml = await opmlService.exportOpml()

      expect(opml).toContain('<?xml version="1.0"?>')
      expect(opml).toContain('<opml version="2.0">')
      expect(opml).toContain('Obsidian RSS Feeds')
      expect(opml).toContain('https://blog.com/feed')
      expect(opml).toContain('https://news.com/feed')
      expect(opml).toContain('Tech')
      expect(opml).toContain('News')
    })

    it('devrait gérer les erreurs lors de l\'export', async () => {
      mockLoadData.mockRejectedValue(new Error('Erreur de chargement'))

      await expect(opmlService.exportOpml()).rejects.toThrow('Erreur lors de la génération du fichier OPML')
    })
  })
}) 