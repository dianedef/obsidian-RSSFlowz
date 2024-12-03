// Codes d'erreur pour les flux RSS
export enum RSSErrorCode {
  FETCH_ERROR = 'FETCH_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_FORMAT = 'INVALID_FORMAT',
  MISSING_TITLE = 'MISSING_TITLE'
}

// Codes d'erreur pour la synchronisation
export enum SyncErrorCode {
  FEED_NOT_FOUND = 'FEED_NOT_FOUND',
  FOLDER_CREATE_FAILED = 'FOLDER_CREATE_FAILED',
  FILE_CREATE_FAILED = 'FILE_CREATE_FAILED',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  SYNC_FAILED = 'SYNC_FAILED'
}

// Codes d'erreur pour le stockage
export enum StorageErrorCode {
  LOAD_FAILED = 'LOAD_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
  INVALID_DATA = 'INVALID_DATA',
  DATA_CORRUPTED = 'DATA_CORRUPTED'
}

// Codes d'erreur pour l'OPML
export enum OpmlErrorCode {
  PARSE_FAILED = 'PARSE_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  EXPORT_FAILED = 'EXPORT_FAILED',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  IMPORT_FAILED = 'IMPORT_FAILED'
}

// Interface de base pour toutes les erreurs
interface BaseError extends Error {
  timestamp: number;
  code: string;
}

// Erreur RSS
export interface RSSError extends BaseError {
  name: 'RSSError';
  code: RSSErrorCode;
  feedUrl: string;
  response?: Response;
}

// Erreur de synchronisation
export interface SyncError extends BaseError {
  name: 'SyncError';
  code: SyncErrorCode;
  feedId: string;
  path?: string;
}

// Erreur de stockage
export interface StorageError extends BaseError {
  name: 'StorageError';
  code: StorageErrorCode;
  key?: string;
  data?: unknown;
}

// Erreur OPML
export interface OpmlError extends BaseError {
  name: 'OpmlError';
  code: OpmlErrorCode;
  content?: string;
  line?: number;
}

// Type Guards
export function isRSSError(error: unknown): error is RSSError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'RSSError' &&
    'code' in error &&
    Object.values(RSSErrorCode).includes(error.code as RSSErrorCode)
  )
}

export function isSyncError(error: unknown): error is SyncError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'SyncError' &&
    'code' in error &&
    Object.values(SyncErrorCode).includes(error.code as SyncErrorCode)
  )
}

export function isStorageError(error: unknown): error is StorageError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'StorageError' &&
    'code' in error &&
    Object.values(StorageErrorCode).includes(error.code as StorageErrorCode)
  )
}

export function isOpmlError(error: unknown): error is OpmlError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    error.name === 'OpmlError' &&
    'code' in error &&
    Object.values(OpmlErrorCode).includes(error.code as OpmlErrorCode)
  )
}

// Constructeurs d'erreurs
export function createRSSError(
  code: RSSErrorCode,
  message: string,
  feedUrl: string,
  response?: Response
): RSSError {
  return {
    name: 'RSSError',
    message,
    code,
    timestamp: Date.now(),
    feedUrl,
    response
  }
}

export function createSyncError(
  code: SyncErrorCode,
  message: string,
  feedId: string
): SyncError {
  return {
    name: 'SyncError',
    message,
    code,
    timestamp: Date.now(),
    feedId
  }
}

export function createStorageError(
  code: StorageErrorCode,
  message: string,
  key?: string,
  data?: unknown
): StorageError {
  return {
    name: 'StorageError',
    message,
    code,
    timestamp: Date.now(),
    key,
    data
  }
}

export function createOpmlError(
  code: OpmlErrorCode,
  message: string,
  content?: string,
  line?: number
): OpmlError {
  return {
    name: 'OpmlError',
    message,
    code,
    timestamp: Date.now(),
    content,
    line
  }
} 