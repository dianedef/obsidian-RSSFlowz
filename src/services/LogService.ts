import { Plugin, Notice } from 'obsidian'
import { LogLevel } from '../types/logs'

interface LogContext extends Record<string, unknown> {
  error?: Error
}

export class LogService {
  private logs: any[] = []
  private maxLogs = 1000

  constructor(private console: Console) {}

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context)
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logMessage = `[${level}] ${message}`
    const logContext = context || {}
    
    switch (level) {
      case LogLevel.DEBUG:
        this.console.debug(logMessage, logContext)
        break
      case LogLevel.INFO:
        this.console.info(logMessage, logContext)
        break
      case LogLevel.WARN:
        this.console.warn(logMessage, logContext)
        break
      case LogLevel.ERROR:
        if (logContext.error instanceof Error) {
          this.console.error(logMessage, logContext.error)
        } else {
          this.console.error(logMessage, logContext)
        }
        break
    }

    this.logs.push({
      level,
      message,
      timestamp: Date.now(),
      context: logContext
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