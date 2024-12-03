import { describe, it, expect } from 'vitest'
import {
  RSSErrorCode,
  SyncErrorCode,
  StorageErrorCode,
  OpmlErrorCode,
  createRSSError,
  createSyncError,
  createStorageError,
  createOpmlError,
  isRSSError,
  isSyncError,
  isStorageError,
  isOpmlError
} from '../../src/types/errors'

describe('Error Types', () => {
  describe('Type Guards', () => {
    it('devrait identifier correctement les erreurs RSS', () => {
      const rssError = createRSSError(
        RSSErrorCode.FETCH_ERROR,
        'Échec du chargement du flux',
        'https://example.com/feed'
      )
      expect(isRSSError(rssError)).toBe(true)
      expect(isRSSError(new Error())).toBe(false)
      expect(isRSSError(null)).toBe(false)
    })

    it('devrait identifier correctement les erreurs de synchronisation', () => {
      const syncError = createSyncError(
        SyncErrorCode.FEED_NOT_FOUND,
        'Flux introuvable',
        'feed-123'
      )
      expect(isSyncError(syncError)).toBe(true)
      expect(isSyncError(new Error())).toBe(false)
      expect(isSyncError(null)).toBe(false)
    })

    it('devrait identifier correctement les erreurs de stockage', () => {
      const storageError = createStorageError(
        StorageErrorCode.LOAD_FAILED,
        'Échec du chargement des données'
      )
      expect(isStorageError(storageError)).toBe(true)
      expect(isStorageError(new Error())).toBe(false)
      expect(isStorageError(null)).toBe(false)
    })

    it('devrait identifier correctement les erreurs OPML', () => {
      const opmlError = createOpmlError(
        OpmlErrorCode.PARSE_FAILED,
        'Erreur de parsing OPML'
      )
      expect(isOpmlError(opmlError)).toBe(true)
      expect(isOpmlError(new Error())).toBe(false)
      expect(isOpmlError(null)).toBe(false)
    })
  })

  describe('Error Properties', () => {
    it('devrait avoir les propriétés correctes pour les erreurs RSS', () => {
      const rssError = createRSSError(
        RSSErrorCode.FETCH_ERROR,
        'Échec du chargement du flux',
        'https://example.com/feed'
      )
      expect(rssError).toMatchObject({
        name: 'RSSError',
        message: 'Échec du chargement du flux',
        code: RSSErrorCode.FETCH_ERROR,
        feedUrl: 'https://example.com/feed'
      })
      expect(rssError.timestamp).toBeTypeOf('number')
    })

    it('devrait avoir les propriétés correctes pour les erreurs de synchronisation', () => {
      const syncError = createSyncError(
        SyncErrorCode.FEED_NOT_FOUND,
        'Flux introuvable',
        'feed-123'
      )
      expect(syncError).toMatchObject({
        name: 'SyncError',
        message: 'Flux introuvable',
        code: SyncErrorCode.FEED_NOT_FOUND,
        feedId: 'feed-123'
      })
      expect(syncError.timestamp).toBeTypeOf('number')
    })

    it('devrait avoir les propriétés correctes pour les erreurs de stockage', () => {
      const data = { test: 'data' }
      const storageError = createStorageError(
        StorageErrorCode.SAVE_FAILED,
        'Échec de la sauvegarde',
        'test-key',
        data
      )
      expect(storageError).toMatchObject({
        name: 'StorageError',
        message: 'Échec de la sauvegarde',
        code: StorageErrorCode.SAVE_FAILED,
        key: 'test-key',
        data
      })
      expect(storageError.timestamp).toBeTypeOf('number')
    })

    it('devrait avoir les propriétés correctes pour les erreurs OPML', () => {
      const opmlError = createOpmlError(
        OpmlErrorCode.PARSE_FAILED,
        'Erreur de parsing OPML',
        '<opml>invalid</opml>',
        42
      )
      expect(opmlError).toMatchObject({
        name: 'OpmlError',
        message: 'Erreur de parsing OPML',
        code: OpmlErrorCode.PARSE_FAILED,
        content: '<opml>invalid</opml>',
        line: 42
      })
      expect(opmlError.timestamp).toBeTypeOf('number')
    })
  })

  describe('Error Codes', () => {
    it('devrait avoir tous les codes d\'erreur RSS requis', () => {
      expect(RSSErrorCode.FETCH_ERROR).toBe('FETCH_ERROR')
      expect(RSSErrorCode.PARSE_ERROR).toBe('PARSE_ERROR')
      expect(RSSErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR')
      expect(RSSErrorCode.INVALID_FORMAT).toBe('INVALID_FORMAT')
      expect(RSSErrorCode.MISSING_TITLE).toBe('MISSING_TITLE')
    })

    it('devrait avoir tous les codes d\'erreur de synchronisation requis', () => {
      expect(SyncErrorCode.FEED_NOT_FOUND).toBe('FEED_NOT_FOUND')
      expect(SyncErrorCode.FOLDER_CREATE_FAILED).toBe('FOLDER_CREATE_FAILED')
      expect(SyncErrorCode.FILE_CREATE_FAILED).toBe('FILE_CREATE_FAILED')
      expect(SyncErrorCode.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY')
    })

    it('devrait avoir tous les codes d\'erreur de stockage requis', () => {
      expect(StorageErrorCode.LOAD_FAILED).toBe('LOAD_FAILED')
      expect(StorageErrorCode.SAVE_FAILED).toBe('SAVE_FAILED')
      expect(StorageErrorCode.INVALID_DATA).toBe('INVALID_DATA')
      expect(StorageErrorCode.DATA_CORRUPTED).toBe('DATA_CORRUPTED')
    })

    it('devrait avoir tous les codes d\'erreur OPML requis', () => {
      expect(OpmlErrorCode.PARSE_FAILED).toBe('PARSE_FAILED')
      expect(OpmlErrorCode.INVALID_FORMAT).toBe('INVALID_FORMAT')
      expect(OpmlErrorCode.EXPORT_FAILED).toBe('EXPORT_FAILED')
      expect(OpmlErrorCode.MISSING_REQUIRED).toBe('MISSING_REQUIRED')
    })
  })
}) 