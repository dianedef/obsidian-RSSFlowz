import { App, TFile, TFolder, Vault } from 'obsidian'
import { RSSItem } from '../types'

export class FileService {
  constructor(private app: App) {}

  /**
   * Crée un dossier s'il n'existe pas déjà
   * @param path - Chemin du dossier à créer
   */
  async ensureFolder(path: string): Promise<void> {
    try {
      const exists = await this.app.vault.adapter.exists(path)
      if (!exists) {
        await this.app.vault.createFolder(path)
      }
    } catch (error) {
      console.error(`Erreur lors de la création du dossier ${path}:`, error)
      throw error
    }
  }

  /**
   * Supprime un dossier et son contenu
   * @param path - Chemin du dossier à supprimer
   */
  async removeFolder(path: string): Promise<void> {
    try {
      const exists = await this.app.vault.adapter.exists(path)
      if (exists) {
        // Récupérer la liste des fichiers et sous-dossiers
        const listing = await this.app.vault.adapter.list(path)
        
        // Supprimer d'abord les fichiers
        for (const file of listing.files) {
          await this.app.vault.adapter.remove(file)
        }
        
        // Supprimer récursivement les sous-dossiers
        for (const folder of listing.folders) {
          await this.removeFolder(folder)
        }
        
        // Enfin, supprimer le dossier lui-même
        await this.app.vault.adapter.rmdir(path)
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression du dossier ${path}:`, error)
      throw error
    }
  }

  /**
   * Nettoie les anciens articles selon la période de rétention
   * @param rssFolder - Dossier racine des articles RSS
   * @param retentionDays - Nombre de jours de rétention
   */
  async cleanOldArticles(rssFolder: string, retentionDays: number): Promise<void> {
    try {
      const cutoffDate = Date.now() - (retentionDays * 86400000) // 86400000 = 24h * 60m * 60s * 1000ms
      const files = this.app.vault.getFiles()
      
      // Filtrer les fichiers du dossier RSS
      const rssFiles = files.filter(file => 
        file.path.startsWith(rssFolder) && 
        file instanceof TFile
      )

      // Supprimer les fichiers plus anciens que la date limite
      for (const file of rssFiles) {
        if (file.stat.mtime < cutoffDate) {
          await this.app.vault.delete(file)
        }
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des anciens articles:', error)
      throw error
    }
  }

  /**
   * Sauvegarde un article dans un fichier Markdown
   * @param article - L'article à sauvegarder
   * @param filePath - Chemin du fichier
   * @param template - Template pour le format de l'article
   */
  async saveArticle(article: RSSItem, filePath: string, template: string): Promise<void> {
    try {
      // Remplacer les variables dans le template
      const content = template
        .replace(/{{title}}/g, article.title)
        .replace(/{{description}}/g, article.description)
        .replace(/{{link}}/g, article.link)
        .replace(/{{pubDate}}/g, article.pubDate)

      // Créer ou mettre à jour le fichier
      const file = this.app.vault.getAbstractFileByPath(filePath)
      if (file instanceof TFile) {
        await this.app.vault.modify(file, content)
      } else {
        await this.app.vault.create(filePath, content)
      }
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de l'article dans ${filePath}:`, error)
      throw error
    }
  }

  /**
   * Vérifie si un fichier existe
   * @param path - Chemin du fichier
   * @returns true si le fichier existe
   */
  async fileExists(path: string): Promise<boolean> {
    return await this.app.vault.adapter.exists(path)
  }

  /**
   * Nettoie un nom de fichier en remplaçant les caractères invalides
   * @param fileName - Nom de fichier à nettoyer
   * @returns Nom de fichier nettoyé
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[/\\?%*:|"<>]/g, '-') // Remplacer les caractères invalides par des tirets
      .replace(/\s+/g, '-')           // Remplacer les espaces par des tirets
      .replace(/-+/g, '-')            // Éviter les tirets multiples
      .replace(/^-|-$/g, '')          // Supprimer les tirets en début et fin
      .trim()
  }
} 