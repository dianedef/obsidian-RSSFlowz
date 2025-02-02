import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpmlService } from '../../src/services/OpmlService'
import { StorageService } from '../../src/services/StorageService'
import { LogService } from '../../src/services/LogService'
import { Plugin, requestUrl, RequestUrlResponse } from 'obsidian'
import { MockPlugin, MockVault, MockWorkspace } from '../types/mocks'
import { StorageData, FeedData } from '../../src/types'

describe('OpmlService', () => {
  let service: OpmlService
  let mockPlugin: MockPlugin
  let mockStorageService: StorageService
  let mockLogService: LogService

  const defaultData: StorageData = {
    feeds: [],
    settings: {
      defaultUpdateInterval: 60,
      defaultFolder: 'RSS',
      maxArticles: 50,
      template: '# {{title}}\n\n{{description}}\n\n{{link}}'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    const mockVault: MockVault = {
      adapter: {
        exists: vi.fn().mockResolvedValue(false),
        list: vi.fn(),
        remove: vi.fn(),
        rmdir: vi.fn(),
        mkdir: vi.fn(),
        write: vi.fn()
      },
      getFiles: vi.fn(),
      delete: vi.fn(),
      create: vi.fn().mockImplementation(async () => Promise.resolve({} as any)),
      modify: vi.fn(),
      createFolder: vi.fn().mockImplementation(async () => Promise.resolve()),
      getAbstractFileByPath: vi.fn()
    }

    const mockWorkspace: MockWorkspace = {
      getLeaf: vi.fn(),
      getActiveFile: vi.fn(),
      on: vi.fn(),
      getActiveViewOfType: vi.fn()
    }

    mockPlugin = {
      app: {
        vault: mockVault,
        workspace: mockWorkspace
      },
      manifest: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.15.0'
      },
      loadData: vi.fn(),
      saveData: vi.fn(),
      addCommand: vi.fn(),
      addSettingTab: vi.fn(),
      vault: mockVault,
      workspace: mockWorkspace
    }

    mockStorageService = {
      loadData: vi.fn().mockResolvedValue(defaultData),
      saveData: vi.fn().mockResolvedValue(undefined)
    } as unknown as StorageService

    mockLogService = {
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn()
    } as unknown as LogService

    service = new OpmlService(mockPlugin as Plugin, mockStorageService, mockLogService)
  })

  describe('importFromUrl', () => {
    it('devrait importer des flux depuis une URL OPML', async () => {
      const mockResponse: Partial<RequestUrlResponse> = {
        status: 200,
        text: `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <head><title>RSS Feeds</title></head>
          <body>
            <outline text="Tech" title="Tech">
              <outline type="rss" text="Example Feed" xmlUrl="https://example.com/feed.xml"/>
            </outline>
          </body>
        </opml>`
      }

      vi.mocked(requestUrl).mockResolvedValue(mockResponse as RequestUrlResponse)

      const currentData = { ...defaultData }
      mockStorageService.loadData = vi.fn().mockResolvedValue(currentData)

      await service.importFromUrl('https://example.com/feeds.opml')

      expect(mockStorageService.saveData).toHaveBeenCalledWith(
        expect.objectContaining({
          feeds: expect.arrayContaining([
            expect.objectContaining({
              settings: {
                url: 'https://example.com/feed.xml',
                folder: 'Tech',
                filterDuplicates: true
              }
            })
          ])
        })
      )
    })
  })

  describe('exportOpml', () => {
    it('devrait exporter les flux au format OPML', async () => {
      const testData: StorageData = {
        ...defaultData,
        feeds: [{
          id: 'feed1',
          settings: {
            url: 'https://example.com/feed.xml',
            folder: 'Tech',
            filterDuplicates: true
          }
        }]
      }

      mockStorageService.loadData = vi.fn().mockResolvedValue(testData)

      const opml = await service.exportOpml()

      expect(opml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(opml).toContain('<opml version="2.0">')
      expect(opml).toContain('https://example.com/feed.xml')
      expect(opml).toContain('Tech')
    })
  })
}) 