import { App, PluginSettingTab, Setting } from 'obsidian';
import RSSReaderPlugin from './main';

export interface FeedSettings {
    url: string;
    title: string;
    tags: string[];
    status: 'active' | 'paused';
    type: 'feed' | 'uniqueFile';
    transcribe: boolean;
    summarize: boolean;
}

export class RSSReaderSettingTab extends PluginSettingTab {
    plugin: RSSReaderPlugin;

    constructor(app: App, plugin: RSSReaderPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        // Paramètres généraux
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

        new Setting(containerEl)
            .setName('Dossier RSS')
            .setDesc('Dossier où seront sauvegardés les articles')
            .addText(text => text
                .setValue(this.plugin.settings.rssFolder)
                .onChange(async (value) => {
                    this.plugin.settings.rssFolder = value;
                    await this.plugin.saveSettings();
                }));

        // ... autres paramètres

        // Liste des feeds
        containerEl.createEl('h2', {text: 'Feeds RSS'});
        
        this.plugin.settings.feeds.forEach((feed, index) => {
            const feedContainer = containerEl.createDiv();
            
            new Setting(feedContainer)
                .setName(feed.title)
                .addDropdown(dropdown => dropdown
                    .addOption('active', 'Actif')
                    .addOption('paused', 'Pausé')
                    .setValue(feed.status)
                    .onChange(async (value) => {
                        this.plugin.settings.feeds[index].status = value as 'active' | 'paused';
                        await this.plugin.saveSettings();
                    }))
                .addDropdown(dropdown => dropdown
                    .addOption('feed', 'Un fichier par article')
                    .addOption('uniqueFile', 'Fichier unique')
                    .setValue(feed.type)
                    .onChange(async (value) => {
                        this.plugin.settings.feeds[index].type = value as 'feed' | 'uniqueFile';
                        await this.plugin.saveSettings();
                    }));
            
            // ... autres options du feed
        });
    }
} 