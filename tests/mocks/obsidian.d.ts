declare module 'obsidian' {
  interface App {
    vault: Vault
    loadData(key: string): Promise<any>
    saveData(key: string, data: any): Promise<void>
  }

  interface Vault {
    adapter: DataAdapter
    create(path: string, data: string): Promise<void>
    createFolder(path: string): Promise<void>
  }

  interface DataAdapter {
    exists(path: string): Promise<boolean>
  }
} 