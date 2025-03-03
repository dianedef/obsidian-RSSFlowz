import { Plugin, Notice } from "obsidian";
import { RSSReaderSettingsTab } from "./ui/SettingsTab";
import { ReadingViewUI, VIEW_TYPE_READING } from "./ui/ReadingViewUI";
import {
	RSSService,
	StorageService,
	SyncService,
	SchedulerService,
	I18nService,
	LogService,
	FileService,
	ReadingService,
	OpmlService,
	SettingsService,
	RegisterStyles,
} from "./services";
import { Feed } from "./types/rss";
import { PluginSettings } from "./types/settings";
import { PluginData } from "./types/pluginData";

interface ServiceStatus {
	isReady: boolean;
	error?: Error;
}

export default class RSSReaderPlugin extends Plugin {
	// Services
	private storageService!: StorageService;
	private logService!: LogService;
	private i18nService!: I18nService;
	fileService!: FileService;
	private rssService!: RSSService;
	private syncService!: SyncService;
	private schedulerService!: SchedulerService;
	private readingService!: ReadingService;
	private opmlService!: OpmlService;
	settingsService!: SettingsService;
	private stylesService!: RegisterStyles;

	// État des services
	private serviceStatus = new Map<string, ServiceStatus>();

	// Méthodes pour la gestion des settings
	async loadData(): Promise<any> {
		return await super.loadData();
	}

	async saveData(data: any): Promise<void> {
		await super.saveData(data);
	}

	private markServiceReady(serviceName: string) {
		this.serviceStatus.set(serviceName, { isReady: true });
		this.logService?.debug(`Service ${serviceName} marqué comme prêt`);
	}

	private isServiceReady(serviceName: string): boolean {
		return this.serviceStatus.get(serviceName)?.isReady ?? false;
	}

	private areBaseServicesReady(): boolean {
		const requiredServices = ['LogService', 'StorageService', 'I18nService', 'FileService'];
		return requiredServices.every(service => this.isServiceReady(service));
	}

	private async initializeBaseServices(): Promise<void> {
		try {
			this.logService = new LogService(console);
			this.markServiceReady('LogService');

			this.storageService = new StorageService(this);
			this.markServiceReady('StorageService');

			this.i18nService = new I18nService(this);
			this.markServiceReady('I18nService');

			this.fileService = new FileService(this);
			this.markServiceReady('FileService');

			this.logService.info('Services de base initialisés avec succès');
		} catch (error) {
			this.logService?.error('Erreur lors de l\'initialisation des services de base', { error: error as Error });
			throw error;
		}
	}

	private async initializeDependentServices(): Promise<void> {
		try {
			this.settingsService = new SettingsService(
				this,
				this.storageService,
				this.logService
			);
			this.markServiceReady('SettingsService');

			this.readingService = new ReadingService(
				this,
				this.storageService,
				this.settingsService,
				this.logService
			);
			this.markServiceReady('ReadingService');

			// Configuration du handler de mode lecture
			this.settingsService.setReadingModeHandler(async (isReading: boolean) => {
				if (!this.isServiceReady('ReadingService')) {
					throw new Error('ReadingService n\'est pas prêt');
				}
				if (isReading) {
					await this.readingService.enterReadingMode();
				} else {
					await this.readingService.exitReadingMode();
				}
			});

			this.rssService = new RSSService(this, this.logService);
			this.markServiceReady('RSSService');

			this.syncService = new SyncService(
				this,
				this.rssService,
				this.storageService,
				this.logService
			);
			this.markServiceReady('SyncService');

			this.schedulerService = new SchedulerService(
				this,
				this.storageService,
				this.syncService,
				this.logService
			);
			this.markServiceReady('SchedulerService');

			this.opmlService = new OpmlService(
				this,
				this.storageService,
				this.logService
			);
			this.markServiceReady('OpmlService');

			this.stylesService = new RegisterStyles(this);
			this.markServiceReady('StylesService');

			this.logService.info('Services dépendants initialisés avec succès');
		} catch (error) {
			this.logService.error('Erreur lors de l\'initialisation des services dépendants', { error: error as Error });
			throw error;
		}
	}

	private async initializeUI(): Promise<void> {
		try {
			// Enregistrer la vue de lecture
			this.registerView(
				VIEW_TYPE_READING,
				(leaf) => new ReadingViewUI(leaf, this.readingService)
			);

			// Enregistrer les styles CSS
			this.stylesService.register();

			// Chargement des paramètres et initialisation des dossiers
			await this.settingsService.loadSettings(true);

			// Ajout des boutons dans la barre d'outils
			this.addRibbonIcon('refresh-cw', this.t('ribbons.refresh.tooltip'), async () => {
				try {
					if (!this.isServiceReady('SyncService')) {
						throw new Error('SyncService n\'est pas prêt');
					}
					await this.syncService.syncAllFeeds();
					this.logService.info(this.t('ribbons.refresh.success'));
				} catch (error) {
					this.logService.error(this.t('ribbons.refresh.error'), { error: error as Error });
				}
			});

			this.addRibbonIcon('book-open', this.t('ribbons.reading.tooltip'), async () => {
				try {
					if (!this.isServiceReady('SettingsService')) {
						throw new Error('SettingsService n\'est pas prêt');
					}
					const settings = this.settingsService.getSettings();
					await this.settingsService.updateSettings({
						readingMode: !settings.readingMode
					});
					this.logService.info(
						settings.readingMode 
							? this.t('ribbons.reading.disabled')
							: this.t('ribbons.reading.enabled')
					);
				} catch (error) {
					this.logService.error(this.t('ribbons.reading.error'), { error: error as Error });
				}
			});

			// Ajout de l'onglet de paramètres
			this.addSettingTab(new RSSReaderSettingsTab(this.app, this));

			this.logService.info('Interface utilisateur initialisée avec succès');
		} catch (error) {
			this.logService.error('Erreur lors de l\'initialisation de l\'interface utilisateur', { error: error as Error });
			throw error;
		}
	}

	private async initializeCommands(): Promise<void> {
		try {
			this.addCommand({
				id: "refresh-feeds",
				name: this.i18nService.t("commands.refresh.name"),
				callback: async () => {
					try {
						if (!this.isServiceReady('SyncService')) {
							throw new Error('SyncService n\'est pas prêt');
						}
						await this.syncService.syncAllFeeds();
						this.logService.info(this.t('commands.refresh.success'));
					} catch (error) {
						this.logService.error(this.t('commands.refresh.error'), { error: error as Error });
					}
				},
			});

			this.addCommand({
				id: "toggle-reading-mode",
				name: this.i18nService.t("commands.reading.toggle"),
				callback: async () => {
					try {
						if (!this.isServiceReady('SettingsService')) {
							throw new Error('SettingsService n\'est pas prêt');
						}
						const settings = this.settingsService.getSettings();
						await this.settingsService.updateSettings({
							readingMode: !settings.readingMode
						});
					} catch (error) {
						this.logService.error(this.t('commands.reading.error'), { error: error as Error });
					}
				},
			});

			this.addCommand({
				id: "mark-current-read",
				name: this.i18nService.t("commands.reading.markRead"),
				checkCallback: (checking: boolean) => {
					if (!this.isServiceReady('ReadingService')) {
						return false;
					}
					const isActive = this.readingService.isActive();
					if (checking) {
						return isActive;
					}
					if (isActive) {
						this.readingService.markCurrentArticleAsRead();
					}
					return false;
				}
			});

			this.addCommand({
				id: "next-article",
				name: this.i18nService.t("commands.reading.next"),
				checkCallback: (checking: boolean) => {
					if (!this.isServiceReady('ReadingService')) {
						return false;
					}
					const isActive = this.readingService.isActive();
					if (checking) {
						return isActive;
					}
					if (isActive) {
						this.readingService.navigateArticles('next');
					}
					return false;
				},
				hotkeys: [{ modifiers: ["Mod"], key: "ArrowRight" }]
			});

			this.addCommand({
				id: "previous-article",
				name: this.i18nService.t("commands.reading.previous"),
				checkCallback: (checking: boolean) => {
					if (!this.isServiceReady('ReadingService')) {
						return false;
					}
					const isActive = this.readingService.isActive();
					if (checking) {
						return isActive;
					}
					if (isActive) {
						this.readingService.navigateArticles('previous');
					}
					return false;
				},
				hotkeys: [{ modifiers: ["Mod"], key: "ArrowLeft" }]
			});

			this.logService.info('Commandes initialisées avec succès');
		} catch (error) {
			this.logService.error('Erreur lors de l\'initialisation des commandes', { error: error as Error });
			throw error;
		}
	}

	private async startAutomaticServices(): Promise<void> {
		try {
			if (!this.isServiceReady('SchedulerService')) {
				throw new Error('SchedulerService n\'est pas prêt');
			}
			await this.schedulerService.startScheduler();
			this.logService.info('Services automatiques démarrés avec succès');
		} catch (error) {
			this.logService.error('Erreur lors du démarrage des services automatiques', { error: error as Error });
			throw error;
		}
	}

	async onload() {
		try {
			// 1. Services de base
			await this.initializeBaseServices();
			
			// 2. Vérification de l'état des services de base
			if (!this.areBaseServicesReady()) {
				throw new Error("Services de base non initialisés");
			}
			
			// 3. Services dépendants
			await this.initializeDependentServices();
			
			// 4. Interface utilisateur
			await this.initializeUI();
			
			// 5. Commandes
			await this.initializeCommands();
			
			// 6. Démarrage des services automatiques
			await this.startAutomaticServices();

			this.logService.info(this.i18nService.t("plugin.loaded"));
		} catch (error) {
			console.error("Erreur lors du chargement du plugin:", error);
			new Notice("Erreur lors du chargement du plugin RSS Reader");
			throw error;
		}
	}

	async onunload() {
		try {
			// Arrêt des services dans l'ordre inverse de leur démarrage
			if (this.isServiceReady('SchedulerService')) {
				await this.schedulerService?.stopScheduler();
			}

			if (this.isServiceReady('ReadingService')) {
				await this.readingService?.cleanup?.();
			}

			if (this.isServiceReady('RSSService')) {
				await this.rssService?.cleanup?.();
			}

			if (this.isServiceReady('StylesService')) {
				this.stylesService?.unregister();
			}

			// Nettoyage des états
			this.serviceStatus.clear();
			
			this.logService?.info(this.i18nService.t("plugin.unloaded"));
		} catch (error) {
			console.error("Erreur lors du déchargement du plugin:", error);
		}
	}

	// Méthodes utilitaires pour la gestion des paramètres
	async updateSettings(partialSettings: Partial<PluginSettings>): Promise<void> {
		if (!this.isServiceReady('SettingsService')) {
			throw new Error('SettingsService n\'est pas prêt');
		}
		await this.settingsService.updateSettings(partialSettings);
		this.logService.info('Paramètres mis à jour');
	}

	// Méthodes utilitaires pour la gestion des flux
	async addFeed(feedData: Feed) {
		if (!this.isServiceReady('SettingsService') || !this.isServiceReady('SchedulerService')) {
			throw new Error('Services requis non prêts');
		}
		const settings = this.settingsService.getSettings();
		settings.feeds.push(feedData);
		await this.settingsService.updateSettings(settings);
		this.schedulerService.scheduleFeed(feedData);
		this.logService.info(
			this.i18nService.t("feeds.added", { url: feedData.settings.url })
		);
	}

	async removeFeed(feedId: string) {
		if (!this.isServiceReady('SettingsService') || !this.isServiceReady('SchedulerService')) {
			throw new Error('Services requis non prêts');
		}

		try {
			const settings = this.settingsService.getSettings();
			const feed = settings.feeds.find((f) => f.id === feedId);
			
			if (feed) {
				// Arrêter la planification avant tout
				this.schedulerService.unscheduleFeed(feedId);

				// Supprimer le dossier du feed si nécessaire
				if (feed.settings.folder) {
					const isRootFolder = feed.settings.folder === settings.rssFolder;
					await this.fileService.removeFolder(feed.settings.folder, isRootFolder);
				}

				// Mettre à jour les paramètres
				settings.feeds = settings.feeds.filter((f) => f.id !== feedId);
				await this.settingsService.updateSettings(settings);

				this.logService.info(
					this.i18nService.t("feeds.removed", { url: feed.settings.url || feedId })
				);

				// Vérifier et recréer le dossier RSS si nécessaire
				await this.fileService.ensureFolder(settings.rssFolder);
			}
		} catch (error) {
			this.logService.error('Erreur lors de la suppression du feed', { error: error as Error });
			throw error;
		}
	}

	async updateFeed(feed: Feed, updates?: Partial<Feed>): Promise<void> {
		const storageData = await this.getData();
		const feedIndex = storageData.feeds.findIndex(f => f.id === feed.id);
		
		if (feedIndex !== -1) {
			storageData.feeds[feedIndex] = {
				...storageData.feeds[feedIndex],
				...updates
			};
			await this.saveData(storageData);
		}
	}

	async deleteFeed(feed: Feed): Promise<void> {
		const storageData = await this.getData();
		const feedIndex = storageData.feeds.findIndex(f => f.id === feed.id);
		
		if (feedIndex !== -1) {
			// Supprimer le dossier du feed si nécessaire
			const settings = this.settingsService.getSettings();
			const feedPath = feed.settings.group 
				? `${settings.rssFolder}/${feed.settings.group}/${feed.settings.title}`
				: `${settings.rssFolder}/${feed.settings.title}`;
			await this.fileService.removeFolder(feedPath);
			
			// Supprimer le feed des données
			storageData.feeds.splice(feedIndex, 1);
			await this.saveData(storageData);
			
			new Notice(this.t('notices.settings.feedDeleted').replace('{title}', feed.settings.title));
		}
	}

	// Méthode utilitaire pour accéder au service de traduction
	t(key: string, vars?: any): string {
		return this.i18nService.t(key, vars);
	}

	// Méthodes pour l'import/export OPML
	async importOpml(content: string) {
		return await this.opmlService.importOpml(content);
	}

	async exportOpml() {
		return await this.opmlService.exportOpml();
	}

	async getData(): Promise<PluginData> {
		const data = await this.loadData() || { feeds: [], settings: this.settingsService.getSettings() };
		return {
			feeds: data.feeds || [],
			settings: data.settings || this.settingsService.getSettings()
		};
	}
}
