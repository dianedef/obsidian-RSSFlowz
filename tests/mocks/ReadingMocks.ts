import { Plugin, TFile, Vault, WorkspaceLeaf } from 'obsidian';
import { vi } from 'vitest';
import { LogServiceInterface } from '../../src/types/logs';
import { createMockVault } from './FileMocks';

export const createMockLeaf = () => ({
  openFile: vi.fn(),
  getViewState: vi.fn(),
  setViewState: vi.fn(),
  getEphemeralState: vi.fn(),
  setEphemeralState: vi.fn(),
  togglePinned: vi.fn(),
  setPinned: vi.fn(),
  setGroupMember: vi.fn(),
  setGroup: vi.fn(),
  detach: vi.fn(),
  acceptsExtension: vi.fn()
}) as unknown as WorkspaceLeaf;

export const createMockWorkspace = (leaf: WorkspaceLeaf) => ({
  getLeaf: vi.fn().mockReturnValue(leaf),
  getActiveFile: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
});

export const createMockApp = (vault: Vault, workspace: any) => ({
  vault,
  workspace
});

export const createMockPlugin = (app: any): Plugin => ({
  app,
  manifest: { id: 'test' }
}) as unknown as Plugin;

export function createMockLogService(): LogServiceInterface {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}

export function createMockConsole(): Console {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  } as unknown as Console
} 