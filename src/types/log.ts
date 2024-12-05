export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

export interface LogOptions {
  context?: Record<string, any>;
  notify?: boolean;
  error?: Error;
}

export interface LogServiceInterface {
  debug(message: string, options?: LogOptions): void;
  info(message: string, options?: LogOptions): void;
  warn(message: string, options?: LogOptions): void;
  error(message: string, options?: LogOptions): void;
  getEntries(level?: LogLevel): LogEntry[];
  clear(): void;
}

export interface LogExportOptions {
  startDate?: Date;
  endDate?: Date;
  level?: LogLevel;
  format?: 'json' | 'text';
} 