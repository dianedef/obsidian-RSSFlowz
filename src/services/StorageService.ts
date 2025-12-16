import { Plugin, requestUrl, Notice } from 'obsidian'
import { StorageData } from '../types'
import { PluginSettings, FeedSettings, DEFAULT_SETTINGS } from '../types/settings'

/**
 * Manages plugin data persistence and validation
 * 
 * Responsibilities:
 * - Load/save plugin data to Obsidian's data.json
 * - Ensure data schema is always valid (migration-like behavior)
 * - Provide safe defaults for missing properties
 * - Test RSS feed connectivity
 * - Manage folders (ensure/remove)
 * 
 * Data structure:
 * - feeds: Array of Feed objects (RSS sources)
 * - settings: PluginSettings object (user preferences)
 * 
 * Design pattern: Defensive programming
 * - Always check for missing properties
 * - Merge with defaults to handle version upgrades
 * - Save updated data automatically to persist migrations
 */
export class StorageService {
  private static readonly STORAGE_KEY = 'obsidian-rss-reader'

  constructor(private plugin: Plugin) {}

  /**
   * Load plugin data with automatic migration
   * 
   * Migration strategy:
   * 1. If no data exists: Initialize with defaults
   * 2. If data incomplete: Merge with defaults (preserves user data)
   * 3. If data valid: Return as-is
   * 
   * Why auto-migration?
   * - Plugin updates may add new settings
   * - Prevents errors from accessing undefined properties
   * - Users don't need to reset settings after updates
   * 
   * This approach is safer than manual version checking
   */
  async loadData(): Promise<StorageData> {
    const data = await this.plugin.loadData();
    if (!data) {
      // First-time user: Initialize with defaults
      const defaultData: StorageData = {
        feeds: [],
        settings: DEFAULT_SETTINGS
      };
      await this.saveData(defaultData);
      return defaultData;
    }

    // Ensure settings object exists
    if (!data.settings) {
      data.settings = {}
    }

    // Merge with defaults to fill in missing properties
    // This handles plugin updates that add new settings
    const defaultSettings: Partial<PluginSettings> = {
      groups: [],
      rssFolder: data.settings.rssFolder || 'RSS',
      openaiKey: data.settings.openaiKey || '',
      fetchFrequency: data.settings.fetchFrequency || 'startup',
      maxArticles: data.settings.maxArticles || 50,
      retentionDays: data.settings.retentionDays || 30,
      readingMode: data.settings.readingMode || false,
      lastFetch: data.settings.lastFetch || 0,
      template: data.settings.template || '',
      digest: data.settings.digest || {
        enabled: false,
        mode: 'disabled',
        template: '',
        folderPath: ''
      }
    }

    // Si aucun feed n'existe, initialiser un tableau vide
    if (!data.feeds) {
      data.feeds = []
    }

    // Sauvegarder les données mises à jour
    const updatedData: StorageData = {
      feeds: data.feeds,
      settings: defaultSettings as PluginSettings
    }

    // Fusionner les paramètres existants avec les valeurs par défaut
    updatedData.settings = {
      ...defaultSettings,
      ...data.settings
    }

    await this.saveData(updatedData)
    return updatedData
  }

  async saveData(data: StorageData): Promise<void> {
    await this.plugin.saveData(data);
  }

  /**
   * Crée un dossier s'il n'existe pas déjà
   * @param path Chemin du dossier à créer
   */
  async ensureFolder(path: string): Promise<void> {
    try {
      const adapter = this.plugin.app.vault.adapter;
      const exists = await adapter.exists(path);
      if (!exists) {
        await adapter.mkdir(path);
      }
    } catch (error) {
      console.error(`Erreur lors de la création du dossier ${path}:`, error);
    }
  }

  /**
   * Supprime un dossier et tout son contenu de manière récursive
   * @param path Chemin du dossier à supprimer
   * @throws Error si la suppression échoue
   */
  async removeFolder(path: string): Promise<void> {
    try {
      const adapter = this.plugin.app.vault.adapter;
      const exists = await adapter.exists(path);
      if (exists) {
        const folder = this.plugin.app.vault.getAbstractFileByPath(path);
        if (folder) {
          await this.plugin.app.vault.delete(folder, true);
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression du dossier ${path}:`, error);
      throw error;
    }
  }

  /**
   * Test RSS feed connectivity before adding
   * 
   * Purpose: Prevent adding dead/invalid feeds
   * 
   * Validation checks:
   * - HTTP connectivity (can we reach the URL?)
   * - SSL certificate validity (security check)
   * - Response type (is it XML?)
   * 
   * SSL handling:
   * - Invalid certificates are common (expired, self-signed)
   * - Show user-friendly warning
   * - Don't add feed automatically (security risk)
   * 
   * Why test before adding?
   * - Better UX: immediate feedback
   * - Avoid cluttering feed list with broken feeds
   * - Prevents confusing errors later during sync
   */
  async testFeed(feedUrl: string, feedTitle: string): Promise<{
    success: boolean;
    response?: any;
    error?: string;
    message?: string;
  }> {
    try {
      const response = await requestUrl({
        url: feedUrl,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/atom+xml,application/xml,text/xml,*/*'
        }
      });
      return { success: true, response };
    } catch (error) {
      // Special handling for SSL errors (common with small blogs)
      if (error.message.includes('CERT_')) {
        new Notice(
          `Feed "${feedTitle}" ignoré : Certificat SSL invalide. 
            Veuillez vérifier la sécurité du site avant de l'ajouter.`,
          7000
        );
        console.warn(`Feed ignoré (SSL invalide): ${feedUrl}`);
        return {
          success: false,
          error: 'invalid_cert',
          message: 'Certificat SSL invalide'
        };
      }
      throw error;
    }
  }
} 