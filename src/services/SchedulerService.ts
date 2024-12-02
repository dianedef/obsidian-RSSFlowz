import { App } from 'obsidian'
import { SyncService } from './SyncService'
import { StorageService } from './StorageService'
import { FeedData } from '../types'

export class SchedulerService {
  private intervals: Map<string, NodeJS.Timeout>

  constructor(
    private app: App,
    private syncService: SyncService,
    private storageService: StorageService
  ) {
    this.intervals = new Map()
  }

  async startScheduler(): Promise<void> {
    const data = await this.storageService.loadData()
    
    for (const feed of data.feeds) {
      this.scheduleFeed(feed)
    }
  }

  async stopScheduler(): Promise<void> {
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.intervals.clear()
  }

  scheduleFeed(feed: FeedData): void {
    if (this.intervals.has(feed.id)) {
      clearInterval(this.intervals.get(feed.id))
    }

    const interval = setInterval(async () => {
      try {
        await this.syncService.syncFeed(feed)
      } catch (error) {
        console.error(`Erreur lors de la synchronisation programmée de ${feed.settings.url}:`, error)
      }
    }, feed.settings.updateInterval * 60 * 1000) // Conversion minutes -> millisecondes

    this.intervals.set(feed.id, interval)
  }

  unscheduleFeed(feedId: string): void {
    if (this.intervals.has(feedId)) {
      clearInterval(this.intervals.get(feedId))
      this.intervals.delete(feedId)
    }
  }
} 