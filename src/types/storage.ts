import { Plugin } from 'obsidian'

export interface ObsidianPlugin extends Plugin {
  loadData(): Promise<any>;
  saveData(data: any): Promise<void>;
}

export interface StorageData {
  feeds: any[];
  settings: PluginSettings;
}

export interface PluginSettings {
  defaultUpdateInterval: number;
  defaultFolder: string;
  maxItemsPerFeed: number;
  template: string;
}
