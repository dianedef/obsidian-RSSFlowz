import { App, Plugin, TFile, Vault, WorkspaceLeaf } from 'obsidian';
import { Mock } from 'vitest';
import { StorageData as AppStorageData } from '../../src/types';

export type StorageData = AppStorageData;

export interface MockVault extends Partial<Vault> {
  adapter: {
    exists: Mock<any, Promise<boolean>>;
    list: Mock<any, Promise<{ files: string[]; folders: string[] }>>;
    remove: Mock<any, Promise<void>>;
    rmdir: Mock<any, Promise<void>>;
    mkdir: Mock<any, Promise<void>>;
    write: Mock<any, Promise<void>>;
  };
  getFiles: Mock<any, TFile[]>;
  getAbstractFileByPath: Mock<any, TFile | null>;
  create: Mock<any, Promise<TFile>>;
  createFolder: Mock<any, Promise<void>>;
  delete: Mock<any, Promise<void>>;
  modify: Mock<any, Promise<void>>;
}

export interface MockWorkspace {
  getLeaf: Mock<any, WorkspaceLeaf>;
  getActiveFile: Mock<any, TFile | null>;
  on: Mock<any, any>;
  getActiveViewOfType: Mock<any, any>;
}

export interface MockApp {
  vault: MockVault;
  workspace: MockWorkspace;
}

export interface MockPlugin {
  app: MockApp;
  manifest: {
    id: string;
    name: string;
    version: string;
    minAppVersion: string;
  };
  loadData: Mock<any, Promise<any>>;
  saveData: Mock<any, Promise<void>>;
  addCommand: Mock<any, void>;
  addSettingTab: Mock<any, void>;
  vault: MockVault;
  workspace: MockWorkspace;
}

export interface MockStorageService {
  loadData: Mock<any, Promise<StorageData>>;
  saveData: Mock<any, Promise<void>>;
} 