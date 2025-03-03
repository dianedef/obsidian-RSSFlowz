import { Plugin, TAbstractFile } from 'obsidian'
import { RSSItem } from '../types'

export class FileService {
  constructor(private plugin: Plugin) {}

  /**
   * Initialise les dossiers nécessaires pour le plugin
   * @param rssFolder - Dossier racine RSS
   * @param groups - Liste des groupes à créer
   */
  async initializeFolders(rssFolder: string, groups: string[]): Promise<void> {
    try {
      // Créer le dossier racine s'il n'existe pas
      await this.ensureFolder(rssFolder);

      // Créer les dossiers des groupes
      for (const group of groups) {
        if (group) {
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
   * Supprime un dossier et son contenu de manière sécurisée
   * @param path - Chemin du dossier à supprimer
   * @param isRootFolder - Indique si c'est le dossier racine RSS
   */
  async removeFolder(path: string, isRootFolder: boolean = false): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);
      const exists = await this.plugin.app.vault.adapter.exists(normalizedPath);
      
      if (!exists) {
        return;
      }

      // Protection contre la suppression du dossier racine
      if (isRootFolder) {
        console.warn('Tentative de suppression du dossier racine RSS empêchée');
        return;
      }

      // Vérifier que le chemin est bien dans le dossier RSS
      if (!normalizedPath.startsWith('RSS/')) {
        console.warn('Tentative de suppression d\'un dossier hors RSS empêchée');
        return;
      }

      // Récupérer la liste des fichiers et sous-dossiers
      const listing = await this.plugin.app.vault.adapter.list(normalizedPath);
      
      // Supprimer d'abord les fichiers
      for (const file of listing.files) {
        const abstractFile = this.plugin.app.vault.getAbstractFileByPath(file);
        if (abstractFile) {
          await this.plugin.app.vault.delete(abstractFile);
        }
      }
      
      // Supprimer récursivement les sous-dossiers
      for (const folder of listing.folders) {
        await this.removeFolder(folder, false);
      }
      
      // Enfin, supprimer le dossier lui-même
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
   * Normalise un chemin de fichier/dossier
   * @param path - Chemin à normaliser
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\\/g, '/') // Remplacer les backslashes par des slashes
      .replace(/\/+/g, '/') // Remplacer les slashes multiples par un seul
      .replace(/^\/|\/$/g, '') // Supprimer les slashes en début et fin
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
   * Nettoie un nom de fichier en remplaçant les caractères invalides
   * @param fileName - Nom de fichier à nettoyer
   * @returns Nom de fichier nettoyé
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .toLowerCase() // Conversion en minuscules
      .replace(/[^a-z0-9]+/g, '-') // Remplace les caractères non alphanumériques par des tirets
      .replace(/^-+|-+$/g, '') // Supprime les tirets en début et fin
      .replace(/-{2,}/g, '-') // Remplace les tirets multiples par un seul
  }
} 