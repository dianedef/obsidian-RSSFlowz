import { Plugin, requestUrl, Notice } from 'obsidian'
import { StorageData } from '../types'
import { PluginSettings, FeedSettings, DEFAULT_SETTINGS } from '../types/settings'

export class StorageService {
  private static readonly STORAGE_KEY = 'obsidian-rss-reader'

  constructor(private plugin: Plugin) {}

  async loadData(): Promise<StorageData> {
    const data = await this.plugin.loadData();
    if (!data) {
      // Initialiser avec les paramètres par défaut
      const defaultData: StorageData = {
        feeds: [],
        settings: DEFAULT_SETTINGS
      };
      await this.saveData(defaultData);
      return defaultData;
    }

    // Si les données existent mais sont incomplètes
    if (!data.settings) {
      data.settings = {}
    }

    // Initialiser les paramètres manquants
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
   * Teste la validité d'un flux RSS
   * @param feedUrl URL du flux à tester
   * @param feedTitle Titre du flux pour l'affichage des erreurs
   * @returns Un objet contenant le statut du test et la réponse ou l'erreur
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