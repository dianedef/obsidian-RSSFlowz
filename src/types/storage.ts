import { Plugin } from 'obsidian'
import { PluginSettings } from './settings'
import { FeedSettings } from './settings'

export interface ObsidianPlugin extends Plugin {
  loadData(): Promise<StorageData>;
  saveData(data: StorageData): Promise<void>;
}

export interface StorageData {
  feeds: FeedSettings[];
  settings: PluginSettings;
}
