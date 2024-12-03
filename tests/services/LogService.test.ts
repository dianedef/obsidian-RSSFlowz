import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogService } from '../../src/services/LogService'
import { RSSError, RSSErrorCode } from '../../src/types/errors'
import { LogLevel } from '../../src/types/logs'
import { Notice } from 'obsidian'
import sinon from 'sinon'

vi.mock('obsidian', () => ({
  Notice: vi.fn()
}))

describe('LogService', () => {
  let service: LogService
  let mockApp: any
  let clock: sinon.SinonFakeTimers

  beforeEach(() => {
    vi.clearAllMocks()
    clock = sinon.useFakeTimers()

    mockApp = {
      vault: {
        adapter: {
          exists: vi.fn(),
          mkdir: vi.fn(),
          write: vi.fn()
        }
      }
    }

    service = new LogService(mockApp)
  })

  afterEach(() => {
    clock.restore()
  })

  describe('log', () => {
    it('devrait créer une notification pour les erreurs', () => {
      const error = new Error('Test error')
      service.error('Test error', error)
      expect(Notice).toHaveBeenCalledWith('❌ Test error', 10000)
      clock.tick(10000)
    })

    it('devrait créer une notification avec timeout pour les infos', () => {
      service.info('Test info')
      expect(Notice).toHaveBeenCalledWith('Test info', 3000)
      clock.tick(3000)
    })
  })

  describe('Logging Methods', () => {
    it('devrait logger un message d\'info avec une notification', () => {
      const message = 'Test info message'
      service.info(message)
      expect(Notice).toHaveBeenCalledWith(message, 3000)
      clock.tick(3000)
    })

    it('devrait logger un avertissement avec une notification', () => {
      const message = 'Test warning message'
      service.warn(message)
      expect(Notice).toHaveBeenCalledWith('⚠️ ' + message, 5000)
      clock.tick(5000)
    })

    it('devrait logger une erreur avec une notification', () => {
      const message = 'Test error message'
      service.error(message)
      expect(Notice).toHaveBeenCalledWith('❌ ' + message, 10000)
      clock.tick(10000)
    })
  })

  describe('Log Management', () => {
    it('devrait ajouter un log à la liste', () => {
      const message = 'Test message'
      service.info(message)
      const logs = service.getLogs()
      expect(logs[0]).toEqual(expect.objectContaining({
        level: LogLevel.INFO,
        message
      }))
    })

    it('devrait limiter le nombre de logs', () => {
      for (let i = 0; i < 1100; i++) {
        service.debug(`Message ${i}`)
      }
      expect(service.getLogs().length).toBeLessThanOrEqual(1000)
    })

    it('devrait effacer tous les logs', () => {
      service.debug('Test message')
      service.clearLogs()
      expect(service.getLogs()).toHaveLength(0)
    })
  })

  describe('export', () => {
    it('devrait exporter les logs au format JSON', async () => {
      service.error('Test error')
      service.info('Test info')
      const logs = await service.exportLogs()
      expect(logs).toContain('Test error')
      expect(logs).toContain('Test info')
    })
  })

  describe('Notifications', () => {
    it('devrait créer une notification avec timeout pour les infos', () => {
      service.info('Test info')
      expect(Notice).toHaveBeenCalledWith('Test info', 3000)
      clock.tick(3000)
    })

    it('devrait créer une notification avec timeout pour les warnings', () => {
      service.warn('Test warning')
      expect(Notice).toHaveBeenCalledWith('⚠️ Test warning', 5000)
      clock.tick(5000)
    })

    it('devrait créer une notification avec timeout pour les erreurs', () => {
      service.error('Test error')
      expect(Notice).toHaveBeenCalledWith('❌ Test error', 10000)
      clock.tick(10000)
    })
  })
}) 