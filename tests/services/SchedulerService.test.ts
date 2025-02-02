import { describe, it, expect, vi, beforeEach } from "vitest";
import { SchedulerService } from "../../src/services/SchedulerService";
import { StorageService } from "../../src/services/StorageService";
import { SyncService } from "../../src/services/SyncService";
import { LogService } from "../../src/services/LogService";
import { FeedData, FeedSettings } from "../../src/types";
import type { Mock } from 'vitest';

describe("SchedulerService", () => {
	let service: SchedulerService;
	let mockStorageService: { loadData: Mock; saveData: Mock };
	let mockSyncService: { syncFeed: Mock };
	let mockLogService: LogService;
	let mockPlugin: any;

	const defaultData = {
		feeds: [
			{
				id: "feed1",
				settings: {
					url: "https://example.com/feed1",
					folder: "RSS/feed1",
					filterDuplicates: true
				},
			},
			{
				id: "feed2",
				settings: {
					url: "https://example.com/feed2",
					folder: "RSS/feed2",
					filterDuplicates: true
				},
			},
		],
		settings: {
			defaultUpdateInterval: 30,
			defaultFolder: "RSS",
			maxArticles: 50,
		},
	};

	beforeEach(() => {
		vi.useFakeTimers();

		mockStorageService = {
			loadData: vi.fn().mockResolvedValue(defaultData),
			saveData: vi.fn()
		};

		mockSyncService = {
			syncFeed: vi.fn().mockResolvedValue(undefined)
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

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("startScheduler", () => {
		it("devrait démarrer le planificateur", async () => {
			await service.startScheduler();

			// Vérifier que les feeds sont planifiés
			await vi.advanceTimersByTimeAsync(30 * 60 * 1000); // 30 minutes
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

			await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
			expect(mockSyncService.syncFeed).toHaveBeenCalledTimes(0);
			expect(mockLogService.info).toHaveBeenCalledWith("Planificateur arrêté");
		});
	});

	describe("scheduleFeed", () => {
		it("devrait planifier un feed", async () => {
			const feed: FeedData = defaultData.feeds[0];
			await service.scheduleFeed(feed);

			await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
			expect(mockSyncService.syncFeed).toHaveBeenCalledWith(feed);
			expect(mockLogService.info).toHaveBeenCalledWith(
				"Feed planifié",
				expect.objectContaining({
					feed: feed.id,
					url: feed.settings.url,
					interval: 30
				})
			);
		});

		it("devrait gérer les erreurs de synchronisation", async () => {
			const feed: FeedData = defaultData.feeds[0];
			const error = new Error("Sync error");
			mockSyncService.syncFeed.mockRejectedValueOnce(error);

			// Réduire l'intervalle pour le test
			const testData = {
				...defaultData,
				settings: {
					...defaultData.settings,
					defaultUpdateInterval: 1 // 1 minute
				}
			};
			mockStorageService.loadData.mockResolvedValueOnce(testData);

			await service.scheduleFeed(feed);
			
			// Avancer le temps d'une minute
			await vi.advanceTimersByTimeAsync(60 * 1000);

			expect(mockLogService.error).toHaveBeenCalledWith(
				"Erreur lors de la synchronisation planifiée",
				expect.objectContaining({
					feed: feed.id,
					error
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

			await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
			expect(mockSyncService.syncFeed).toHaveBeenCalledTimes(0);
			expect(mockLogService.info).toHaveBeenCalledWith(
				"Feed déplanifié",
				expect.objectContaining({ feed: feed.id })
			);
		});
	});
});
