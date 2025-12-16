import { Plugin, TAbstractFile } from 'obsidian'
import { RSSItem } from '../types'

/**
 * Manages vault file/folder operations
 * 
 * Responsibilities:
 * - Create folder structure for RSS articles
 * - Safely delete folders with validation
 * - Sanitize file/folder names for cross-platform compatibility
 * - Clean old articles based on retention policy
 * 
 * Safety features:
 * - Path validation (prevent deleting non-RSS folders)
 * - Root folder protection (never delete RSS root)
 * - Path normalization (handles Windows/Unix differences)
 * 
 * Design philosophy: Fail-safe
 * - Validate all destructive operations
 * - Log errors but don't crash
 * - Idempotent operations (safe to call multiple times)
 */
export class FileService {
  constructor(private plugin: Plugin) {}

  /**
   * Initialize folder structure for RSS content
   * 
   * Structure:
   * RSS/              ← Root folder
   *   group1/        ← User-defined groups (e.g., "tech", "news")
   *   group2/
   *   feed1/         ← Individual feed folders
   *   feed2/
   * 
   * Why separate groups and feeds?
   * - Groups: User organization (like tags)
   * - Feeds: Automatic structure per RSS source
   * 
   * Idempotent: Safe to call on every plugin load
   */
  async initializeFolders(rssFolder: string, groups: string[]): Promise<void> {
    try {
      // Ensure root RSS folder exists
      await this.ensureFolder(rssFolder);

      // Create group subfolders for organization
      for (const group of groups) {
        if (group) {  // Skip empty group names
          await this.ensureFolder(`${rssFolder}/${group}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des dossiers:', error);
      throw error;
    }
  }

  /**
   * Crée un dossier s'il n'existe pas déjà
   * @param path - Chemin du dossier à créer
   */
  async ensureFolder(path: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);
      if (!(await this.plugin.app.vault.adapter.exists(normalizedPath))) {
        await this.plugin.app.vault.createFolder(normalizedPath);
      }
    } catch (error) {
      console.error(`Erreur lors de la création du dossier ${path}:`, error);
      throw error;
    }
  }

  /**
   * Safely delete folder with validation
   * 
   * Safety measures (prevent accidental data loss):
   * 1. Root folder protection: Never delete RSS root
   * 2. Path validation: Only delete folders under RSS/
   * 3. Recursive deletion: Clean up all subfolders/files
   * 
   * Deletion order:
   * 1. Files first (leaf nodes)
   * 2. Subfolders recursively (bottom-up)
   * 3. Target folder last (after contents removed)
   * 
   * Why this order?
   * - Obsidian requires folders to be empty before deletion
   * - Bottom-up ensures all contents are cleared
   * - Prevents "folder not empty" errors
   * 
   * Use case: User removes a feed or changes folder structure
   */
  async removeFolder(path: string, isRootFolder: boolean = false): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);
      const exists = await this.plugin.app.vault.adapter.exists(normalizedPath);
      
      if (!exists) {
        return;  // Idempotent: no-op if already deleted
      }

      // SAFETY CHECK 1: Never delete RSS root folder
      if (isRootFolder) {
        console.warn('Tentative de suppression du dossier racine RSS empêchée');
        return;
      }

      // SAFETY CHECK 2: Only delete folders under RSS/
      // Prevents accidental deletion of user's other notes
      if (!normalizedPath.startsWith('RSS/')) {
        console.warn('Tentative de suppression d\'un dossier hors RSS empêchée');
        return;
      }

      // Get all contents (files and subfolders)
      const listing = await this.plugin.app.vault.adapter.list(normalizedPath);
      
      // Delete files first (leaf nodes)
      for (const file of listing.files) {
        const abstractFile = this.plugin.app.vault.getAbstractFileByPath(file);
        if (abstractFile) {
          await this.plugin.app.vault.delete(abstractFile);
        }
      }
      
      // Recursively delete subfolders (bottom-up traversal)
      for (const folder of listing.folders) {
        await this.removeFolder(folder, false);
      }
      
      // Finally delete the now-empty folder
      const folderFile = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
      if (folderFile) {
        await this.plugin.app.vault.delete(folderFile);
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression du dossier ${path}:`, error);
      throw error;
    }
  }

  /**
   * Normalize file paths for cross-platform compatibility
   * 
   * Transformations:
   * - Windows backslashes → Unix forward slashes
   * - Multiple slashes → single slash
   * - Leading/trailing slashes → removed
   * 
   * Why needed:
   * - Obsidian uses Unix-style paths internally
   * - Users might provide Windows paths (C:\folder\file)
   * - String comparison needs consistent format
   * 
   * Example:
   * "RSS\\tech\\article.md" → "RSS/tech/article.md"
   * "//RSS/tech/" → "RSS/tech"
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\\/g, '/')       // Windows → Unix
      .replace(/\/+/g, '/')      // Collapse multiple slashes
      .replace(/^\/|\/$/g, '')   // Remove leading/trailing slashes
      .trim();
  }

  /**
   * Nettoie les anciens articles selon la période de rétention
   * @param rssFolder - Dossier racine des articles RSS
   * @param retentionDays - Nombre de jours de rétention
   */
  async cleanOldArticles(rssFolder: string, retentionDays: number): Promise<void> {
    try {
      const cutoffDate = Date.now() - (retentionDays * 86400000) // 86400000 = 24h * 60m * 60s * 1000ms
      const files = this.plugin.app.vault.getFiles()
      
      // Filtrer les fichiers du dossier RSS
      const rssFiles = files.filter(file => 
        file.path.startsWith(rssFolder)
      )

      // Supprimer les fichiers plus anciens que la date limite
      for (const file of rssFiles) {
        if (file.stat.mtime < cutoffDate) {
          await this.plugin.app.vault.delete(file)
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
      const file = this.plugin.app.vault.getAbstractFileByPath(filePath)
      if (file instanceof TAbstractFile) {
        await this.plugin.app.vault.modify(file, content)
      } else {
        await this.plugin.app.vault.create(filePath, content)
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
    return await this.plugin.app.vault.adapter.exists(path)
  }

  /**
   * Sanitize filename for cross-platform compatibility
   * 
   * Forbidden characters in filenames:
   * - Windows: < > : " / \ | ? *
   * - macOS: :
   * - Linux: /
   * 
   * Strategy: Replace all non-alphanumeric with hyphens
   * 
   * Transformations:
   * - Lowercase (consistent, searchable)
   * - Non-alphanumeric → hyphens
   * - Multiple hyphens → single hyphen
   * - Leading/trailing hyphens → removed
   * 
   * Example:
   * "Breaking News: AI & Robots!" → "breaking-news-ai-robots"
   * 
   * Trade-off: Loses some information but ensures universal compatibility
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()                    // Consistent casing
      .replace(/[^a-z0-9]+/g, '-')     // Non-alphanumeric → hyphens
      .replace(/^-+|-+$/g, '')         // Remove edge hyphens
      .replace(/-{2,}/g, '-')          // Collapse multiple hyphens
  }
} 