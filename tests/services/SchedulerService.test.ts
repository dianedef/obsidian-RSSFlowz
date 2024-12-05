import { describe, it, expect, vi, beforeEach } from "vitest";
import { SchedulerService } from "../../src/services/SchedulerService";
import { StorageService } from "../../src/services/StorageService";
import { SyncService } from "../../src/services/SyncService";
import { LogService } from "../../src/services/LogService";
import { FeedData, FeedSettings } from "../../src/types";

describe("SchedulerService", () => {
	let service: SchedulerService;
	let mockStorageService: {
		loadData: ReturnType<typeof vi.fn>;
		saveData: ReturnType<typeof vi.fn>;
	};
	let mockSyncService: { syncFeed: ReturnType<typeof vi.fn> };
	let mockLogService: LogService;
	let mockPlugin: any;

	const defaultData = {
		feeds: [
			{
				id: "feed1",
				settings: {
					url: "https://example.com/feed1",
					folder: "RSS/feed1",
					filterDuplicates: true,
				},
			},
			{
				id: "feed2",
				settings: {
					url: "https://example.com/feed2",
					folder: "RSS/feed2",
					filterDuplicates: true,
				},
			},
		],
		settings: {
			defaultUpdateInterval: 30,
			defaultFolder: "RSS",
			maxItemsPerFeed: 50,
		},
	};

	beforeEach(() => {
		vi.useFakeTimers();

		mockStorageService = {
			loadData: vi.fn().mockResolvedValue(defaultData),
			saveData: vi.fn(),
		};

		mockSyncService = {
			syncFeed: vi.fn().mockImplementation(() => Promise.resolve()),
		};

		mockLogService = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		} as unknown as LogService;

		mockPlugin = {
			app: {},
		};

		service = new SchedulerService(
			mockPlugin,
			mockStorageService as unknown as StorageService,
			mockSyncService as unknown as SyncService,
			mockLogService
		);
	});

	describe("startScheduler", () => {
		it("devrait démarrer le planificateur", async () => {
			await service.startScheduler();

			// Vérifier que les feeds sont planifiés
			vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
			expect(mockSyncService.syncFeed).toHaveBeenCalledTimes(2);
			expect(mockLogService.info).toHaveBeenCalledWith("Planificateur démarré");
		});

		it("devrait gérer les erreurs de démarrage", async () => {
			const error = new Error("Test error");
			mockStorageService.loadData.mockRejectedValueOnce(error);

			await expect(service.startScheduler()).rejects.toThrow(error);
			expect(mockLogService.error).toHaveBeenCalledWith(
				"Erreur lors du démarrage du planificateur",
				expect.objectContaining({ error })
			);
		});
	});

	describe("stopScheduler", () => {
		it("devrait arrêter le planificateur", async () => {
			await service.startScheduler();
			await service.stopScheduler();

			vi.advanceTimersByTime(30 * 60 * 1000);
			expect(mockSyncService.syncFeed).not.toHaveBeenCalled();
			expect(mockLogService.info).toHaveBeenCalledWith("Planificateur arrêté");
		});
	});

	describe("scheduleFeed", () => {
		it("devrait planifier un feed", async () => {
			const feed: FeedData = defaultData.feeds[0];
			await service.scheduleFeed(feed);

			vi.advanceTimersByTime(30 * 60 * 1000);
			expect(mockSyncService.syncFeed).toHaveBeenCalledWith(feed);
			expect(mockLogService.info).toHaveBeenCalledWith(
				"Feed planifié",
				expect.objectContaining({
					feed: feed.id,
					url: feed.settings.url,
					interval: 30,
				})
			);
		});

		it("devrait gérer les erreurs de synchronisation", async () => {
			const feed: FeedData = defaultData.feeds[0];
			const error = new Error("Sync error");

			// Configurer le mock pour rejeter la première fois
			mockSyncService.syncFeed.mockImplementationOnce(() =>
				Promise.reject(error)
			);

			// Créer un intervalle court pour le test
			const testData = {
				...defaultData,
				settings: {
					...defaultData.settings,
					defaultUpdateInterval: 0.001, // 1ms
				},
			};
			mockStorageService.loadData.mockResolvedValueOnce(testData);

			await service.scheduleFeed(feed);

			// Attendre que le premier intervalle se déclenche
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Arrêter tous les timers
			vi.clearAllTimers();

			expect(mockLogService.error).toHaveBeenCalledWith(
				"Erreur lors de la synchronisation planifiée",
				expect.objectContaining({
					feed: feed.id,
					error,
				})
			);

			// Nettoyer l'intervalle
			service.unscheduleFeed(feed.id);
		});
	});

	describe("unscheduleFeed", () => {
		it("devrait déplanifier un feed", async () => {
			const feed: FeedData = defaultData.feeds[0];
			await service.scheduleFeed(feed);
			service.unscheduleFeed(feed.id);

			vi.advanceTimersByTime(30 * 60 * 1000);
			expect(mockSyncService.syncFeed).not.toHaveBeenCalled();
			expect(mockLogService.info).toHaveBeenCalledWith(
				"Feed déplanifié",
				expect.objectContaining({ feed: feed.id })
			);
		});
	});
});
