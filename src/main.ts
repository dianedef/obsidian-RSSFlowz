import { Plugin } from "obsidian";
import { RSSReaderSettingsTab } from "./ui/SettingsTab";
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
import { FeedData } from "./types";
import { PluginSettings } from "./types/settings";
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
	settingsService: SettingsService;
	private stylesService!: RegisterStyles;

	// Méthodes pour la gestion des settings
	async loadData(): Promise<any> {
		return await super.loadData();
	}

	async saveData(data: any): Promise<void> {
		await super.saveData(data);
	}

	async onload() {
		try {
			// Initialisation des services
			this.logService = new LogService(console);
			this.storageService = new StorageService(this);
			this.i18nService = new I18nService(this);
			this.fileService = new FileService(this);
			this.settingsService = new SettingsService(
				this,
				this.storageService,
				this.logService
			);
			this.readingService = new ReadingService(
				this,
				this.storageService,
				this.settingsService,
				this.logService
			);

			// Connecter le ReadingService au SettingsService après l'initialisation des deux services
			this.settingsService.setReadingModeHandler(async (isReading: boolean) => {
				if (isReading) {
					await this.readingService.enterReadingMode();
				} else {
					await this.readingService.exitReadingMode();
				}
			});

			this.rssService = new RSSService(this, this.logService);
			this.syncService = new SyncService(
				this,
				this.rssService,
				this.storageService,
				this.logService
			);
			this.schedulerService = new SchedulerService(
				this,
				this.storageService,
				this.syncService,
				this.logService
			);
			this.opmlService = new OpmlService(
				this,
				this.storageService,
				this.logService
			);
			this.stylesService = new RegisterStyles(this);

			// Enregistrer les styles CSS
			this.stylesService.register();

			// Chargement des paramètres et initialisation des dossiers
			await this.settingsService.loadSettings();
			await this.fileService.initializeFolders(
				this.settingsService.getSettings().rssFolder,
				this.settingsService.getSettings().groups || []
			);

			// Ajout des boutons dans la barre d'outils
			this.addRibbonIcon('refresh-cw', this.t('ribbons.refresh.tooltip'), async () => {
				try {
					await this.syncService.syncAllFeeds();
					this.logService.info(this.t('ribbons.refresh.success'));
				} catch (error) {
					this.logService.error(this.t('ribbons.refresh.error'), { error: error as Error });
				}
			});

			this.addRibbonIcon('book-open', this.t('ribbons.reading.tooltip'), async () => {
				try {
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

			// Démarrage du planificateur
			await this.schedulerService.startScheduler();

			// Commandes
			this.addCommand({
				id: "refresh-feeds",
				name: this.i18nService.t("commands.refresh.name"),
				callback: async () => {
					try {
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

			this.logService.info(this.i18nService.t("plugin.loaded"));
		} catch (error) {
			console.error("Erreur lors du chargement du plugin:", { error: error as Error });
			throw error;
		}
	}

	async onunload() {
		await this.schedulerService.stopScheduler();
		this.stylesService.unregister();
		this.logService.info(this.i18nService.t("plugin.unloaded"));
	}

	// Méthodes utilitaires pour la gestion des paramètres
	async updateSettings(partialSettings: Partial<PluginSettings>): Promise<void> {
		this.settingsService.updateSettings(partialSettings);
		this.logService.info('Paramètres mis à jour');
	}

	// Méthodes utilitaires pour la gestion des flux
	async addFeed(feedData: FeedData) {
		const settings = this.settingsService.getSettings();
		settings.feeds.push(feedData);
		await this.settingsService.updateSettings(settings);
		this.schedulerService.scheduleFeed(feedData);
		this.logService.info(
			this.i18nService.t("feeds.added", { url: feedData.settings.url })
		);
	}

	async removeFeed(feedId: string) {
		const settings = this.settingsService.getSettings();
		const feed = settings.feeds.find((f) => f.id === feedId);
		if (feed) {
			settings.feeds = settings.feeds.filter((f) => f.id !== feedId);
			await this.settingsService.updateSettings(settings);
			this.schedulerService.unscheduleFeed(feedId);
			await this.fileService.removeFolder(feed.settings.folder);
			this.logService.info(
				this.i18nService.t("feeds.removed", { url: feed.settings.url })
			);
		}
	}

	async updateFeed(feedData: FeedData) {
		const settings = this.settingsService.getSettings();
		const index = settings.feeds.findIndex((f) => f.id === feedData.id);
		if (index !== -1) {
			settings.feeds[index] = feedData;
			await this.settingsService.updateSettings(settings);
			this.schedulerService.scheduleFeed(feedData);
			this.logService.info(
				this.i18nService.t("feeds.updated", { url: feedData.settings.url })
			);
		}
	}

	// Méthode utilitaire pour accéder au service de traduction
	t(key: string, params: Record<string, string> = {}): string {
		return this.i18nService.t(key, params);
	}
}
