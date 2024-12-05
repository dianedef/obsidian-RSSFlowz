export interface SchedulerTask {
  id: string;
  interval: number; // en minutes
  lastRun?: Date;
  nextRun: Date;
  isRunning: boolean;
}

export interface SchedulerOptions {
  runImmediately?: boolean;
  startDelay?: number;
}

export interface SchedulerServiceInterface {
  schedule(taskId: string, callback: () => Promise<void>, interval: number, options?: SchedulerOptions): void;
  unschedule(taskId: string): void;
  reschedule(taskId: string, newInterval: number): void;
  isScheduled(taskId: string): boolean;
  getNextRunTime(taskId: string): Date | null;
  start(): void;
  stop(): void;
}

export interface SchedulerError extends Error {
  taskId: string;
  type: 'schedule' | 'execution' | 'interval';
} 