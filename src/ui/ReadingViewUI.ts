import { ItemView, WorkspaceLeaf } from "obsidian";
import { ReadingService } from "../services/ReadingService";
import { ReadingModeModal } from "./ReadingModeModal";
export const VIEW_TYPE_READING = "rss-reader-reading-view";

export class ReadingViewUI extends ItemView {
	private readingService: ReadingService;
	private currentModal: ReadingModeModal | null = null;

	constructor(leaf: WorkspaceLeaf, readingService: ReadingService) {
		super(leaf);
		this.readingService = readingService;
	}

	getViewType(): string {
		return VIEW_TYPE_READING;
	}

	getDisplayText(): string {
		return "RSS Reader";
	}

	getIcon(): string {
		return "book-open";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		// Création du conteneur principal
		const mainContainer = container.createDiv({ cls: "rss-reader-container" });

		// En-tête avec titre
		const header = mainContainer.createDiv({ cls: "rss-reader-header" });
		header.createEl("h2", { text: "Mode Lecture RSS" });

		// Boutons de navigation
		const navButtons = header.createDiv({ cls: "rss-reader-nav-buttons" });
		const prevButton = navButtons.createEl("button", { text: "Précédent" });
		const nextButton = navButtons.createEl("button", { text: "Suivant" });

		// Zone de contenu
		const contentArea = mainContainer.createDiv({ cls: "rss-reader-content" });

		// Gestionnaires d'événements
		prevButton.onclick = () => {
			this.readingService.navigateArticles("previous");
			this.updateModal();
		};
		nextButton.onclick = () => {
			this.readingService.navigateArticles("next");
			this.updateModal();
		};

		// Initialiser la modal si un article est déjà sélectionné
		const currentState = this.readingService.getState();
		if (currentState.currentFile) {
			await this.updateModal();
		}
	}

	private async updateModal() {
		const state = this.readingService.getState();
		if (!state.currentFile) return;

		// Fermer la modal existante si elle existe
		if (this.currentModal) {
			this.currentModal.close();
		}

		// Lire le contenu du fichier
		const content = await this.app.vault.read(state.currentFile);
		const groups = await this.readingService.getGroups();
		const currentFolder = state.currentFile.parent?.name || 'Sans groupe';

		// Créer et ouvrir la nouvelle modal
		this.currentModal = new ReadingModeModal(
			this.app,
			{
				title: state.currentFile.basename,
				content: content
			},
			groups,
			currentFolder,
			this.readingService,
			async (folder: string) => {
				await this.readingService.updateFeedFolder(currentFolder, folder);
				this.updateModal();
			}
		);
		this.currentModal.open();
	}

	async onClose() {
		if (this.currentModal) {
			this.currentModal.close();
		}
		await this.readingService.exitReadingMode();
	}
}
