declare module 'obsidian' {
  export class App {
    vault: Vault
    workspace: Workspace
  }

  export class Plugin {
    app: App
    manifest: any
    addSettingTab(tab: PluginSettingTab): void
    addCommand(command: Command): void
    loadData(): Promise<any>
    saveData(data: any): Promise<void>
  }

  export class TFile {
    path: string
    name: string
    basename: string
    extension: string
    vault: Vault
    parent: TFolder | null
    stat: { mtime: number }
  }

  export class TFolder {
    path: string
    name: string
    children: (TFile | TFolder)[]
  }

  export class Vault {
    adapter: DataAdapter
    getFiles(): TFile[]
    getAbstractFileByPath(path: string): TFile | null
    create(path: string, data: string): Promise<TFile>
    createBinary(path: string, data: ArrayBuffer): Promise<TFile>
    delete(file: TFile, force?: boolean): Promise<void>
    read(file: TFile): Promise<string>
    modify(file: TFile, data: string): Promise<void>
  }

  export class Workspace {
    getActiveFile(): TFile | null
    getActiveViewOfType<T>(type: any): T | null
    getLeaf(createIfNotFound?: boolean): WorkspaceLeaf
  }

  export class WorkspaceLeaf {
    view: View
    openFile(file: TFile): Promise<void>
  }

  export class View {
    contentEl: HTMLElement
  }

  export class PluginSettingTab {
    app: App
    containerEl: HTMLElement
    display(): void
    hide(): void
  }

  export class Setting {
    constructor(containerEl: HTMLElement)
    setName(name: string): this
    setDesc(desc: string): this
    addText(cb: (text: TextComponent) => any): this
    addToggle(cb: (toggle: ToggleComponent) => any): this
    addButton(cb: (button: ButtonComponent) => any): this
  }

  export class TextComponent {
    setValue(value: string): this
    getValue(): string
    onChange(callback: (value: string) => any): this
  }

  export class ToggleComponent {
    setValue(value: boolean): this
    getValue(): boolean
    onChange(callback: (value: boolean) => any): this
  }

  export class ButtonComponent {
    setButtonText(name: string): this
    onClick(callback: () => any): this
  }

  export class Notice {
    constructor(message: string, timeout?: number)
  }

  export interface DataAdapter {
    exists(path: string): Promise<boolean>
    mkdir(path: string): Promise<void>
    list(path: string): Promise<{ files: string[]; folders: string[] }>
    remove(path: string): Promise<void>
    rmdir(path: string): Promise<void>
  }

  export interface Command {
    id: string
    name: string
    callback(): any
    hotkeys?: any[]
  }

  export interface RequestUrlParam {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: string | ArrayBuffer
  }

  export interface RequestUrlResponse {
    status: number
    headers: Record<string, string>
    arrayBuffer: ArrayBuffer
    json: any
    text: string
  }

  export function requestUrl(params: RequestUrlParam | string): Promise<RequestUrlResponse>
} 