import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { parseOpml, parseFeed, createMarkdownFromFeed } from './utils/rssUtils';
import { getFeedSettings, saveFeedSettings, FeedSettings } from './settings';
import { generateSummary, transcribeYoutube } from './utils/aiUtils';

interface RSSReaderSettings {
    feeds: FeedSettings[];
    openaiKey: string;
    rssFolder: string;
    fetchInterval: number;
    maxArticles: number;
    retentionDays: number;
}

const DEFAULT_SETTINGS: RSSReaderSettings = {
    feeds: [],
    openaiKey: '',
    rssFolder: 'RSS',
    fetchInterval: 3600, // en secondes
    maxArticles: 50,
    retentionDays: 30
};

export default class RSSReaderPlugin extends Plugin {
    settings: RSSReaderSettings;
    
    async onload() {
        await this.loadSettings();
        
        // Ajouter le ruban pour rafraîchir manuellement
        this.addRibbonIcon('refresh-cw', 'Refresh RSS Feeds', () => {
            this.fetchAllFeeds();
        });

        // Ajouter la commande pour importer OPML
        this.addCommand({
            id: 'import-opml',
            name: 'Import OPML file',
            callback: () => this.importOpml()
        });

        // Ajouter la commande pour exporter OPML
        this.addCommand({
            id: 'export-opml',
            name: 'Export OPML file',
            callback: () => this.exportOpml()
        });

        // Ajouter les paramètres
        this.addSettingTab(new RSSReaderSettingTab(this.app, this));

        // Démarrer le fetch automatique
        this.registerInterval(
            window.setInterval(() => this.fetchAllFeeds(), this.settings.fetchInterval * 1000)
        );
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async fetchAllFeeds() {
        for (const feed of this.settings.feeds) {
            try {
                const feedData = await parseFeed(feed.url);
                const articles = await this.processArticles(feedData, feed);
                await this.saveArticles(articles, feed);
            } catch (error) {
                console.error(`Error fetching feed ${feed.url}:`, error);
            }
        }
    }

    async processArticles(feedData: any, feedSettings: FeedSettings) {
        const articles = [];
        for (const item of feedData.items.slice(0, this.settings.maxArticles)) {
            let content = item.content;
            
            // Traitement YouTube si nécessaire
            if (feedSettings.transcribe && item.link.includes('youtube.com')) {
                const transcription = await transcribeYoutube(item.link, this.settings.openaiKey);
                content += '\n\n## Transcription\n' + transcription;
            }

            // Génération du sommaire si activé
            if (feedSettings.summarize) {
                const summary = await generateSummary(content, this.settings.openaiKey);
                content = '## Sommaire\n' + summary + '\n\n' + content;
            }

            articles.push({
                title: item.title,
                content: content,
                date: item.pubDate,
                link: item.link,
                tags: feedSettings.tags
            });
        }
        return articles;
    }

    async saveArticles(articles: any[], feedSettings: FeedSettings) {
        const folder = this.settings.rssFolder;
        
        if (feedSettings.type === 'uniqueFile') {
            // Sauvegarder tous les articles dans un seul fichier
            const content = articles.map(article => this.formatArticle(article)).join('\n---\n');
            await this.app.vault.adapter.write(
                `${folder}/${feedSettings.title}.md`,
                content
            );
        } else {
            // Sauvegarder chaque article dans un fichier séparé
            for (const article of articles) {
                const fileName = `${folder}/${this.sanitizeFileName(article.title)}.md`;
                await this.app.vault.adapter.write(
                    fileName,
                    this.formatArticle(article)
                );
            }
        }
    }

    // ... autres méthodes utilitaires
} 