import { Plugin } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from '../types/settings';
import { LogService } from './LogService';
import { StorageService } from './StorageService';

export class SettingsService {
   private settings: PluginSettings;
   private onReadingModeChange?: (isReading: boolean) => Promise<void>;
   private isLoading: boolean = false;

   constructor(
      private plugin: Plugin,
      private storageService: StorageService,
      private logService: LogService
   ) {
      this.settings = { ...DEFAULT_SETTINGS };
   }

   setReadingModeHandler(handler: (isReading: boolean) => Promise<void>): void {
      this.onReadingModeChange = handler;
   }

   private sanitizeFileName(fileName: string): string {
      return fileName
         .replace(/[*"\\/<>:|?]/g, '-') // Remplacer les caractères interdits par des tirets
         .replace(/\s+/g, ' ')          // Normaliser les espaces
         .trim();                       // Supprimer les espaces en début et fin
   }

   async loadSettings(initializeFolders: boolean = false): Promise<void> {
      if (this.isLoading) return;
      
      try {
         this.isLoading = true;
         const savedData = await this.storageService.loadData();
         this.logService.debug('Données chargées:', { data: savedData });
         
         // Fusion des paramètres par défaut avec les données sauvegardées
         this.settings = {
               ...DEFAULT_SETTINGS,
               ...savedData?.settings,
               // Mise à jour des timestamps si nécessaire
               lastFetch: savedData?.settings?.lastFetch || Date.now()
         };

         this.logService.debug('Settings après fusion:', { settings: this.settings });

         // Ne recréer les dossiers que si initializeFolders est true
         if (initializeFolders) {
            // Vérifier et recréer le dossier RSS s'il n'existe pas
            const rssFolder = this.settings.rssFolder;
            if (!(await this.plugin.app.vault.adapter.exists(rssFolder))) {
               await this.plugin.app.vault.createFolder(rssFolder);
               this.logService.info('Dossier RSS recréé:', { folder: rssFolder });
            }

            // Vérifier et recréer les dossiers des groupes
            for (const group of this.settings.groups) {
               const sanitizedGroup = this.sanitizeFileName(group);
               const groupPath = `${rssFolder}/${sanitizedGroup}`;
               if (!(await this.plugin.app.vault.adapter.exists(groupPath))) {
                  await this.plugin.app.vault.createFolder(groupPath);
                  this.logService.info('Dossier de groupe recréé:', { folder: groupPath });
               }
            }

            // Vérifier et recréer les dossiers des feeds
            if (savedData?.feeds) {
               for (const feed of savedData.feeds) {
                  const sanitizedTitle = this.sanitizeFileName(feed.settings.title);
                  const sanitizedGroup = feed.settings.group ? this.sanitizeFileName(feed.settings.group) : '';
                  
                  if (feed.settings.type === 'multiple') {
                     const feedPath = sanitizedGroup 
                        ? `${rssFolder}/${sanitizedGroup}/${sanitizedTitle}` 
                        : `${rssFolder}/${sanitizedTitle}`;
                     if (!(await this.plugin.app.vault.adapter.exists(feedPath))) {
                        await this.plugin.app.vault.createFolder(feedPath);
                        this.logService.info('Dossier de feed recréé:', { folder: feedPath });
                     }
                  } else {
                     // Pour les feeds en mode single, vérifier le fichier unique
                     const filePath = sanitizedGroup 
                        ? `${rssFolder}/${sanitizedGroup}/${sanitizedTitle}.md` 
                        : `${rssFolder}/${sanitizedTitle}.md`;
                     if (!(await this.plugin.app.vault.adapter.exists(filePath))) {
                        await this.plugin.app.vault.create(filePath, `# ${feed.settings.title}\n\n`);
                        this.logService.info('Fichier de feed recréé:', { file: filePath });
                     }
                  }
               }
            }
         }

         // Mise à jour du mode lecture si nécessaire
         if (this.settings.readingMode && this.onReadingModeChange) {
               await this.onReadingModeChange(true);
         }
      } catch (error) {
         this.logService.error('Erreur lors du chargement des paramètres', { error: error as Error });
         this.settings = { ...DEFAULT_SETTINGS };
      } finally {
         this.isLoading = false;
      }
   }

   async saveSettings(): Promise<void> {
      if (this.isLoading) return;
      
      try {
         this.isLoading = true;
         const data = await this.storageService.loadData();
         
         // Ne sauvegarder que si les paramètres ont changé
         if (JSON.stringify(data.settings) !== JSON.stringify(this.settings)) {
            await this.storageService.saveData({
               feeds: data.feeds,
               settings: this.settings
            });
            this.logService.debug('Paramètres sauvegardés', { settings: this.settings });
         }
      } catch (error) {
         this.logService.error('Erreur lors de la sauvegarde des paramètres', { error: error as Error });
      } finally {
         this.isLoading = false;
      }
   }

   async updateSettings(partialSettings: Partial<PluginSettings>): Promise<void> {
      if (this.isLoading) return;
      
      const oldReadingMode = this.settings.readingMode;
      this.settings = {
         ...this.settings,
         ...partialSettings
      };

      // Si le mode lecture a changé, notifier le handler
      if (this.onReadingModeChange && oldReadingMode !== this.settings.readingMode) {
         await this.onReadingModeChange(this.settings.readingMode);
      }

      await this.saveSettings();
      this.logService.info('Paramètres mis à jour');
   }

   getSettings(): PluginSettings {
      return { ...this.settings };
   }

   getSetting<K extends keyof PluginSettings>(key: K): PluginSettings[K] {
      return this.settings[key];
   }
} 