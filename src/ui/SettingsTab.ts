import { 
  App, 
  PluginSettingTab, 
  Setting, 
  TextComponent, 
  TextAreaComponent, 
  Notice, 
  Modal, 
  requestUrl as _requestUrl, 
  DropdownComponent, 
  ButtonComponent 
} from 'obsidian';
import RSSReaderPlugin from '../main';
import { Feed } from '../types/rss';
import { StorageData } from '../types';
import { FetchFrequency as _FetchFrequency, DigestMode } from '../types/settings';

/**
 * Settings UI for RSS Reader plugin
 * 
 * Sections:
 * 1. General settings (template, folder, API keys)
 * 2. Sync settings (frequency, retention, limits)
 * 3. Digest settings (daily/weekly summaries)
 * 4. Import/Export (OPML)
 * 5. Feed management (add, edit, delete)
 * 
 * Design patterns:
 * - Reactive updates: Settings saved immediately on change
 * - Defensive rendering: Check isDisplaying to prevent duplicate renders
 * - State reload: Force fresh data from storage on display
 * 
 * Why reload on display?
 * - Settings might be modified externally (data.json edited)
 * - Other parts of plugin might update settings
 * - Ensures UI shows current state
 */
export class RSSReaderSettingsTab extends PluginSettingTab {
  // Prevents duplicate render if display() called multiple times
  private isDisplaying = false;
  private searchInput: TextComponent;
  private filterAndDisplayFeeds: (searchTerm?: string) => Promise<void>;

  constructor(
    app: App,
    private plugin: RSSReaderPlugin
  ) {
    super(app, plugin)
  }

  /**
   * Render settings UI
   * 
   * Rendering strategy:
   * 1. Clear container (remove old UI)
   * 2. Reload data (ensure fresh state)
   * 3. Build UI sections
   * 4. Set isDisplaying flag
   * 
   * Re-entrant protection: isDisplaying prevents overlapping renders
   * This can happen if user switches tabs quickly
   */
  async display(): Promise<void> {
    if (this.isDisplaying) {
      return;  // Prevent re-entrant calls
    }
    this.isDisplaying = true;

    try {
      const { containerEl } = this

      // Clear existing UI elements
      containerEl.empty();

      // Reload settings from storage (defensive: ensure UI matches disk)
      await this.plugin.settingsService.loadSettings(false);
      
      // Get current settings
      const settings = this.plugin.settingsService.getSettings()
      
      // Create scoped container to avoid CSS conflicts
      const mainContainer = containerEl.createDiv('rssflowz-settings-container');
      
      mainContainer.createEl('h1', {text: this.plugin.t('settings.title')})

      // Note template setting
      // Supports template variables: {{title}}, {{description}}, {{link}}, {{pubDate}}
      // Applied when creating markdown files from RSS articles
      new Setting(mainContainer)
        .setName('Template des notes')
        .setDesc('Template pour la création des notes (utilise {{title}}, {{description}}, {{link}}, {{pubDate}})')
        .addTextArea((text: TextAreaComponent) => text
          .setPlaceholder('# {{title}}\n\n{{description}}\n\n{{link}}')
          .setValue(settings.template)
          .onChange(async (value: string) => {
            await this.plugin.settingsService.updateSettings({ template: value })
          }))

      // OpenAI Key
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.openaiKey.name'))
        .setDesc(this.plugin.t('settings.openaiKey.desc'))
        .addText(text => text
          .setPlaceholder('sk-...')
          .setValue(settings.openaiKey)
          .onChange(async (value: string) => {
            await this.plugin.settingsService.updateSettings({ openaiKey: value })
          }))

      // RSS folder setting
      // When changed, recreates folder structure to match new location
      // Important: Doesn't move existing files (user must do manually)
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.rssFolder.name'))
        .setDesc(this.plugin.t('settings.rssFolder.desc'))
        .addText(text => text
          .setValue(settings.rssFolder)
          .onChange(async (value: string) => {
            await this.plugin.settingsService.updateSettings({ rssFolder: value });
            // Recreate folder structure in new location
            await this.plugin.fileService.initializeFolders(value, settings.groups);
            new Notice(this.plugin.t('settings.rssFolder.updated'));
          }));

// Fréquence de fetch
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.fetchFrequency.name'))
        .setDesc(this.plugin.t('settings.fetchFrequency.desc'))
        .addDropdown((dropdown: DropdownComponent) => {
          dropdown.addOption('startup', this.plugin.t('settings.fetchFrequency.options.startup'))
          dropdown.addOption('daily', this.plugin.t('settings.fetchFrequency.options.daily'))
          dropdown.addOption('hourly', this.plugin.t('settings.fetchFrequency.options.hourly'))
          dropdown.setValue(settings.fetchFrequency)
            .onChange(async (value: _FetchFrequency) => {
              await this.plugin.settingsService.updateSettings({ fetchFrequency: value })
            })
        })

      // Max articles per feed
      // Limits number of articles fetched per sync to prevent vault bloat
      // Validation: Must be positive integer
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.maxArticles.name'))
        .setDesc(this.plugin.t('settings.maxArticles.desc'))
        .addText(text => text
          .setValue(String(settings.maxArticles))
          .onChange(async (value: string) => {
            const numValue = parseInt(value)
            // Validate: positive integer only
            if (!isNaN(numValue) && numValue > 0) {
              await this.plugin.settingsService.updateSettings({ maxArticles: numValue })
            }
          }))

      // Retention period (days)
      // Articles older than this are automatically deleted during sync
      // Set to 0 to disable automatic cleanup
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.retentionDays.name'))
        .setDesc(this.plugin.t('settings.retentionDays.desc'))
        .addText(text => text
          .setValue(String(settings.retentionDays))
          .onChange(async (value: string) => {
            const numValue = parseInt(value)
            // Validate: positive integer only
            if (!isNaN(numValue) && numValue > 0) {
              await this.plugin.settingsService.updateSettings({ retentionDays: numValue })
            }
          }))



// Section Digest
      mainContainer.createEl('h2', {text: 'Digest'})

      // Activer/désactiver le digest
      new Setting(mainContainer)
        .setName('Activer le digest')
        .setDesc('Créer un résumé périodique de tous vos articles')
        .addToggle(toggle => toggle
          .setValue(settings.digest.enabled)
          .onChange(async (value) => {
            settings.digest.enabled = value;
            await this.plugin.settingsService.updateSettings(settings);
          }));

      // Mode du digest
      new Setting(mainContainer)
        .setName('Mode du digest')
        .setDesc('Fréquence de création du digest')
        .addDropdown(dropdown => {
          dropdown
            .addOption('disabled', 'Désactivé')
            .addOption('daily', 'Quotidien')
            .addOption('weekly', 'Hebdomadaire')
            .setValue(settings.digest.mode)
            .onChange(async (value: DigestMode) => {
              settings.digest.mode = value;
              await this.plugin.settingsService.updateSettings(settings);
            });
        });

      // Template du digest
      new Setting(mainContainer)
        .setName('Template du digest')
        .setDesc('Template pour la création du digest (utilise {{date}}, {{articles}})')
        .addTextArea((text: TextAreaComponent) => text
          .setPlaceholder('# Digest du {{date}}\n\n{{articles}}')
          .setValue(settings.digest.template)
          .onChange(async (value) => {
            settings.digest.template = value;
            await this.plugin.settingsService.updateSettings(settings);
          }));

      // Dossier du digest
      new Setting(mainContainer)
        .setName('Dossier du digest')
        .setDesc('Dossier où seront créés les digests')
        .addText(text => text
          .setValue(settings.digest.folderPath)
          .onChange(async (value) => {
            settings.digest.folderPath = value;
            await this.plugin.settingsService.updateSettings(settings);
          }));

// Section Import/Export
      mainContainer.createEl('h2', {text: this.plugin.t('settings.importExport.title')})

      // Import OPML
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.importExport.opmlImport.name'))
        .setDesc(this.plugin.t('settings.importExport.opmlImport.desc'))
        .addButton((button: ButtonComponent) => {
          const handleImport = async (file: File) => {
            const loadingNotice = new Notice(this.plugin.t('settings.importExport.opmlImport.loading'), 0);
            try {
              const content = await file.text();
              const result = await this.plugin.importOpml(content);
              loadingNotice.hide();
              
              if (result.success) {
                // Recharger les paramètres depuis le stockage
                await this.plugin.settingsService.loadSettings();
                // Rafraîchir l'affichage avec les nouvelles données
                this.display();
                new Notice(this.plugin.t('settings.importExport.opmlImport.success'));
              } else {
                new Notice(
                  `${this.plugin.t('settings.importExport.opmlImport.partial')}\n` +
                  `Importés: ${result.imported}, Erreurs: ${result.errors.length}, Doublons: ${result.duplicates.length}`
                );
              }
            } catch (error) {
              loadingNotice.hide();
              new Notice(this.plugin.t('settings.importExport.opmlImport.error'));
              console.error('Erreur lors de l\'import OPML:', error);
            }
          };

          button
            .setButtonText(this.plugin.t('settings.importExport.opmlImport.button'))
            .onClick(() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.opml,.xml';
              input.style.display = 'none';
              
              input.onchange = async (e: Event) => {
                const target = e.target as HTMLInputElement;
                if (target.files?.length) {
                  await handleImport(target.files[0]);
                  input.value = '';
                }
              };
              
              input.click();
            });
          return button;
        });

      // Export OPML
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.importExport.opmlExport.name'))
        .setDesc(this.plugin.t('settings.importExport.opmlExport.desc'))
        .addButton((button: ButtonComponent) => {
          button
            .setButtonText(this.plugin.t('settings.importExport.opmlExport.button'))
            .onClick(async () => {
              const loadingNotice = new Notice(this.plugin.t('settings.importExport.opmlExport.loading'), 0);
              try {
                await this.plugin.exportOpml();
                loadingNotice.hide();
                new Notice(this.plugin.t('settings.importExport.opmlExport.success'));
              } catch (error) {
                loadingNotice.hide();
                new Notice(this.plugin.t('settings.importExport.opmlExport.error'));
                console.error('Erreur lors de l\'export OPML:', error);
              }
            });
          return button;
        });

      // Import JSON
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.importExport.jsonImport.name'))
        .setDesc(this.plugin.t('settings.importExport.jsonImport.desc'))
        .addButton((button: ButtonComponent) => {
          button
            .setButtonText(this.plugin.t('settings.importExport.jsonImport.button'))
            .onClick(() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json'
              input.style.display = 'none'
              mainContainer.appendChild(input)

              input.onchange = async (e: Event) => {
                const target = e.target as HTMLInputElement
                if (!target.files?.length) return

                const loadingNotice = new Notice(this.plugin.t('settings.importExport.jsonImport.loading'), 0)

                try {
                  const file = target.files[0]
                  const reader = new FileReader()

                  reader.onload = async (event: ProgressEvent<FileReader>) => {
                    try {
                      if (event.target?.result) {
                        const config = JSON.parse(event.target.result as string);

                        // Vérifier que le fichier contient les champs essentiels
                        if (!config.feeds || !Array.isArray(config.groups)) {
                          new Notice(this.plugin.t('settings.importExport.jsonImport.error'));
                          return;
                        }

                        // Créer une sauvegarde de la configuration actuelle
                        const backup = await this.plugin.settingsService.getSettings();
                        const backupJson = JSON.stringify(backup, null, 2);
                        const backupBlob = new Blob([backupJson], { type: 'application/json' });
                        const backupUrl = window.URL.createObjectURL(backupBlob);
                        const backupA = document.createElement('a');
                        backupA.href = backupUrl;
                        backupA.download = 'rss-reader-config-backup.json';
                        backupA.click();
                        window.URL.revokeObjectURL(backupUrl);

                        // Appliquer la nouvelle configuration
                        await this.plugin.settingsService.updateSettings(config.settings);

                        // Recréer les dossiers nécessaires
                        const settings = this.plugin.settingsService.getSettings();
                        await this.plugin.fileService.initializeFolders(settings.rssFolder, settings.groups || []);

                        // Recréer les dossiers pour chaque feed non-unique
                        const storageData = await this.plugin.getData();
                        for (const feed of storageData.feeds) {
                          if (feed.settings.type === 'multiple') {
                            const feedPath = feed.settings.group 
                              ? `${settings.rssFolder}/${feed.settings.group}/${feed.settings.title}` 
                              : `${settings.rssFolder}/${feed.settings.title}`;
                            await this.plugin.fileService.ensureFolder(feedPath);
                          }
                        }

                        new Notice(this.plugin.t('settings.importExport.jsonImport.success') + '\nUne sauvegarde a été créée');

                        // Recharger l'interface des paramètres
                        this.display();
                      }
                    } catch (error) {
                      console.error('Erreur lors du parsing:', error);
                      new Notice(this.plugin.t('settings.importExport.jsonImport.error'));
                    }
                  }

                  reader.readAsText(file)
                } catch (error) {
                  loadingNotice.hide()
                  new Notice(this.plugin.t('settings.importExport.jsonImport.error'))
                  console.error(error)
                } finally {
                  input.value = ''
                }
              }

              input.click()
            })

          return button
        })

      // Export JSON
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.importExport.jsonExport.name'))
        .setDesc(this.plugin.t('settings.importExport.jsonExport.desc'))
        .addButton((button: ButtonComponent) => button
          .setButtonText(this.plugin.t('settings.importExport.jsonExport.button'))
          .onClick(async () => {
            const loadingNotice = new Notice(this.plugin.t('settings.importExport.jsonExport.loading'), 0)
            try {
              const data = await this.plugin.loadData()
              const jsonString = JSON.stringify(data, null, 2)

              const blob = new Blob([jsonString], { type: 'application/json' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'rss-flowz-config.json'
              a.click()
              window.URL.revokeObjectURL(url)

              loadingNotice.hide()
              new Notice(this.plugin.t('settings.importExport.jsonExport.success'))
            } catch (error) {
              loadingNotice.hide()
              new Notice(this.plugin.t('settings.importExport.jsonExport.error'))
              console.error(error)
            }
          }))

      mainContainer.createEl('hr')

// Section de gestion des groupes
      mainContainer.createEl('h2', {text: this.plugin.t('settings.groups.title')})

      // Afficher les groupes existants
      settings.groups.forEach((group: string, index: number) => {
        if (group !== 'Sans groupe') {
          new Setting(mainContainer)
            .setName(group)
            .addButton((button: ButtonComponent) => button
              .setButtonText(this.plugin.t('settings.groups.delete.button'))
              .setWarning()
              .onClick(async () => {
                const confirmation = await this.confirmDelete(group, true);
                if (confirmation) {
                  try {
                    const storageData = await this.plugin.loadData() as StorageData;
                    const groupPath = `${settings.rssFolder}/${group}`;

                    // Déplacer les feeds de ce groupe vers "Sans groupe"
                    for (const feed of storageData.feeds) {
                      if (feed.settings.group === group) {
                        feed.settings.group = '';
                        // Recréer le dossier du feed à la racine si nécessaire
                        const newPath = `${settings.rssFolder}/${feed.settings.title}`;
                        await this.plugin.fileService.ensureFolder(newPath);
                      }
                    }

                    // Supprimer le dossier du groupe
                    await this.plugin.fileService.removeFolder(groupPath);

                    // Mettre à jour les paramètres
                    settings.groups = settings.groups.filter(g => g !== group);
                    await this.plugin.settingsService.updateSettings(settings);
                    await this.plugin.saveData(storageData);

                    // Rafraîchir l'affichage
                    this.display();
                    new Notice(this.plugin.t('settings.groups.delete.success').replace('{group}', group));
                  } catch (error) {
                    console.error(`Erreur lors de la suppression du groupe: ${group}`, error);
                    new Notice(this.plugin.t('settings.groups.delete.error'));
                  }
                }
              }))
        }
      })

      // Ajouter un nouveau groupe
      let inputText = '';
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.groups.add.name'))
        .setDesc(this.plugin.t('settings.groups.add.desc'))
        .addText(text => text
          .setPlaceholder(this.plugin.t('settings.groups.add.placeholder'))
          .setValue('')
          .onChange((value: string) => {
            inputText = value;
          })
          .inputEl.addEventListener('keypress', async (e: KeyboardEvent) => {
            if (e.key === 'Enter' && inputText.trim()) {
              const groupName = inputText.trim();
              const currentSettings = this.plugin.settingsService.getSettings();
              if (!currentSettings.groups.includes(groupName)) {
                // Créer le dossier pour le nouveau groupe
                await this.plugin.fileService.ensureFolder(`${currentSettings.rssFolder}/${groupName}`);
                
                // Ajouter le groupe aux paramètres
                currentSettings.groups.push(groupName);
                await this.plugin.settingsService.updateSettings(currentSettings);
                new Notice(this.plugin.t('settings.groups.add.success') + ` : ${groupName}`);
                this.display();
              } else {
                new Notice(this.plugin.t('settings.groups.add.error'));
              }
            }
          }));

      mainContainer.createEl('hr');
      mainContainer.createEl('h2', {text: this.plugin.t('settings.feeds.title')});

// Barre de recherche pour les feeds
      const searchContainer = mainContainer.createDiv('rssflowz-search-container');
      this.searchInput = new TextComponent(searchContainer)
        .setPlaceholder(this.plugin.t('settings.feeds.search.placeholder'));

// Container pour tous les feeds
      const feedsContainer = mainContainer.createDiv('rssflowz-feeds-container');
      
      // Définir la fonction de filtrage
      this.filterAndDisplayFeeds = async (searchTerm = '') => {
        const feedsContainer = mainContainer.querySelector('.rssflowz-feeds-container');
        if (feedsContainer) {
          feedsContainer.remove();
        }

        const storageData = await this.plugin.getData();
        const filteredFeeds = storageData.feeds.filter((feed: Feed) => {
          const title = feed.settings?.title || '';
          const url = feed.settings?.url || '';
          return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 url.toLowerCase().includes(searchTerm.toLowerCase());
        });

        const container = mainContainer.createDiv('rssflowz-feeds-container');
        await this.displayFeeds(container, filteredFeeds);
      };

      // Initialiser l'affichage et configurer la recherche
      this.searchInput.onChange(() => {
        this.filterAndDisplayFeeds(this.searchInput.getValue());
      });
      await this.filterAndDisplayFeeds();

      // Bouton d'ajout de feed
      new Setting(mainContainer)
        .setName(this.plugin.t('settings.feeds.add.name'))
        .setDesc(this.plugin.t('settings.feeds.add.desc'))
        .addText(text => text
          .setPlaceholder(this.plugin.t('settings.feeds.add.placeholder'))
          .onChange(async (value: string) => {
            if (value) {
              try {
                const response = await _requestUrl({
                  url: value,
                  headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/atom+xml,application/xml,text/xml,*/*'
                  }
                });

                const parser = new DOMParser();
                const doc = parser.parseFromString(response.text, 'text/xml');

                // Vérifier si c'est un feed valide
                const isAtom = !!doc.querySelector('feed');
                const isRss = !!doc.querySelector('rss, channel');

                if (!isAtom && !isRss) {
                  new Notice(this.plugin.t('settings.feeds.add.error'));
                  return;
                }

                const title = doc.querySelector('channel > title, feed > title')?.textContent || 'Nouveau feed';

                // Créer le nouveau feed
                const feedData: Feed = {
                  id: Date.now().toString(),
                  settings: {
                    title: title,
                    description: title,
                    url: value,
                    type: 'multiple' as const,
                    status: 'active' as const,
                    folder: '',
                    summarize: false,
                    transcribe: false,
                    rewrite: false
                  }
                };

                // Ajouter le feed aux settings
                const storageData = await this.plugin.loadData() as StorageData;
                storageData.feeds.push(feedData);
                await this.plugin.saveData(storageData);

                // Fetch immédiatement les articles
                try {
                  new Notice(this.plugin.t('settings.feeds.add.fetching').replace('{title}', title));
                  await this.plugin.addFeed(feedData);
                  new Notice(this.plugin.t('settings.feeds.add.success').replace('{title}', title));
                } catch (fetchError) {
                  console.error('Erreur lors de la récupération des articles:', fetchError);
                  new Notice(this.plugin.t('settings.feeds.add.fetchError').replace('{title}', title));
                }

                // Rafraîchir l'interface
                this.display();
              } catch (error) {
                console.error('Erreur lors de l\'ajout du feed:', error);
                if (error instanceof Error && error.message.includes('CERT_')) {
                  new Notice(this.plugin.t('settings.feeds.add.sslError'));
                } else {
                  new Notice(this.plugin.t('settings.feeds.add.error'));
                }
              }
            }
          }));

      // Ajouter un bouton pour supprimer tous les feeds
      new Setting(mainContainer)
        .addButton((button: ButtonComponent) => button
          .setButtonText(this.plugin.t('settings.feeds.deleteAll.button'))
          .setWarning()
          .onClick(async () => {
            const confirmation = await this.confirmDelete('tous les feeds')
            if (confirmation) {
              try {
                const storageData = await this.plugin.loadData() as StorageData;
                
                // Supprimer les dossiers de chaque feed
                for (const feed of storageData.feeds) {
                  const feedPath = feed.settings.group 
                    ? `${settings.rssFolder}/${feed.settings.group}/${feed.settings.title}`
                    : `${settings.rssFolder}/${feed.settings.title}`;
                  await this.plugin.fileService.removeFolder(feedPath);
                }
                
                // Vider la liste des feeds
                storageData.feeds = [];
                await this.plugin.saveData(storageData);
                
                new Notice(this.plugin.t('settings.feeds.deleteAll.success'));
                this.display();
              } catch (error) {
                console.error('Erreur lors de la suppression des feeds:', error);
                new Notice(this.plugin.t('settings.feeds.deleteAll.error'));
              }
            }
          }));
    } finally {
      this.isDisplaying = false;
    }
  }

  async confirmDelete(name: string, isGroup: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new Modal(this.app);
      modal.titleEl.setText(
        isGroup 
          ? this.plugin.t('settings.groups.delete.confirm')
          : this.plugin.t('settings.feeds.delete.confirm')
      );
      
      modal.contentEl.empty();
      modal.contentEl.createEl("p", { 
        text: isGroup
          ? this.plugin.t('settings.groups.delete.confirmMessage').replace('{group}', name)
          : this.plugin.t('settings.feeds.delete.confirmMessage').replace('{feedTitle}', name)
      });
      
      if (isGroup) {
        modal.contentEl.createEl("p", {
          text: this.plugin.t('settings.groups.delete.warning'),
          cls: 'mod-warning'
        });
      }
      
      new Setting(modal.contentEl)
        .addButton(btn => btn
          .setButtonText(
            isGroup
              ? this.plugin.t('settings.groups.delete.cancel')
              : this.plugin.t('settings.feeds.delete.cancel')
          )
          .onClick(() => {
            modal.close();
            resolve(false);
          }))
        .addButton(btn => btn
          .setButtonText(
            isGroup
              ? this.plugin.t('settings.groups.delete.confirm')
              : this.plugin.t('settings.feeds.delete.confirm')
          )
          .setWarning()
          .onClick(() => {
            modal.close();
            resolve(true);
          })
        );
      
      modal.open();
    });
  }

  async createNewGroup(): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new Modal(this.app)
      modal.titleEl.setText(this.plugin.t('settings.feeds.group.add'))
      
      modal.contentEl.empty()
      const inputContainer = modal.contentEl.createDiv()
      const input = new Setting(inputContainer)
        .setName(this.plugin.t('settings.feeds.group.name'))
        .addText(text => text
          .setPlaceholder(this.plugin.t('settings.feeds.group.placeholder'))
          .setValue("")
        )
      
      new Setting(modal.contentEl)
        .addButton(btn => btn
          .setButtonText(this.plugin.t('settings.feeds.group.cancel'))
          .onClick(() => {
            modal.close()
            resolve(null)
          }))
        .addButton(btn => btn
          .setButtonText(this.plugin.t('settings.feeds.group.create'))
          .setCta()
          .onClick(() => {
            const value = (input.components[0] as TextComponent).getValue().trim();
            if (value) {
              modal.close()
              resolve(value)
            } else {
              new Notice(this.plugin.t('settings.feeds.group.error'))
            }
          }))
      
      modal.open()
    })
  }

  private async displayFeeds(container: HTMLElement, feeds: Feed[]): Promise<void> {
    feeds.forEach(feed => this.createFeedElement(container, feed));
  }

  private async createFeedElement(container: HTMLElement, feed: Feed): Promise<void> {
    const feedContainer = container.createDiv('rssflowz-feed-container');
    const headerContainer = feedContainer.createDiv('rssflowz-feed-header');
    const optionsContainer = feedContainer.createDiv('rssflowz-feed-options');
    optionsContainer.style.display = 'none';

    // Fonction pour basculer l'affichage des options
    const toggleFeed = () => {
      const isVisible = optionsContainer.style.display === 'block';
      optionsContainer.style.display = isVisible ? 'none' : 'block';
    };

    // Créer le conteneur d'info
    const infoContainer = headerContainer.createDiv('rssflowz-feed-info');
    
    // Créer le groupe titre + URL
    const titleGroup = infoContainer.createDiv('rssflowz-feed-title-group');
    const titleEl = titleGroup.createEl('div', { 
      text: feed.settings?.title || 'Sans titre',
      cls: 'rssflowz-feed-title'
    });
    const urlEl = titleGroup.createEl('div', { 
      text: feed.settings?.url || '',
      cls: 'rssflowz-feed-url'
    });

    // Créer le conteneur des contrôles
    const controlsContainer = infoContainer.createDiv('rssflowz-feed-controls');
    await this.createFeedButtons(controlsContainer, feed);

    // Rendre le header cliquable
    headerContainer.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.rssflowz-feed-controls')) {
        toggleFeed();
      }
    });

    // Ajouter les paramètres du feed
    this.createFeedSettings(optionsContainer, feed);
  }

  private async createFeedButtons(buttonContainer: HTMLElement, feed: Feed): Promise<void> {
    // Ajouter le dropdown de groupe
    new Setting(buttonContainer)
      .addDropdown(dropdown => {
        // Ajouter l'option "Sans groupe"
        dropdown.addOption('', this.plugin.t('settings.feeds.group.noGroup'));
        
        // Ajouter tous les groupes existants
        const settings = this.plugin.settingsService.getSettings();
        settings.groups.forEach(group => {
          dropdown.addOption(group, group);
        });

        // Définir la valeur actuelle
        dropdown.setValue(feed.settings?.group || '');

        // Gérer le changement de groupe
        dropdown.onChange(async (value: string) => {
          const updatedFeed = { ...feed, settings: { ...feed.settings, group: value } };
          await this.plugin.updateFeed(updatedFeed);
          new Notice(
            this.plugin.t('settings.feeds.group.success')
              .replace('{title}', feed.settings?.title || 'Sans titre')
              .replace('{group}', value || this.plugin.t('settings.feeds.group.noGroup'))
          );
        });
      });

    // Bouton d'activation/désactivation
    new Setting(buttonContainer)
      .addExtraButton(button => {
        button
          .setIcon(feed.settings?.status === 'active' ? 'check-circle' : 'circle')
          .setTooltip(feed.settings?.status === 'active' ? 'Actif' : 'Pausé')
          .onClick(async () => {
            const newStatus = feed.settings?.status === 'active' ? 'paused' : 'active';
            await this.plugin.updateFeed(feed, { settings: { ...feed.settings, status: newStatus } });
            button.setIcon(newStatus === 'active' ? 'check-circle' : 'circle');
            new Notice(
              this.plugin.t('notices.settings.aiToggled')
                .replace('{feature}', this.plugin.t('settings.feeds.status.name'))
                .replace('{status}', newStatus === 'active' ? '✅' : '❌')
                .replace('{title}', feed.settings?.title || 'Sans titre')
            );
          });
        return button;
      });
  }

  private createFeedSettings(optionsContainer: HTMLElement, feed: Feed): void {
    // Paramètre Réécriture
    const rewriteSetting = new Setting(optionsContainer)
      .setName(this.plugin.t('settings.feeds.rewrite.name'))
      .setDesc(this.plugin.t('settings.feeds.rewrite.desc'));

    rewriteSetting.addToggle(toggle => {
      toggle.setValue(feed.settings?.rewrite || false);
      toggle.onChange(async (value: boolean) => {
        const settings = this.plugin.settingsService.getSettings();
        if (value && !settings.openaiKey) {
          new Notice(this.plugin.t('settings.feeds.rewrite.error'));
          toggle.setValue(false);
          return;
        }
        const updatedFeed = { ...feed, settings: { ...feed.settings, rewrite: value } };
        await this.plugin.updateFeed(updatedFeed);
        new Notice(
          this.plugin.t('notices.settings.aiToggled')
            .replace('{feature}', this.plugin.t('settings.feeds.rewrite.name'))
            .replace('{status}', value ? '✅' : '❌')
            .replace('{title}', feed.settings?.title || 'Sans titre')
        );
      });
    });

    // Paramètre Transcription
    const transcribeSetting = new Setting(optionsContainer)
      .setName(this.plugin.t('settings.feeds.transcribe.name'))
      .setDesc(this.plugin.t('settings.feeds.transcribe.desc'));

    transcribeSetting.addToggle(toggle => {
      toggle.setValue(feed.settings?.transcribe || false);
      toggle.onChange(async (value: boolean) => {
        const settings = this.plugin.settingsService.getSettings();
        if (value && !settings.openaiKey) {
          new Notice(this.plugin.t('settings.feeds.transcribe.error'));
          toggle.setValue(false);
          return;
        }
        const updatedFeed = { ...feed, settings: { ...feed.settings, transcribe: value } };
        await this.plugin.updateFeed(updatedFeed);
        new Notice(
          this.plugin.t('notices.settings.aiToggled')
            .replace('{feature}', this.plugin.t('settings.feeds.transcribe.name'))
            .replace('{status}', value ? '✅' : '❌')
            .replace('{title}', feed.settings?.title || 'Sans titre')
        );
      });
    });

    // Bouton de suppression
    const deleteSetting = new Setting(optionsContainer);
    deleteSetting.addButton(button => {
      button
        .setButtonText(this.plugin.t('settings.feeds.delete.button'))
        .setWarning()
        .onClick(async () => {
          await this.plugin.deleteFeed(feed);
          this.filterAndDisplayFeeds(this.searchInput.getValue());
        });
    });
  }
}
