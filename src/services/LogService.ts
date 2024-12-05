import { Plugin, Notice } from 'obsidian'
import { LogLevel } from '../types/logs'

export class LogService {
  private logs: any[] = []
  private maxLogs = 1000

  constructor(private console: Console) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context)
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const logMessage = `[${level}] ${message}`
    
    switch (level) {
      case LogLevel.DEBUG:
        this.console.debug(logMessage, context)
        break
      case LogLevel.INFO:
        this.console.info(logMessage, context)
        break
      case LogLevel.WARN:
        this.console.warn(logMessage, context)
        break
      case LogLevel.ERROR:
        this.console.error(logMessage, context)
        break
    }

    this.logs.push({
      level,
      message,
      timestamp: Date.now(),
      context
    })

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  getLogs(): any[] {
    return this.logs
  }

  clearLogs(): void {
    this.logs = []
  }
} 