export class RSSReaderSettingTab {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Paramètres généraux'});

        new Setting(containerEl)
            .setName('Clé API OpenAI')
            .setDesc('Votre clé API OpenAI pour la génération de sommaires')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.openaiKey)
                .onChange(async (value) => {
                    this.plugin.settings.openaiKey = value;
                    await this.plugin.saveSettings();
                }));

        // Ajout des autres paramètres...

        this.displayFeedsList(containerEl);
    }

    displayFeedsList(containerEl) {
        containerEl.createEl('h2', {text: 'Feeds RSS'});
        
        this.plugin.settings.feeds.forEach((feed, index) => {
            const feedContainer = containerEl.createDiv();
            
            this.createFeedSettings(feedContainer, feed, index);
        });
    }
} 