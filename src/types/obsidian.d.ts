import 'obsidian'

declare module 'obsidian' {
  interface HTMLElement {
    empty(): void;
    createEl(tag: string, attrs?: any): HTMLElement;
  }

  interface TextComponent {
    setPlaceholder(placeholder: string): this;
    setValue(value: string): this;
    onChange(callback: (value: string) => any): this;
  }

  export class PluginSettingTab {
    containerEl: HTMLElement;
    constructor(app: App, plugin: Plugin);
    display(): void;
    hide(): void;
  }

  export class App {
    vault: Vault;
    workspace: Workspace;
  }

  export class Vault {
    adapter: {
      exists(path: string): Promise<boolean>;
      list(path: string): Promise<{ files: string[]; folders: string[] }>;
      remove(path: string): Promise<void>;
      rmdir(path: string): Promise<void>;
    };
    getFiles(): TFile[];
    getAbstractFileByPath(path: string): TFile | null;
    create(path: string, data: string): Promise<TFile>;
    createFolder(path: string): Promise<void>;
    delete(file: TFile, force?: boolean): Promise<void>;
    modify(file: TFile, data: string): Promise<void>;
    read(file: TFile): Promise<string>;
  }

  export class Workspace {
    getLeaf(createIfNotFound?: boolean): WorkspaceLeaf;
    getActiveFile(): TFile | null;
  }

  export class TFile {
    path: string;
    name: string;
    basename: string;
    extension: string;
    vault: Vault;
    parent: TFolder | null;
    stat: { mtime: number; ctime: number; size: number };
  }

  export class TFolder {
    path: string;
    name: string;
    children: (TFile | TFolder)[];
  }

  export class WorkspaceLeaf {
    view: View;
    openFile(file: TFile): Promise<void>;
  }

  export class ItemView {
    containerEl: HTMLElement;
    contentEl: HTMLElement;
    app: App;
    getViewType(): string;
    getDisplayText(): string;
    onOpen(): Promise<void>;
    onClose(): Promise<void>;
  }

  export class View extends ItemView {
  }

  export class Setting {
    constructor(containerEl: HTMLElement);
    setName(name: string): this;
    setDesc(desc: string): this;
    addText(cb: (text: TextComponent) => any): this;
    addTextArea(cb: (text: TextComponent) => any): this;
  }

  export class Notice {
    constructor(message: string, timeout?: number);
  }

  export class Plugin {
    app: App;
    manifest: any;
    loadData(): Promise<any>;
    saveData(data: any): Promise<void>;
    addSettingTab(tab: PluginSettingTab): void;
    addCommand(command: { id: string; name: string; callback: () => any }): void;
    get vault(): Vault;
    get workspace(): Workspace;
  }

  export interface RequestUrlParam {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string | ArrayBuffer;
  }

  export interface RequestUrlResponse {
    status: number;
    headers: Record<string, string>;
    text: string;
    arrayBuffer: ArrayBuffer;
    json: any;
  }

  export function requestUrl(params: RequestUrlParam | string): Promise<RequestUrlResponse>;
}

interface Console {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
} 