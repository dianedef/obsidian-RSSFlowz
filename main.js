'use strict';

const { Plugin, PluginSettingTab, Setting, requestUrl } = require('obsidian');

class RSSReaderPlugin extends Plugin {
   async onload() {
      this.settings = Object.assign({}, {
         feeds: [],
         openaiKey: '',
         rssFolder: 'RSS',
         fetchFrequency: 'hourly',
         fetchInterval: 3600,
         maxArticles: 50,
         retentionDays: 30,
         lastFetch: Date.now()
      }, await this.loadData());
      
      this.addRibbonIcon('refresh-cw', 'Refresh RSS Feeds', () => {
         this.fetchAllFeeds();
      });

      if (this.settings.fetchFrequency === 'startup') {
         this.fetchAllFeeds();
      }

      this.registerInterval(
         window.setInterval(() => {
            const now = Date.now();
            const timeSinceLastFetch = now - this.settings.lastFetch;
            
            if (this.settings.fetchFrequency === 'daily' && timeSinceLastFetch >= 86400000) {
               this.fetchAllFeeds();
            } else if (this.settings.fetchFrequency === 'hourly' && timeSinceLastFetch >= 3600000) {
               this.fetchAllFeeds();
            }
         }, 60000)
      );

      this.addCommand({
         id: 'import-opml',
         name: 'Import OPML file',
         callback: async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.opml,.xml';
            input.onchange = async (e) => {
               const file = e.target.files[0];
               const reader = new FileReader();
               reader.onload = async (e) => {
                  await this.importOpml(e.target.result);
               };
               reader.readAsText(file);
            };
            input.click();
         }
      });

      this.addCommand({
         id: 'export-opml',
         name: 'Export OPML file',
         callback: () => this.exportOpml()
      });

      this.addSettingTab(new RSSReaderSettingTab(this.app, this));
   }

   async fetchAllFeeds() {
      this.settings.lastFetch = Date.now();
      await this.saveData(this.settings);

      for (const feed of this.settings.feeds) {
         try {
            const response = await requestUrl({
               url: feed.url
            });
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.text, 'text/xml');
            
            const articles = Array.from(doc.querySelectorAll('item'))
               .slice(0, this.settings.maxArticles)
               .map(item => ({
                  title: item.querySelector('title')?.textContent || '',
                  content: item.querySelector('description')?.textContent || '',
                  date: item.querySelector('pubDate')?.textContent || '',
                  link: item.querySelector('link')?.textContent || '',
                  tags: feed.tags || []
               }));

            await this.saveArticles(articles, feed);
            await this.cleanOldArticles();
         } catch (error) {
            console.error(`Error fetching feed ${feed.url}:`, error);
         }
      }
   }

   async cleanOldArticles() {
      const folder = this.settings.rssFolder;
      const files = await this.app.vault.adapter.list(folder);
      const cutoffDate = Date.now() - (this.settings.retentionDays * 86400000);

      for (const file of files.files) {
         try {
               const stat = await this.app.vault.adapter.stat(file);
               if (stat.mtime < cutoffDate) {
                  await this.app.vault.adapter.remove(file);
               }
         } catch (error) {
               console.error(`Error cleaning old article ${file}:`, error);
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

   async exportOpml() {
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
<head>
    <title>RSS Feeds Export</title>
</head>
<body>
<outline text="Feeds" title="Feeds">
    ${this.settings.feeds.map(feed => `
    <outline 
        title="${feed.title}"
        type="rss"
        xmlUrl="${feed.url}"
        category="${feed.category || ''}"
        status="${feed.status}"
        saveType="${feed.type}"
        summarize="${feed.summarize || false}"
        transcribe="${feed.transcribe || false}"
    />`).join('\n')}
</outline>
</body>
</opml>`;

      // Créer un blob et le télécharger
      const blob = new Blob([opml], { type: 'text/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rss-feeds.opml';
      a.click();
      window.URL.revokeObjectURL(url);
   }

   async importOpml(fileContent) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fileContent, 'text/xml');
      const outlines = doc.querySelectorAll('outline[xmlUrl]');
      
      this.settings.feeds = Array.from(outlines).map(outline => ({
         title: outline.getAttribute('title'),
         url: outline.getAttribute('xmlUrl'),
         category: outline.getAttribute('category') || '',
         type: outline.getAttribute('saveType') || 'feed',
         status: outline.getAttribute('status') || 'active',
         summarize: outline.getAttribute('summarize') === 'true',
         transcribe: outline.getAttribute('transcribe') === 'true',
         tags: outline.getAttribute('category') ? [outline.getAttribute('category')] : []
      }));

      await this.saveData(this.settings);
      // Rafraîchir l'interface des paramètres
      this.app.workspace.trigger('rss-reader:refresh-settings');
   }
}

class RSSReaderSettingTab extends PluginSettingTab {
   constructor(app, plugin) {
      super(app, plugin);
      this.plugin = plugin;
   }

   display() {
      const {containerEl} = this;
      containerEl.empty();

      new Setting(containerEl)
         .setName('Clé API OpenAI')
         .setDesc('Votre clé API OpenAI pour la génération de sommaires')
         .addText(text => text
               .setPlaceholder('sk-...')
               .setValue(this.plugin.settings.openaiKey)
               .onChange(async (value) => {
                  this.plugin.settings.openaiKey = value;
                  await this.plugin.saveData(this.plugin.settings);
               }));

      new Setting(containerEl)
         .setName('Dossier RSS')
         .setDesc('Dossier où seront sauvegardés les articles')
         .addText(text => text
               .setValue(this.plugin.settings.rssFolder)
               .onChange(async (value) => {
                  this.plugin.settings.rssFolder = value;
                  await this.plugin.saveData(this.plugin.settings);
               }));

      new Setting(containerEl)
         .setName('Fréquence de mise à jour')
         .setDesc('À quelle fréquence voulez-vous récupérer les nouveaux articles ?')
         .addDropdown(dropdown => dropdown
               .addOption('startup', 'Au démarrage uniquement')
               .addOption('daily', 'Une fois par jour')
               .addOption('hourly', 'Toutes les heures')
               .setValue(this.plugin.settings.fetchFrequency)
               .onChange(async (value) => {
                  this.plugin.settings.fetchFrequency = value;
                  await this.plugin.saveData(this.plugin.settings);
               }));

      new Setting(containerEl)
         .setName('Nombre maximum d\'articles')
         .setDesc('Nombre maximum d\'articles à récupérer par feed')
         .addText(text => text
               .setValue(String(this.plugin.settings.maxArticles))
               .onChange(async (value) => {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue > 0) {
                     this.plugin.settings.maxArticles = numValue;
                     await this.plugin.saveData(this.plugin.settings);
                  }
               }));

      new Setting(containerEl)
         .setName('Durée de rétention (jours)')
         .setDesc('Nombre de jours pendant lesquels garder les articles avant suppression')
         .addText(text => text
               .setValue(String(this.plugin.settings.retentionDays))
               .onChange(async (value) => {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue > 0) {
                     this.plugin.settings.retentionDays = numValue;
                     await this.plugin.saveData(this.plugin.settings);
                  }
               }));

      // Affichage des feeds avec plus d'options
      containerEl.createEl('h3', {text: 'Feeds RSS'});
      
      this.plugin.settings.feeds.forEach((feed, index) => {
         const feedContainer = containerEl.createDiv('feed-container');
         
         new Setting(feedContainer)
            .setName(feed.title)
            .setDesc(feed.url)
            .addDropdown(d => d
               .addOption('active', 'Actif')
               .addOption('paused', 'Pausé')
               .setValue(feed.status)
               .onChange(async (value) => {
                  this.plugin.settings.feeds[index].status = value;
                  await this.plugin.saveData(this.plugin.settings);
               }))
            .addDropdown(d => d
               .addOption('feed', 'Un fichier par article')
               .addOption('uniqueFile', 'Fichier unique')
               .setValue(feed.type)
               .onChange(async (value) => {
                  this.plugin.settings.feeds[index].type = value;
                  await this.plugin.saveData(this.plugin.settings);
               }));

         new Setting(feedContainer)
            .setName('Options avancées')
            .addToggle(toggle => toggle
               .setValue(feed.summarize || false)
               .setTooltip('Générer un résumé AI')
               .onChange(async (value) => {
                  this.plugin.settings.feeds[index].summarize = value;
                  await this.plugin.saveData(this.plugin.settings);
               }))
            .addToggle(toggle => toggle
               .setValue(feed.transcribe || false)
               .setTooltip('Transcrire les vidéos YouTube')
               .onChange(async (value) => {
                  this.plugin.settings.feeds[index].transcribe = value;
                  await this.plugin.saveData(this.plugin.settings);
               }))
            .addButton(button => button
               .setButtonText('Supprimer')
               .onClick(async () => {
                  this.plugin.settings.feeds.splice(index, 1);
                  await this.plugin.saveData(this.plugin.settings);
                  this.display();
               }));
      });

      // Bouton pour ajouter un nouveau feed
      new Setting(containerEl)
         .setName('Ajouter un feed')
         .addText(text => text
            .setPlaceholder('URL du feed RSS')
            .onChange(async (value) => {
               if (value) {
                  try {
                     const response = await requestUrl({
                        url: value
                     });
                     
                     const parser = new DOMParser();
                     const doc = parser.parseFromString(response.text, 'text/xml');
                     const title = doc.querySelector('channel > title')?.textContent || 'Nouveau feed';
                     
                     this.plugin.settings.feeds.push({
                        title: title,
                        url: value,
                        type: 'feed',
                        status: 'active',
                        summarize: false,
                        transcribe: false,
                        tags: []
                     });
                     
                     await this.plugin.saveData(this.plugin.settings);
                     this.display();
                  } catch (error) {
                     console.error('Erreur lors de l\'ajout du feed:', error);
                  }
               }
            }));
   }
}

module.exports = RSSReaderPlugin; 