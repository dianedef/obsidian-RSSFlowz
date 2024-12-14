import { Plugin, App } from "obsidian";
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
} from "./services";
import { PluginSettings, FeedData } from "./types";
import { DEFAULT_SETTINGS } from "./types/settings";

export default class RSSReaderPlugin extends Plugin {
	settings!: PluginSettings;

	// Services
	private storageService!: StorageService;
	private logService!: LogService;
	private i18nService!: I18nService;
	private fileService!: FileService;
	private rssService!: RSSService;
	private syncService!: SyncService;
	private schedulerService!: SchedulerService;
	private readingService!: ReadingService;
	private opmlService!: OpmlService;

	async onload() {
		try {
			// Initialisation des services
			this.logService = new LogService(console);
			this.storageService = new StorageService(this);
			this.i18nService = new I18nService(this);
			this.fileService = new FileService(this);
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
			this.readingService = new ReadingService(
				this,
				this.storageService,
				this.logService
			);
			this.opmlService = new OpmlService(
				this,
				this.storageService,
				this.logService
			);

			// Chargement des paramètres
			await this.loadSettings();

			// Ajout de l'onglet de paramètres
			this.addSettingTab(new RSSReaderSettingsTab(this.app, this));

			// Démarrage du planificateur
			await this.schedulerService.startScheduler();

			// Commandes
			this.addCommand({
				id: "refresh-feeds",
				name: this.i18nService.t("commands.refresh.name"),
				callback: async () => {
					this.logService.info(this.i18nService.t("commands.refresh.start"));
					const data = await this.storageService.loadData();
					for (const feed of data.feeds) {
						await this.syncService.syncFeed(feed).catch((error) => {
							this.logService.error(
								this.i18nService.t("commands.refresh.error", {
									url: feed.settings.url,
								}),
								error
							);
						});
					}
					this.logService.info(this.i18nService.t("commands.refresh.complete"));
				},
			});

			this.addCommand({
				id: "import-opml",
				name: this.i18nService.t("commands.import.name"),
				callback: async () => {
					// TODO: Ajouter l'interface utilisateur pour l'import OPML
				},
			});

			this.addCommand({
				id: "export-opml",
				name: this.i18nService.t("commands.export.name"),
				callback: async () => {
					try {
						const opml = await this.opmlService.exportOpml();
						const path = "RSS/export.opml";
						await this.app.vault.create(path, opml);
						this.logService.info(
							this.i18nService.t("commands.export.success", { path })
						);
					} catch (error) {
						this.logService.error(
							this.i18nService.t("commands.export.error"),
							error as Error
						);
					}
				},
			});

			this.addCommand({
				id: "toggle-reading-mode",
				name: this.i18nService.t("commands.reading.toggle"),
				callback: () => {
					if (this.readingService.isActive()) {
						this.readingService.exitReadingMode();
					} else {
						this.readingService.enterReadingMode();
					}
				},
			});

			this.logService.info(this.i18nService.t("plugin.loaded"));
		} catch (error) {
			console.error("Erreur lors du chargement du plugin:", error);
			throw error;
		}
	}

	async onunload() {
		await this.schedulerService.stopScheduler();
		this.logService.info(this.i18nService.t("plugin.unloaded"));
	}

	async loadSettings(): Promise<void> {
		try {
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
			if (this.settings.readingMode) {
				await this.readingService.enterReadingMode();
			}

			// Sauvegarder les paramètres fusionnés
			await this.saveSettings();
		} catch (error) {
			this.logService.error('Erreur lors du chargement des paramètres', { error: error as Error });
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings(): Promise<void> {
		try {
			const data = await this.storageService.loadData();
			data.settings = this.settings;
			await this.storageService.saveData(data);
			this.logService.debug('Paramètres sauvegardés', { settings: this.settings });
		} catch (error) {
			this.logService.error('Erreur lors de la sauvegarde des paramètres', { error: error as Error });
		}
	}

	// Méthodes utilitaires pour la gestion des paramètres
	async updateSettings(partialSettings: Partial<PluginSettings>): Promise<void> {
		this.settings = {
			...this.settings,
			...partialSettings
		};
		await this.saveSettings();
		this.logService.info('Paramètres mis à jour');
	}

	// Méthodes utilitaires pour la gestion des flux
	async addFeed(feedData: FeedData) {
		const data = await this.storageService.loadData();
		data.feeds.push(feedData);
		await this.storageService.saveData(data);
		this.schedulerService.scheduleFeed(feedData);
		this.logService.info(
			this.i18nService.t("feeds.added", { url: feedData.settings.url })
		);
	}

	async removeFeed(feedId: string) {
		const data = await this.storageService.loadData();
		const feed = data.feeds.find((f) => f.id === feedId);
		if (feed) {
			data.feeds = data.feeds.filter((f) => f.id !== feedId);
			await this.storageService.saveData(data);
			this.schedulerService.unscheduleFeed(feedId);
			await this.fileService.removeFolder(feed.settings.folder);
			this.logService.info(
				this.i18nService.t("feeds.removed", { url: feed.settings.url })
			);
		}
	}

	async updateFeed(feedData: FeedData) {
		const data = await this.storageService.loadData();
		const index = data.feeds.findIndex((f) => f.id === feedData.id);
		if (index !== -1) {
			data.feeds[index] = feedData;
			await this.storageService.saveData(data);
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
