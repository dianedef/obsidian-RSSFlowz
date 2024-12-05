import { ItemView, WorkspaceLeaf } from "obsidian";
import { ReadingService } from "../services/ReadingService";

export const VIEW_TYPE_READING = "rss-reader-reading-view";

export class ReadingViewUI extends ItemView {
	private readingService: ReadingService;

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
		prevButton.onclick = () => this.readingService.navigateArticles("previous");
		nextButton.onclick = () => this.readingService.navigateArticles("next");
	}

	async onClose() {
		await this.readingService.exitReadingMode();
	}
}
