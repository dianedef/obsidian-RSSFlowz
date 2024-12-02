import { App } from 'obsidian'
import { StorageService } from '../../src/services/StorageService'
import { StorageData, PluginSettings, FeedData } from '../../src/types'

describe('StorageService', () => {
  let app: App
  let storageService: StorageService
  let mockLoadData: jest.Mock
  let mockSaveData: jest.Mock

  beforeEach(() => {
    mockLoadData = jest.fn()
    mockSaveData = jest.fn()
    app = {
      loadData: mockLoadData,
      saveData: mockSaveData
    } as unknown as App

    storageService = new StorageService(app)
  })

  describe('loadData', () => {
    it('devrait initialiser les données par défaut si aucune donnée n\'existe', async () => {
      mockLoadData.mockResolvedValue(null)

      const data = await storageService.loadData()

      expect(data).toEqual({
        feeds: [],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: '# {{title}}\n\n{{description}}\n\n{{link}}'
        }
      })
    })

    it('devrait fusionner les paramètres existants avec les valeurs par défaut', async () => {
      const existingData: StorageData = {
        feeds: [{ 
          id: '1',
          settings: {
            url: 'https://example.com/feed',
            folder: 'Test',
            updateInterval: 30,
            filterDuplicates: true
          }
        }],
        settings: {
          defaultUpdateInterval: 120,
          defaultFolder: 'Custom',
          maxItemsPerFeed: 100,
          template: 'Custom template'
        }
      }

      mockLoadData.mockResolvedValue(existingData)

      const data = await storageService.loadData()

      expect(data).toEqual(existingData)
    })
  })

  describe('saveData', () => {
    it('devrait sauvegarder les données correctement', async () => {
      const dataToSave: StorageData = {
        feeds: [],
        settings: {
          defaultUpdateInterval: 60,
          defaultFolder: 'RSS',
          maxItemsPerFeed: 50,
          template: 'Test template'
        }
      }

      await storageService.saveData(dataToSave)

      expect(mockSaveData).toHaveBeenCalledWith('obsidian-rss-reader', dataToSave)
    })
  })
}) 