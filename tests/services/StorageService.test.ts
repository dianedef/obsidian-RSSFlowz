import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from '../../src/services/StorageService'
import { App } from 'obsidian'
import { StorageData } from '../../src/types'

describe('StorageService', () => {
  let service: StorageService
  let mockApp: App
  let mockLoadData: ReturnType<typeof vi.fn>
  let mockSaveData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLoadData = vi.fn().mockImplementation(async () => ({
      feeds: [],
      settings: {
        defaultUpdateInterval: 60,
        defaultFolder: 'RSS',
        maxItemsPerFeed: 50,
        template: '# {{title}}\n\n{{description}}\n\n{{link}}'
      }
    }))
    mockSaveData = vi.fn().mockImplementation(async () => {})

    mockApp = {
      vault: {
        getFiles: vi.fn(),
        getAbstractFileByPath: vi.fn(),
        create: vi.fn(),
        createBinary: vi.fn()
      },
      workspace: {
        getActiveFile: vi.fn(),
        getActiveViewOfType: vi.fn()
      },
      loadData: mockLoadData,
      saveData: mockSaveData
    } as unknown as App

    service = new StorageService(mockApp)
  })

  describe('loadData', () => {
    it('devrait initialiser les données par défaut si aucune donnée n\'existe', async () => {
      mockLoadData.mockResolvedValue(null)

      const data = await service.loadData()

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

      const data = await service.loadData()

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

      await service.saveData(dataToSave)

      expect(mockSaveData).toHaveBeenCalledWith('obsidian-rss-reader', dataToSave)
    })
  })
}) 