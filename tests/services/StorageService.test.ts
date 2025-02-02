import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from '../../src/services/StorageService'
import { Plugin } from 'obsidian'
import { StorageData } from '../../src/types'
import { MockPlugin } from '../types/mocks'

describe('StorageService', () => {
  let service: StorageService
  let mockPlugin: MockPlugin
  let mockLoadData: ReturnType<typeof vi.fn>
  let mockSaveData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLoadData = vi.fn().mockImplementation(async () => ({
      feeds: [],
      settings: {
        defaultUpdateInterval: 60,
        defaultFolder: 'RSS',
        maxArticles: 50,
        template: '# {{title}}\n\n{{description}}\n\n{{link}}'
      }
    }))
    mockSaveData = vi.fn().mockImplementation(async () => {})

    mockPlugin = {
      app: {
        vault: {
          adapter: {
            exists: vi.fn(),
            mkdir: vi.fn(),
            write: vi.fn()
          }
        }
      },
      manifest: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.15.0'
      },
      loadData: mockLoadData,
      saveData: mockSaveData
    } as MockPlugin

    service = new StorageService(mockPlugin)
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
          maxArticles: 50,
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
            filterDuplicates: true
          }
        }],
        settings: {
          defaultUpdateInterval: 120,
          defaultFolder: 'Custom',
          maxArticles: 100,
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
          maxArticles: 50,
          template: 'Test template'
        }
      }

      await service.saveData(dataToSave)

      expect(mockSaveData).toHaveBeenCalledWith(dataToSave)
    })
  })
}) 