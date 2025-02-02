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

   async loadSettings(): Promise<void> {
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