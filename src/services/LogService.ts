import { App, Notice } from 'obsidian'
import { RSSError, SyncError, StorageError, OpmlError } from '../types/errors'
import { LogLevel } from '../types/logs'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  error?: Error | RSSError | SyncError | StorageError | OpmlError
  context?: Record<string, unknown>
}

export class LogService {
  private logs: LogEntry[] = []
  private maxLogs = 1000

  constructor(private app: App) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, undefined, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, undefined, context)
    new Notice(message, 3000)
  }

  warn(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, error, context)
    new Notice(`⚠️ ${message}`, 5000)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, error, context)
    new Notice(`❌ ${message}`, 10000)
  }

  log(
    level: LogLevel,
    message: string | Error,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    const messageStr = message instanceof Error ? message.message : message
    const entry: LogEntry = {
      level,
      message: messageStr,
      timestamp: Date.now(),
      error: error || (message instanceof Error ? message : undefined),
      context
    }

    this.logs.unshift(entry)
    
    // Rotation des logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Log console
    const logMessage = `[RSS Reader] [${level}] ${messageStr}`
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, context)
        break
      case LogLevel.INFO:
        console.info(logMessage, context)
        break
      case LogLevel.WARN:
        console.warn(logMessage, error, context)
        break
      case LogLevel.ERROR:
        console.error(logMessage, error, context)
        break
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return level 
      ? this.logs.filter(entry => entry.level === level)
      : this.logs
  }

  clearLogs(): void {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
} 