// Types d'erreurs
export enum RSSErrorCode {
    FETCH_ERROR = 'FETCH_ERROR',
    PARSE_ERROR = 'PARSE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    SAVE_ERROR = 'SAVE_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum SyncErrorCode {
    SYNC_FAILED = 'SYNC_FAILED',
    FEED_NOT_FOUND = 'FEED_NOT_FOUND',
    INVALID_FEED = 'INVALID_FEED'
}

// Classes d'erreurs de base
export class BaseError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Erreurs spécifiques
export class RSSError extends BaseError {
    constructor(
        code: RSSErrorCode,
        message: string,
        public feedUrl: string,
        public originalError?: Error
    ) {
        super(message, code);
        this.name = 'RSSError';
    }
}

export class SyncError extends BaseError {
    constructor(
        code: SyncErrorCode,
        message: string,
        public feedId: string,
        public details?: any
    ) {
        super(message, code);
        this.name = 'SyncError';
    }
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

// Fonctions de création d'erreurs
export function createRSSError(
    code: RSSErrorCode,
    message: string,
    feedUrl: string,
    originalError?: Error
): RSSError {
    return new RSSError(code, message, feedUrl, originalError);
}

export function createSyncError(
    code: SyncErrorCode,
    message: string,
    feedId: string,
    details?: any
): SyncError {
    return new SyncError(code, message, feedId, details);
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