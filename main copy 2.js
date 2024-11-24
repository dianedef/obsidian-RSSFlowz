'use strict';

const { Plugin, PluginSettingTab, Setting, requestUrl, Notice, Modal, sanitizeHTMLToDom } = require('obsidian');

class RSSReaderPlugin extends Plugin {
   async onload() {
      this.settings = Object.assign({}, {
         feeds: [],
         groups: ['Défaut'],
         openaiKey: '',
         rssFolder: 'RSS',
         fetchFrequency: 'hourly',
         fetchInterval: 3600,
         maxArticles: 50,
         retentionDays: 30,
         lastFetch: Date.now()
      }, await this.loadData());
      
      // Créer le dossier RSS principal s'il n'existe pas
      await this.ensureFolder(this.settings.rssFolder);
      
      // Vérifier et créer le dossier "RSS" si nécessaire
      await this.ensureFolder('RSS');
      
      // Créer les dossiers pour les groupes existants
      for (const group of this.settings.groups) {
         await this.ensureFolder(`${this.settings.rssFolder}/${group}`);
      }

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
                  const result = await this.plugin.importOpml(e.target.result);
                  if (result.success) {
                     new Notice('Feeds importés avec succès');
                  }
                  this.display();
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
         if (feed.status !== 'active') continue;

         try {
            const response = await requestUrl({
               url: feed.url,
               headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                  'Accept': 'application/atom+xml,application/xml,text/xml,application/rss+xml,*/*',
                  'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache',
                  'Referer': 'https://kimsaeed.com'
               },
               throw: false // Ne pas throw en cas d'erreur HTTP
            });

            if (response.status === 403) {
               throw new Error('Accès refusé par le serveur. Le site bloque peut-être les lecteurs RSS externes.');
            } else if (!response.ok) {
               throw new Error(`Erreur HTTP ${response.status}`);
            }
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.text, 'text/xml');
            
            // Vérifier les erreurs de parsing
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
               console.error(`Erreur de parsing pour ${feed.url}:`, parseError.textContent);
               continue;
            }

            let articles;
            if (doc.querySelector('feed')) {
               articles = await this.parseAtomFeed(doc, feed);
            } else {
               articles = await this.parseRssFeed(doc, feed);
            }

            if (articles && articles.length > 0) {
               await this.saveArticles(articles, feed);
            }
         } catch (error) {
            console.error(`Erreur lors de la récupération du feed ${feed.url}:`, error);
            new Notice(`Erreur lors de la récupération du feed ${feed.title}`);
         }
      }

      await this.cleanOldArticles();
   }

   async parseAtomFeed(doc, feed) {
      try {
         const entries = Array.from(doc.querySelectorAll('entry'));
         return entries
            .slice(0, this.settings.maxArticles)
            .map(entry => {
               // Gestion spécifique des liens Atom
               let link = '';
               const links = entry.querySelectorAll('link');
               for (const l of links) {
                  if (l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel')) {
                     link = l.getAttribute('href');
                     break;
                  }
               }

               // Gestion du contenu avec fallback sur le summary
               const content = entry.querySelector('content')?.textContent || 
                             entry.querySelector('summary')?.textContent || '';

               return {
                  title: entry.querySelector('title')?.textContent?.trim() || 'Sans titre',
                  content: content.trim(),
                  date: entry.querySelector('updated')?.textContent || 
                        entry.querySelector('published')?.textContent || 
                        new Date().toISOString(),
                  link: link,
                  tags: feed.tags || [],
                  feedTitle: feed.title
               };
            });
      } catch (error) {
         console.error('Erreur lors du parsing du feed Atom:', error);
         throw error;
      }
   }

   async parseRssFeed(doc, feed) {
      try {
         const items = Array.from(doc.querySelectorAll('item'));
         return items
            .slice(0, this.settings.maxArticles)
            .map(item => {
               return {
                  title: item.querySelector('title')?.textContent || 'Sans titre',
                  content: item.querySelector('description')?.textContent || '',
                  date: item.querySelector('pubDate')?.textContent || '',
                  link: item.querySelector('link')?.textContent || '',
                  tags: feed.tags || [],
                  feedTitle: feed.title
               };
            });
      } catch (error) {
         console.error('Erreur lors du parsing du feed RSS:', error);
         throw error;
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
      const baseFolder = this.settings.rssFolder;
      const groupFolder = feed.group ? `${baseFolder}/${feed.group}` : baseFolder;
      
      if (feed.type === 'uniqueFile') {
         const content = articles.map(article => 
               `# ${article.title}\n\nDate: ${article.date}\nLink: ${article.link}\n\n${article.content}`
         ).join('\n---\n');
         
         await this.app.vault.adapter.write(
               `${groupFolder}/${feed.title}.md`,
               content
         );
      } else {
         for (const article of articles) {
               const fileName = `${groupFolder}/${article.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
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
      try {
         // 1. D'abord échapper les & dans les titres et catégories
         const cleanedContent = fileContent.replace(
               /(<outline[^>]*)(title="[^"]*&[^"]*"|category="[^"]*&[^"]*")([^>]*>)/g,
               (match, before, attribute, after) => {
                  return before + attribute.replace(/&(?!(amp|lt|gt|apos|quot);)/g, '&amp;') + after;
               }
         );
         
         // 2. Ensuite encoder les URLs
         const preparedContent = cleanedContent.replace(
               /xmlUrl="([^"]*)"/g,
               (match, url) => `xmlUrl="${encodeURIComponent(url)}"`
         );
         
         console.log('Contenu préparé:', preparedContent.substring(0, 200));
         
         const parser = new DOMParser();
         const doc = parser.parseFromString(preparedContent, 'text/xml');
         
         // Vérifier s'il y a eu des erreurs de parsing
         const parseError = doc.querySelector('parsererror');
         if (parseError) {
               console.error('Erreur de parsing XML:', parseError.textContent);
               throw new Error('Le fichier OPML contient des erreurs de format');
         }
         
         // Trouver tous les outlines avec xmlUrl
         const feedOutlines = Array.from(doc.getElementsByTagName('outline'))
               .filter(outline => outline.hasAttribute('xmlUrl'))
               .map(outline => ({
                  title: outline.getAttribute('title'),
                  xmlUrl: decodeURIComponent(outline.getAttribute('xmlUrl')),
                  category: outline.getAttribute('category'),
                  type: outline.getAttribute('type')
               }));
               
         console.log('Feeds trouvés:', feedOutlines);

         if (!feedOutlines.length) {
               new Notice('Aucun feed RSS trouvé dans le fichier OPML');
               return;
         }

         let successCount = 0;
         let errorFeeds = [];
         let duplicateFeeds = [];
         
         for (const feed of feedOutlines) {
               try {
                  const xmlUrl = feed.xmlUrl;
                  const feedTitle = feed.title || feed.text || xmlUrl;
                  
                  // Désanitizer l'URL si nécessaire
                  let feedUrl = xmlUrl;
                  if (xmlUrl.includes('%')) {
                     const tempDiv = document.createElement('div');
                     tempDiv.appendChild(sanitizeHTMLToDom(decodeURIComponent(xmlUrl)));
                     feedUrl = tempDiv.textContent;
                  }
                  
                  /* console.log(`\nTest du feed:`, {
                     title: feedTitle,
                     originalUrl: xmlUrl,
                     cleanUrl: feedUrl,
                     category: feed.category
                  }); */
                  
                  // Vérifier si le feed existe déjà
                  const feedExists = this.settings.feeds.some(f => 
                     f.url.toLowerCase() === feedUrl.toLowerCase()
                  );

                  if (feedExists) {
                     console.log(`- Feed déjà existant: ${feedTitle}`);
                     duplicateFeeds.push({
                           title: feedTitle,
                           url: feedUrl,
                           error: 'Feed déjà présent dans la liste'
                     });
                     continue;
                  }
                  
                  const response = await requestUrl({
                     url: feedUrl,
                     headers: {
                           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                           'Accept': 'application/atom+xml,application/xml,text/xml,application/rss+xml,*/*',
                           'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
                           'Cache-Control': 'no-cache'
                     }
                  });

                  // Vérifier si la réponse est un feed valide
                  const contentType = response.headers?.['content-type'] || '';
                  const isValidFeed = contentType.includes('xml') || 
                                       response.text.includes('<rss') || 
                                       response.text.includes('<feed') ||
                                       response.text.includes('<?xml');

                  if (!isValidFeed) {
                     throw new Error('Le contenu ne semble pas être un feed RSS/Atom valide');
                  }

                  // Si on arrive ici, le feed est valide
                  this.settings.feeds.push({
                     title: feedTitle,
                     url: feedUrl,
                     type: 'feed',
                     status: 'active',
                     summarize: false,
                     transcribe: false,
                     tags: feed.category ? [feed.category] : []
                  });
                  successCount++;

               } catch (error) {
                  console.error(`- Erreur lors de la vérification:`, error.message);
                  
                  // Rendre les messages d'erreur plus compréhensibles
                  let errorMessage = error.message;
                  if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                     errorMessage = "Le site web n'existe plus ou est inaccessible";
                  } else if (error.message.includes('CERT_')) {
                     errorMessage = 'Certificat SSL invalide';
                  } else if (error.message.includes('ECONNREFUSED')) {
                     errorMessage = 'Connexion refusée par le serveur';
                  } else if (error.message.includes('ETIMEDOUT')) {
                     errorMessage = 'Le serveur met trop de temps à répondre';
                  } else if (error.status === 404) {
                     errorMessage = 'Feed introuvable (404)';
                  } else if (error.status === 403) {
                     errorMessage = 'Accès refusé par le serveur';
                  }

                  errorFeeds.push({
                     title: feed.title || feed.xmlUrl,
                     url: feed.xmlUrl,
                     error: errorMessage
                  });
               }
         }

         // Sauvegarder les settings après la boucle
         if (successCount > 0) {
               await this.saveData(this.settings);
               console.log(`${successCount} feeds sauvegardés avec succès`);
         }

         // Créer le résumé détaillé dans un modal
         const modal = new Modal(this.app);
         modal.titleEl.setText("Résumé de l'import OPML");
         
         const contentEl = modal.contentEl;
         
         // Statistiques
         contentEl.createEl('h3', {text: 'Statistiques'});
         contentEl.createEl('p', {text: `Total des feeds : ${feedOutlines.length}`});
         contentEl.createEl('p', {text: `✅ Importés avec succès : ${successCount}`});
         contentEl.createEl('p', {text: `⚠️ Déjà existants : ${duplicateFeeds.length}`});
         contentEl.createEl('p', {text: `❌ Échecs : ${errorFeeds.length}`});

         // Détails des erreurs et doublons
         if (errorFeeds.length > 0 || duplicateFeeds.length > 0) {
               const allIssues = [...errorFeeds, ...duplicateFeeds];
               contentEl.createEl('h3', {text: 'Détails'});
               const issuesList = contentEl.createEl('ul');
               allIssues.forEach(feed => {
                  issuesList.createEl('li', {
                     text: `${feed.title}: ${feed.error}`
                  });
               });

               // Bouton pour copier les feeds en erreur
               const issuesText = allIssues
                  .map(feed => `${feed.title} (${feed.url}): ${feed.error}`)
                  .join('\n');
               
               new Setting(contentEl)
                  .addButton(button => button
                     .setButtonText('Copier la liste des problèmes')
                     .onClick(() => {
                           navigator.clipboard.writeText(issuesText);
                           new Notice('Liste copiée dans le presse-papier');
                     }));
         }

         modal.open();

         return {
               success: successCount > 0,
               imported: successCount,
               errors: errorFeeds,
               duplicates: duplicateFeeds
         };

      } catch (error) {
         console.error('Erreur lors du parsing du fichier OPML:', error);
         new Notice('Erreur lors de la lecture du fichier OPML');
         return {
               success: false,
               imported: 0,
               errors: [{
                  title: 'OPML Parse Error',
                  error: error.message
               }],
               duplicates: []
         };
      }
   }

   // Méthode utilitaire pour créer un dossier s'il n'existe pas
   async ensureFolder(path) {
      try {
         const adapter = this.app.vault.adapter;
         const exists = await adapter.exists(path);
         if (!exists) {
            await adapter.mkdir(path);
         }
      } catch (error) {
         console.error(`Erreur lors de la création du dossier ${path}:`, error);
      }
   }

   async removeFolder(path) {
      try {
         const adapter = this.app.vault.adapter;
         const exists = await adapter.exists(path);
         if (exists) {
            // Supprimer tous les fichiers dans le dossier d'abord
            const listing = await adapter.list(path);
            for (const file of listing.files) {
               await adapter.remove(file);
            }
            // Puis supprimer le dossier
            await adapter.rmdir(path, false);
         }
      } catch (error) {
         console.error(`Erreur lors de la suppression du dossier ${path}:`, error);
         throw error; // Propager l'erreur pour la gestion
      }
   }

   async testFeed(feedUrl, feedTitle) {
      try {
         const response = await requestUrl({
            url: feedUrl,
            headers: {
               'User-Agent': 'Mozilla/5.0',
               'Accept': 'application/atom+xml,application/xml,text/xml,*/*'
            }
         });
         return { success: true, response };
      } catch (error) {
         if (error.message.includes('CERT_')) {
            new Notice(
               `Feed "${feedTitle}" ignoré : Certificat SSL invalide. 
                  Veuillez vérifier la sécurité du site avant de l'ajouter.`, 
               7000
            );
            console.warn(`Feed ignoré (SSL invalide): ${feedUrl}`);
            return { 
               success: false, 
               error: 'invalid_cert',
               message: 'Certificat SSL invalide'
            };
         }
         throw error;
      }
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

      containerEl.createEl('h1', {text: 'dddètres'});

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

      containerEl.createEl('hr');

      // Section Import/Export
      containerEl.createEl('h1', {text: 'Import/Export'});
      
      new Setting(containerEl)
         .setName('Import OPML')
         .setDesc('Importer des feeds depuis un fichier OPML')
         .addButton(button => button
            .setButtonText('Importer OPML')
            .onClick(() => {
               const input = document.createElement('input');
               input.type = 'file';
               input.accept = '.opml,.xml';
               input.onchange = async (e) => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                     const result = await this.plugin.importOpml(e.target.result);
                     if (result.success) {
                        new Notice('Feeds importés avec succès');
                     }
                     this.display();
                  };
                  reader.readAsText(file);
               };
               input.click();
            }));

      new Setting(containerEl)
         .setName('Export OPML')
         .setDesc('Exporter vos feeds au format OPML')
         .addButton(button => button
            .setButtonText('Exporter OPML')
            .onClick(() => {
               this.plugin.exportOpml();
               new Notice('Feeds exportés avec succès');
            }));

      containerEl.createEl('hr');

      // Section de gestion des groupes
      containerEl.createEl('h1', {text: 'Gestion des Groupes'});
      
      // Afficher les groupes existants
      this.plugin.settings.groups.forEach((group, index) => {
         if (group !== 'Sans groupe') {
            new Setting(containerEl)
               .setName(group)
               .addButton(button => button
                  .setButtonText('Supprimer')
                  .setWarning()
                  .onClick(async () => {
                     try {
                        const groupPath = `${this.plugin.settings.rssFolder}/${group}`;
                        
                        // Supprimer le dossier et son contenu
                        await this.plugin.removeFolder(groupPath);
                        
                        // Déplacer les feeds de ce groupe vers "Sans groupe"
                        this.plugin.settings.feeds.forEach(feed => {
                           if (feed.group === group) {
                              feed.group = '';
                           }
                        });
                        
                        // Supprimer le groupe des paramètres
                        this.plugin.settings.groups.splice(index, 1);
                        await this.plugin.saveData(this.plugin.settings);
                        
                        new Notice(`Groupe et dossier supprimés : ${group}`);
                        this.display();
                     } catch (error) {
                        console.error(`Erreur lors de la suppression du groupe ${group}:`, error);
                        new Notice('Erreur lors de la suppression du groupe et du dossier');
                     }
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
                  const groupName = inputText.trim();
                  if (!this.plugin.settings.groups.includes(groupName)) {
                     // Créer le dossier pour le nouveau groupe
                     await this.plugin.ensureFolder(`${this.plugin.settings.rssFolder}/${groupName}`);
                     
                     // Ajouter le groupe aux paramètres
                     this.plugin.settings.groups.push(groupName);
                     await this.plugin.saveData(this.plugin.settings);
                     new Notice(`Groupe ajouté : ${groupName}`);
                     this.display();
                  } else {
                     new Notice('Ce groupe existe déjà !');
                  }
               }
            }));


      containerEl.createEl('hr');
      containerEl.createEl('h1', {text: 'Gestion des feeds'});

      // Barre de recherche pour les feeds
      const searchContainer = containerEl.createDiv('search-container');
      const searchInput = searchContainer.createEl('input', {
         type: 'text',
         placeholder: 'Rechercher un feed...',
         cls: 'feed-search-input'
      });

      // Container pour tous les feeds
      const feedsContainer = containerEl.createDiv('feeds-container');
      
      // Fonction pour filtrer et afficher les feeds
      const filterAndDisplayFeeds = (searchTerm = '') => {
         feedsContainer.empty();
         const groupedFeeds = {};
         
         this.plugin.settings.feeds
            .filter(feed => 
               feed.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               feed.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (feed.group || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            .forEach((feed, index) => {
               const group = feed.group || 'Sans groupe';
               if (!groupedFeeds[group]) {
                  groupedFeeds[group] = [];
               }
               groupedFeeds[group].push({feed, index});
            });

         Object.entries(groupedFeeds).forEach(([groupName, feeds]) => {
            if (groupName !== 'Sans groupe' || feeds.length > 0) {
               feedsContainer.createEl('h2', {text: groupName});
            }

            feeds.forEach(({feed, index}) => {
               const feedContainer = feedsContainer.createDiv('feed-container collapsed');
               const headerContainer = feedContainer.createDiv('feed-header');
               const optionsContainer = feedContainer.createDiv('feed-options');
               optionsContainer.style.display = 'none';

               // Créer un conteneur pour les boutons
               const buttonContainer = headerContainer.createDiv('feed-buttons');

               let toggleButton;

               // Fonction pour toggle le feed
               const toggleFeed = () => {
                  const isCollapsed = feedContainer.classList.contains('collapsed');
                  feedContainer.classList.toggle('collapsed');
                  optionsContainer.style.display = isCollapsed ? 'block' : 'none';
                  if (toggleButton) {
                     toggleButton.setIcon(isCollapsed ? 'chevron-up' : 'chevron-down');
                  }
               };

               // En-tête du feed
               const headerSetting = new Setting(headerContainer)
                  .setName(feed.title)
                  .setDesc(feed.url);

               // Ajouter les boutons dans leur conteneur
               new Setting(buttonContainer)
                  .addExtraButton(button => button
                     .setIcon(feed.status === 'active' ? 'check-circle' : 'circle')
                     .setTooltip(feed.status === 'active' ? 'Actif' : 'Pausé')
                     .onClick(async () => {
                        feed.status = feed.status === 'active' ? 'paused' : 'active';
                        await this.plugin.saveData(this.plugin.settings);
                        button.setIcon(feed.status === 'active' ? 'check-circle' : 'circle');
                        new Notice(`Feed ${feed.title} ${feed.status === 'active' ? 'activé' : 'pausé'}`);
                     }))
                  .addExtraButton(button => {
                     toggleButton = button;
                     button.setIcon('chevron-down')
                        .setTooltip('Afficher/Masquer les options')
                        .onClick(() => toggleFeed());
                     return button;
                  });

               // Rendre le header cliquable
               headerContainer.addEventListener('click', (event) => {
                  const target = event.target;
                  if (!target.closest('.feed-buttons')) {
                     toggleFeed();
                  }
               });

               // Options du feed
               new Setting(optionsContainer)
                  .setName('Type de sauvegarde')
                  .addDropdown(d => d
                     .addOption('feed', 'Un fichier par article')
                     .addOption('uniqueFile', 'Fichier unique')
                     .setValue(feed.type)
                     .onChange(async (value) => {
                        this.plugin.settings.feeds[index].type = value;
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(`Type de sauvegarde modifié pour ${feed.title}`);
                     }));

               // Ajouter un identifiant unique au container pour le retrouver après refresh
               feedContainer.setAttribute('data-feed-id', feed.url);

               // Options du feed
               new Setting(optionsContainer)
                  .setName('Groupe')
                  .addDropdown(dropdown => {
                     dropdown.addOption('', 'Sans groupe');
                     this.plugin.settings.groups.forEach(g => 
                        dropdown.addOption(g, g)
                     );
                     dropdown.setValue(feed.group || '');
                     dropdown.onChange(async (value) => {
                        this.plugin.settings.feeds[index].group = value;
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(`Feed ${feed.title} déplacé vers ${value || 'Sans groupe'}`);
                     });
                  });

               // Options avancées avec notifications
               new Setting(optionsContainer)
                  .setName('Résumé AI')
                  .setDesc('Génère automatiquement un résumé concis de chaque article')
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
                        new Notice(`Résumé AI ${value ? 'activé' : 'désactivé'} pour ${feed.title}`);
                     }));

               new Setting(optionsContainer)
                  .setName('Réécriture AI')
                  .setDesc('Réécrit l\'article dans un style plus clair')
                  .addToggle(toggle => toggle
                     .setValue(feed.rewrite || false)
                     .onChange(async (value) => {
                        if (value && !this.plugin.settings.openaiKey) {
                           new Notice('⚠️ Clé API OpenAI manquante dans les paramètres');
                           toggle.setValue(false);
                           return;
                        }
                        this.plugin.settings.feeds[index].rewrite = value;
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(`Réécriture AI ${value ? 'activée' : 'désactivée'} pour ${feed.title}`);
                     }));

               new Setting(optionsContainer)
                  .setName('Transcription YouTube')
                  .setDesc('Transcrit les vidéos YouTube en texte')
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
                        new Notice(`Transcription YouTube ${value ? 'activée' : 'désactivée'} pour ${feed.title}`);
                     }));

               new Setting(optionsContainer)
                  .addButton(button => button
                     .setButtonText('Supprimer ce feed')
                     .setWarning()
                     .onClick(async () => {
                        this.plugin.settings.feeds.splice(index, 1);
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(`Feed supprimé : ${feed.title}`);
                        filterAndDisplayFeeds(searchInput.value);
                     }));
            });
         });
      };

      // Initialiser l'affichage et configurer la recherche
      searchInput.addEventListener('input', () => {
         filterAndDisplayFeeds(searchInput.value);
      });
      filterAndDisplayFeeds();

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
                        url: value,
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Accept': 'application/atom+xml,application/xml,text/xml,*/*'
                        }
                     });
                     
                     const parser = new DOMParser();
                     const doc = parser.parseFromString(response.text, 'text/xml');
                     
                     // Vérifier si c'est un feed valide
                     const isAtom = !!doc.querySelector('feed');
                     const isRss = !!doc.querySelector('rss, channel');
                     
                     if (!isAtom && !isRss) {
                        new Notice('❌ URL invalide : Ce n\'est pas un feed RSS/Atom valide');
                        return;
                     }

                     const title = doc.querySelector('channel > title, feed > title')?.textContent || 'Nouveau feed';
                     
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
                     if (error.message.includes('CERT_')) {
                        new Notice(
                            '❌ Erreur de certificat SSL\n' +
                            'Le site a un certificat invalide.\n' +
                            'Vérifiez si le site est accessible dans votre navigateur.'
                        );
                     } else {
                        new Notice(`❌ Erreur : ${error.message}`);
                     }
                  }
               }
            }));

      // Ajouter un bouton pour supprimer tous les feeds
      new Setting(containerEl)
         .addButton(button => button
            .setButtonText('Supprimer tous les feeds')
            .setWarning()
            .onClick(async () => {
               const confirmation = await this.confirmDelete('tous les feeds');
               if (confirmation) {
                  this.plugin.settings.feeds = [];
                  await this.plugin.saveData(this.plugin.settings);
                  new Notice('Tous les feeds ont été supprimés');
                  this.display();
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

// Ajouter ces styles CSS
document.head.appendChild(Object.assign(document.createElement('style'), {
   textContent: `
      .feed-search-input {
         width: 100%;
         padding: 8px;
         margin-bottom: 16px;
         border-radius: 4px;
         border: 1px solid var(--background-modifier-border);
      }
      
      .feed-header {
         cursor: pointer;
         transition: background-color 0.2s ease;
         display: flex;
         justify-content: space-between;
         align-items: center;
         padding: 8px;
      }
      
      .feed-header:hover {
         background-color: var(--background-modifier-hover);
      }
      
      .feed-container {
         margin-bottom: 8px;
         border: 1px solid var(--background-modifier-border);
         border-radius: 4px;
         overflow: hidden;
      }
      
      .feed-options {
         padding: 8px;
         border-top: 1px solid var(--background-modifier-border);
      }
      
      .feed-container.collapsed {
         background-color: var(--background-primary);
      }

      .feed-buttons {
         display: flex;
         align-items: center;
         gap: 8px;
         margin-left: auto;
      }

      .feed-buttons .setting-item {
         border: none;
         padding: 0;
         margin: 0;
      }

      .feed-buttons .setting-item-control {
         padding: 0;
         margin: 0;
      }

      .feed-header .setting-item {
         border: none;
         flex-grow: 1;
         margin: 0;
         padding: 0;
      }
   `
}));

module.exports = RSSReaderPlugin; 