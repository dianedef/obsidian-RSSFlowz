import { App, Modal, TFile } from 'obsidian';
import { ReadingService } from '../services/ReadingService';

export class ReadingModeModal extends Modal {
    constructor(
        app: App,
        private article: { title: string; content: string },
        private groups: string[],
        private currentFolder: string,
        private readingService: ReadingService,
        private updateFeeds: (folder: string) => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.classList.add('reading-mode-active');

        // Titre de l'article
        const titleElement = contentEl.createEl('h1');
        titleElement.textContent = this.article.title;

        // Contenu de l'article
        const contentElement = contentEl.createDiv();
        contentElement.innerHTML = this.article.content;

        // Barre de contrôle
        const controlBar = contentEl.createDiv();
        controlBar.classList.add('reading-mode-controls');

        // Sélecteur de groupe
        const folderSelect = controlBar.createEl('select');
        folderSelect.classList.add('reading-mode-select');
        this.groups.forEach(group => {
            const option = folderSelect.createEl('option');
            option.value = group;
            option.text = group;
            if (this.currentFolder === group) {
                option.selected = true;
            }
        });
        folderSelect.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.currentFolder = target.value;
            this.updateFeeds(this.currentFolder);
        });

        // Boutons de navigation
        const prevButton = controlBar.createEl('button');
        prevButton.innerHTML = '⬅️ Précédent';
        prevButton.onclick = () => this.readingService.navigateArticles('previous');

        const nextButton = controlBar.createEl('button');
        nextButton.innerHTML = 'Suivant ➡️';
        nextButton.onclick = () => this.readingService.navigateArticles('next');

        // Bouton de fermeture
        const closeButton = contentEl.createEl('button');
        closeButton.innerHTML = 'Fermer';
        closeButton.onclick = () => this.close();

        // Ajout de la barre de contrôle
        contentEl.appendChild(controlBar);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 