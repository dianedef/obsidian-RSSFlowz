'use strict';

class RSSReaderPlugin extends obsidian.Plugin {
    async onload() {
        this.settings = Object.assign({}, {
            feeds: [],
            openaiKey: '',
            rssFolder: 'RSS',
            fetchInterval: 3600,
            maxArticles: 50,
            retentionDays: 30
        }, await this.loadData());
        
        this.addRibbonIcon('refresh-cw', 'Refresh RSS Feeds', () => {
            this.fetchAllFeeds();
        });

        this.addCommand({
            id: 'import-opml',
            name: 'Import OPML file',
            callback: () => this.importOpml()
        });

        this.addSettingTab(new RSSReaderSettingTab(this.app, this));

        this.registerInterval(
            window.setInterval(() => this.fetchAllFeeds(), this.settings.fetchInterval * 1000)
        );
    }

    async fetchAllFeeds() {
        for (const feed of this.settings.feeds) {
            try {
                const response = await fetch(feed.url);
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/xml');
                
                const articles = Array.from(doc.querySelectorAll('item')).map(item => ({
                    title: item.querySelector('title')?.textContent || '',
                    content: item.querySelector('description')?.textContent || '',
                    date: item.querySelector('pubDate')?.textContent || '',
                    link: item.querySelector('link')?.textContent || '',
                    tags: feed.tags || []
                }));

                await this.saveArticles(articles, feed);
            } catch (error) {
                console.error(`Error fetching feed ${feed.url}:`, error);
            }
        }
    }

    async saveArticles(articles, feed) {
        const folder = this.settings.rssFolder;
        
        if (feed.type === 'uniqueFile') {
            const content = articles.map(article => 
                `# ${article.title}\n\nDate: ${article.date}\nLink: ${article.link}\n\n${article.content}`
            ).join('\n---\n');
            
            await this.app.vault.adapter.write(
                `${folder}/${feed.title}.md`,
                content
            );
        } else {
            for (const article of articles) {
                const fileName = `${folder}/${article.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
                const content = `# ${article.title}\n\nDate: ${article.date}\nLink: ${article.link}\n\n${article.content}`;
                await this.app.vault.adapter.write(fileName, content);
            }
        }
    }

    async importOpml(fileContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(fileContent, 'text/xml');
        const outlines = doc.querySelectorAll('outline[xmlUrl]');
        
        this.settings.feeds = Array.from(outlines).map(outline => ({
            title: outline.getAttribute('title'),
            url: outline.getAttribute('xmlUrl'),
            category: outline.getAttribute('category') || '',
            type: 'feed',
            status: 'active',
            tags: outline.getAttribute('category') ? [outline.getAttribute('category')] : []
        }));

        await this.saveSettings();
    }
}

class RSSReaderSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;
        containerEl.empty();

        new obsidian.Setting(containerEl)
            .setName('Clé API OpenAI')
            .setDesc('Votre clé API OpenAI pour la génération de sommaires')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.openaiKey)
                .onChange(async (value) => {
                    this.plugin.settings.openaiKey = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Dossier RSS')
            .setDesc('Dossier où seront sauvegardés les articles')
            .addText(text => text
                .setValue(this.plugin.settings.rssFolder)
                .onChange(async (value) => {
                    this.plugin.settings.rssFolder = value;
                    await this.plugin.saveSettings();
                }));

        // Affichage des feeds
        this.plugin.settings.feeds.forEach((feed, index) => {
            const feedContainer = containerEl.createDiv();
            new obsidian.Setting(feedContainer)
                .setName(feed.title)
                .addDropdown(d => d
                    .addOption('feed', 'Un fichier par article')
                    .addOption('uniqueFile', 'Fichier unique')
                    .setValue(feed.type)
                    .onChange(async (value) => {
                        this.plugin.settings.feeds[index].type = value;
                        await this.plugin.saveSettings();
                    }));
        });
    }
}

module.exports = RSSReaderPlugin; 