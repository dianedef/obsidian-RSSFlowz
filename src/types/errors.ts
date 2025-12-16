/**
 * Structured error handling for RSS operations
 * 
 * Design pattern: Domain-specific error types
 * - Typed error codes for precise error handling
 * - Context-rich error objects (feedUrl, feedId, etc.)
 * - Type guards for safe error checking
 * - Factory functions for consistent error creation
 * 
 * Benefits:
 * - Caller can handle specific errors differently
 * - Logging includes relevant context
 * - Type safety prevents typos in error codes
 * - Easy to trace errors back to source
 * 
 * Example:
 * try { await fetchFeed(url) }
 * catch (e) {
 *   if (isRSSError(e) && e.code === RSSErrorCode.PARSE_ERROR) {
 *     // Handle parse errors specifically
 *   }
 * }
 */

// RSS feed operation errors
export enum RSSErrorCode {
    FETCH_ERROR = 'FETCH_ERROR',           // Network/HTTP errors
    PARSE_ERROR = 'PARSE_ERROR',           // XML parsing failures
    VALIDATION_ERROR = 'VALIDATION_ERROR', // Invalid feed structure
    SAVE_ERROR = 'SAVE_ERROR',             // File write failures
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'        // Unexpected errors
}

// Feed synchronization errors
export enum SyncErrorCode {
    SYNC_FAILED = 'SYNC_FAILED',       // General sync failure
    FEED_NOT_FOUND = 'FEED_NOT_FOUND', // Feed deleted or missing
    INVALID_FEED = 'INVALID_FEED'      // Feed config invalid
}

/**
 * Base error class with structured data
 * 
 * Extends native Error with:
 * - Typed error code (enum)
 * - Optional context details
 * - Proper stack trace (via Error.captureStackTrace)
 * 
 * Why extend Error?
 * - instanceof checks work correctly
 * - Stack traces in debugger
 * - Integrates with error monitoring tools
 * - Can be caught like any Error
 */
export class BaseError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        // Capture stack trace for debugging (excludes constructor frames)
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * RSS-specific error with feed context
 * 
 * Includes:
 * - feedUrl: Which feed caused the error (for debugging/logging)
 * - originalError: Wrapped error if this is a re-throw
 * 
 * Use case: User reports "Feed X not working"
 * - Log includes exact feedUrl
 * - Can test that specific feed
 * - originalError shows root cause
 */
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

/**
 * Sync-specific error with feed ID
 * 
 * Includes:
 * - feedId: Internal UUID of feed (stable across URL changes)
 * - details: Additional context (article count, etc.)
 * 
 * Why feedId instead of feedUrl?
 * - Feed URLs can change (redirects, domain changes)
 * - feedId is stable identifier in our database
 * - Allows updating feed without losing error history
 */
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

/**
 * Type guards for safe error handling
 * 
 * Type guards enable TypeScript to narrow error types:
 * catch (e) {
 *   if (isRSSError(e)) {
 *     // TypeScript knows e is RSSError here
 *     console.log(e.feedUrl); // No type error
 *   }
 * }
 * 
 * Why needed?
 * - catch (e) gives e type 'unknown' (safe but inconvenient)
 * - Type guards provide type safety without casting
 * - Validates error shape at runtime (defensive programming)
 * 
 * Validation strategy:
 * 1. Check error is object (not string/null)
 * 2. Check name matches (RSSError/SyncError/etc.)
 * 3. Check code is valid enum value
 */
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

/**
 * Factory functions for consistent error creation
 * 
 * Why factories instead of 'new RSSError(...)'?
 * - Consistent error creation across codebase
 * - Easy to add logging/telemetry in one place
 * - Can evolve error creation without changing call sites
 * - Shorter, more readable than constructors
 * 
 * Example:
 * throw createRSSError(RSSErrorCode.FETCH_ERROR, 'Network timeout', feedUrl)
 * 
 * vs:
 * throw new RSSError(RSSErrorCode.FETCH_ERROR, 'Network timeout', feedUrl, undefined)
 */
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