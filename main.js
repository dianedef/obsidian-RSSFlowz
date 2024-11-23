'use strict';

const { Plugin, PluginSettingTab, Setting, requestUrl, Notice, Modal } = require('obsidian');

class RSSReaderPlugin extends Plugin {
   async onload() {
      this.settings = Object.assign({}, {
         feeds: [],
         groups: ['Défaut', 'Tech', 'News', 'Blog'],
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

      // Section de gestion des groupes
      containerEl.createEl('h2', {text: 'Gestion des Groupes'});
      
      // Afficher les groupes existants
      this.plugin.settings.groups.forEach((group, index) => {
         if (group !== 'Sans groupe') {
            new Setting(containerEl)
               .setName(group)
               .addButton(button => button
                  .setButtonText('Supprimer')
                  .setWarning()
                  .onClick(async () => {
                     this.plugin.settings.groups.splice(index, 1);
                     this.plugin.settings.feeds.forEach(feed => {
                        if (feed.group === group) {
                           feed.group = '';
                        }
                     });
                     await this.plugin.saveData(this.plugin.settings);
                     new Notice(`Groupe supprimé : ${group}`);
                     this.display();
                  }));
         }
      });

      // Ajouter un nouveau groupe
      let inputText = '';
      new Setting(containerEl)
         .setName('Ajouter un groupe')
         .setDesc('Créer un nouveau groupe pour organiser vos feeds (appuyez sur Entrée pour ajouter)')
         .addText(text => text
            .setPlaceholder('Nom du nouveau groupe')
            .setValue('')
            .onChange(value => {
               inputText = value;
            })
            .inputEl.addEventListener('keypress', async (e) => {
               if (e.key === 'Enter' && inputText.trim()) {
                  if (!this.plugin.settings.groups.includes(inputText)) {
                     this.plugin.settings.groups.push(inputText);
                     await this.plugin.saveData(this.plugin.settings);
                     new Notice(`Groupe ajouté : ${inputText}`);
                     this.display();
                  } else {
                     new Notice('Ce groupe existe déjà !');
                  }
               }
            }));

      containerEl.createEl('hr');

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
      
      const groupedFeeds = {};
      this.plugin.settings.feeds.forEach((feed, index) => {
         const group = feed.group || 'Sans groupe';
         if (!groupedFeeds[group]) {
            groupedFeeds[group] = [];
         }
         groupedFeeds[group].push({feed, index});
      });

      // Afficher les feeds par groupe
      Object.entries(groupedFeeds).forEach(([groupName, feeds]) => {
         if (groupName !== 'Sans groupe') {
            containerEl.createEl('h3', {text: groupName});
         }
         
         feeds.forEach(({feed, index}) => {
            const feedContainer = containerEl.createDiv('feed-container');
            
            // Options principales du feed
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

            // Option de groupe
            new Setting(feedContainer)
               .setName('Groupe')
               .setDesc('Assigner ce feed à un groupe')
               .addDropdown(dropdown => {
                  dropdown.addOption('', 'Sans groupe');
                  this.plugin.settings.groups.forEach(g => 
                     dropdown.addOption(g, g)
                  );
                  
                  dropdown.setValue(feed.group || '');
                  dropdown.onChange(async (value) => {
                     if (value === 'new') {
                        const newGroup = prompt('Nom du nouveau groupe :');
                        if (newGroup && newGroup.trim()) {
                           this.plugin.settings.groups.push(newGroup);
                           this.plugin.settings.feeds[index].group = newGroup;
                           await this.plugin.saveData(this.plugin.settings);
                           this.display();
                        }
                        dropdown.setValue(feed.group || '');
                     } else {
                        this.plugin.settings.feeds[index].group = value;
                        await this.plugin.saveData(this.plugin.settings);
                     }
                  });
               });

            // Option de résumé AI
            new Setting(feedContainer)
               .setName('Résumé AI')
               .setDesc('Génère automatiquement un résumé concis de chaque article en utilisant OpenAI')
               .addToggle(toggle => toggle
                   .setValue(feed.summarize || false)
                   .onChange(async (value) => {
                       if (value && !this.plugin.settings.openaiKey) {
                           new Notice('⚠️ Clé API OpenAI manquante dans les paramètres');
                           toggle.setValue(false);
                           return;
                       }
                       this.plugin.settings.feeds[index].summarize = value;
                       await this.plugin.saveData(this.plugin.settings);
                   }))
               .addExtraButton(button => button
                   .setIcon('help-circle')
                   .setTooltip('Utilise GPT pour générer un résumé de 2-3 paragraphes de l\'article'));

            // Option de réécriture AI
            new Setting(feedContainer)
               .setName('Réécriture AI')
               .setDesc('Réécrit l\'article complet dans un style plus clair et concis')
               .addToggle(toggle => toggle
                   .setValue(feed.rewrite || false)
                   .onChange(async (value) => {
                       if (value && !this.plugin.settings.openaiKey) {
                           new Notice('⚠️ Clé API OpenAI manquante dans les paramètres');
                           toggle.setValue(false);
                           return;
                       }
                       if (value) {
                           new Notice('⚠️ La réécriture consomme plus de tokens OpenAI', 5000);
                       }
                       this.plugin.settings.feeds[index].rewrite = value;
                       await this.plugin.saveData(this.plugin.settings);
                   }))
               .addExtraButton(button => button
                   .setIcon('help-circle')
                   .setTooltip('Utilise GPT pour réécrire l\'article complet dans un style plus clair'));

            // Option de transcription YouTube
            new Setting(feedContainer)
               .setName('Transcription YouTube')
               .setDesc('Transcrit automatiquement les vidéos YouTube trouvées dans les articles')
               .addToggle(toggle => toggle
                   .setValue(feed.transcribe || false)
                   .onChange(async (value) => {
                       if (value && !this.plugin.settings.openaiKey) {
                           new Notice('⚠️ Clé API OpenAI manquante dans les paramètres');
                           toggle.setValue(false);
                           return;
                       }
                       this.plugin.settings.feeds[index].transcribe = value;
                       await this.plugin.saveData(this.plugin.settings);
                   }))
               .addExtraButton(button => button
                   .setIcon('help-circle')
                   .setTooltip('Convertit les vidéos YouTube en texte pour une lecture facile'));

            // Bouton de suppression
            new Setting(feedContainer)
               .addButton(button => button
                   .setButtonText('Supprimer ce feed')
                   .setWarning()
                   .onClick(async () => {
                       this.plugin.settings.feeds.splice(index, 1);
                       await this.plugin.saveData(this.plugin.settings);
                       new Notice(`Feed supprimé : ${feed.title}`);
                       this.display();
                   }));
         });
      });

      // Bouton d'ajout de feed
      new Setting(containerEl)
         .setName('Ajouter un feed')
         .setDesc('Entrez l\'URL d\'un flux RSS')
         .addText(text => text
            .setPlaceholder('URL du feed RSS')
            .onChange(async (value) => {
               if (value) {
                  try {
                     // Vérifier si le feed existe déjà
                     const feedExists = this.plugin.settings.feeds.some(feed => 
                        feed.url.toLowerCase() === value.toLowerCase()
                     );

                     if (feedExists) {
                        new Notice('⚠️ Ce feed RSS est déjà dans votre liste');
                        return;
                     }

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
                     new Notice(`✅ Feed ajouté : ${title}`);
                     this.display();
                  } catch (error) {
                     console.error('Erreur lors de l\'ajout du feed:', error);
                     new Notice('❌ Erreur : Impossible de charger le feed RSS');
                  }
               }
            }));
   }

   async confirmDelete(feedTitle) {
      return new Promise((resolve) => {
         const modal = new Modal(this.app);
         modal.titleEl.setText("Confirmer la suppression");
         
         modal.contentEl.empty();
         modal.contentEl.createEl("p", { 
            text: `Êtes-vous sûr de vouloir supprimer le feed "${feedTitle}" ?` 
         });

         new Setting(modal.contentEl)
            .addButton(btn => btn
               .setButtonText("Annuler")
               .onClick(() => {
                  modal.close();
                  resolve(false);
               }))
            .addButton(btn => btn
               .setButtonText("Supprimer")
               .setWarning()
               .onClick(() => {
                  modal.close();
                  resolve(true);
               }));

         modal.open();
      });
   }

   async createNewGroup() {
      return new Promise((resolve) => {
         const modal = new Modal(this.app);
         modal.titleEl.setText("Nouveau groupe");
         
         modal.contentEl.empty();
         const inputContainer = modal.contentEl.createDiv();
         const input = new Setting(inputContainer)
            .setName("Nom du groupe")
            .addText(text => text
               .setPlaceholder("Entrez le nom du groupe")
               .setValue("")
            );

         new Setting(modal.contentEl)
            .addButton(btn => btn
               .setButtonText("Annuler")
               .onClick(() => {
                  modal.close();
                  resolve(null);
               }))
            .addButton(btn => btn
               .setButtonText("Créer")
               .setCta()
               .onClick(() => {
                  const value = input.components[0].getValue().trim();
                  if (value) {
                     modal.close();
                     resolve(value);
                  } else {
                     new Notice("Le nom du groupe ne peut pas être vide");
                  }
               }));

         modal.open();
      });
   }
}

module.exports = RSSReaderPlugin; 