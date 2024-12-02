'use strict';

const { Plugin, PluginSettingTab, Setting, requestUrl, Notice, Modal, sanitizeHTMLToDom } = require('obsidian');

class RSSReaderPlugin extends Plugin {
   async onload() {
      const savedData = await this.loadData();
      console.log('Données chargées:', savedData);
      
      this.settings = Object.assign({}, {
         feeds: [],
         groups: ['Défaut'],
         openaiKey: '',
         rssFolder: 'RSS',
         fetchFrequency: 'hourly',
         fetchInterval: 3600,
         maxArticles: 50,
         retentionDays: 30,
         lastFetch: Date.now(),
         readingMode: false,
         lastReadArticle: null,
         currentFeed: null,
         currentFolder: null,
         articleStates: {},
      }, savedData);
      
      console.log('Settings après fusion:', this.settings);
      
      // Obtenir la locale d'Obsidian correctement
      const locale = window.moment.locale() || 'en';
      
      // Définir les traductions
      const translations = {
         fr: {
         "settings": {
            "title": "Paramètres du lecteur RSS",
            "openaiKey": {
               "name": "Clé API OpenAI",
               "desc": "Votre clé API OpenAI pour les résumés"
            },
            "rssFolder": {
               "name": "Dossier RSS",
               "desc": "Dossier où seront sauvegardés les articles"
            },
            "fetchFrequency": {
               "name": "Fréquence de mise à jour",
               "desc": "À quelle fréquence voulez-vous récupérer les nouveaux articles ?",
               "options": {
                  "startup": "Au démarrage uniquement",
                  "daily": "Une fois par jour",
                  "hourly": "Toutes les heures"
               }
            },
            "maxArticles": {
               "name": "Nombre maximum d'articles",
               "desc": "Nombre maximum d'articles à récupérer par feed"
            },
            "retentionDays": {
               "name": "Durée de rétention (jours)",
               "desc": "Nombre de jours pendant lesquels garder les articles avant suppression"
            },
            "importExport": {
               "title": "Import/Export",
               "opmlImport": {
                  "name": "Import d'un fichier OPML",
                  "desc": "Importer des feeds depuis un fichier OPML",
                  "button": "Importer OPML"
               },
               "opmlExport": {
                  "name": "Export vers OPML",
                  "desc": "Exporter vos feeds au format OPML",
                  "button": "Exporter OPML"
               },
               "jsonImport": {
                  "name": "Importer une configuration JSON",
                  "desc": "Restaurer une configuration précédemment exportée",
                  "button": "Importer data.json"
               },
               "jsonExport": {
                  "name": "Exporter la configuration JSON",
                  "desc": "Sauvegarder tous vos paramètres dans un fichier",
                  "button": "Exporter data.json"
               }
            },
            "groups": {
               "title": "Gestion des Groupes",
               "add": {
                  "name": "Ajouter un groupe",
                  "desc": "Créer un nouveau groupe pour organiser vos feeds (appuyez sur Entrée pour ajouter)",
                  "placeholder": "Nom du nouveau groupe",
                  "success": "Groupe ajouté :"
               },
               "delete": {
                  "button": "Supprimer",
                  "confirm": "Êtes-vous sûr de vouloir supprimer ce groupe ?",
                  "success": "Groupe supprimé :"
               },
               "none": "Sans groupe"
            },
            "feeds": {
               "title": "Gestion des feeds",
               "search": {
                  "placeholder": "Rechercher un feed..."
               },
               "add": {
                  "name": "Ajouter un feed",
                  "desc": "Entrez l'URL d'un flux RSS",
                  "placeholder": "URL du feed RSS",
                  "success": "Feed ajouté : {title}"
               },
               "options": {
                  "saveType": "Type de sauvegarde",
                  "saveTypes": {
                     "multiple": "Un fichier par article",
                     "single": "Fichier unique"
                  },
                  "group": "Groupe",
                  "noGroup": "Sans groupe",
                  "aiSummary": {
                     "name": "Résumé AI",
                     "desc": "Génère automatiquement un résumé concis de chaque article"
                  },
                  "aiRewrite": {
                     "name": "Réécriture AI",
                     "desc": "Réécrit l'article dans un style plus clair"
                  },
                  "ytTranscript": {
                     "name": "Transcription YouTube",
                     "desc": "Transcrit les vidéos YouTube en texte"
                  }
               },
               "delete": {
                  "button": "Supprimer",
                  "confirm": "Confirmation de suppression",
                  "confirmMessage": "Êtes-vous sûr de vouloir supprimer {feedTitle} ?",
                  "cancel": "Annuler",
                  "success": "Feed supprimé"
               },
               "deleteAll": {
                  "button": "Supprimer tous les feeds",
                  "success": "Tous les feeds ont été supprimés"
               },
               "add": {
                  "name": "Ajouter un feed",
                  "desc": "Entrez l'URL d'un flux RSS",
                  "placeholder": "URL du feed RSS",
                  "error": "URL invalide ou feed déjà existant",
                  "success": "Feed ajouté avec succès :",
                  "fetching": "Récupération des articles pour",
                  "noArticles": "Aucun article trouvé pour",
                  "fetchError": "Erreur lors de la récupération des articles pour",
                  "sslError": "Erreur de certificat SSL\nLe site a un certificat invalide.\nVérifiez si le site est accessible dans votre navigateur."
               },
               "group": {
                  "add": "Ajouter un groupe",
                  "name": "Nom du groupe",
                  "placeholder": "Entrez le nom du groupe",
                  "cancel": "Annuler",
                  "create": "Créer",
                  "error": "Le nom du groupe ne peut pas être vide",
                  "none": "Sans groupe"
               },
               "search": {
                  "placeholder": "Rechercher un feed..."
               },
               "summarize": {
                  "name": "Résumé AI",
                  "desc": "Génère automatiquement un résumé concis de chaque article"
               },
               "rewrite": {
                  "name": "Réécriture AI",
                  "desc": "Réécrit l'article dans un style plus clair"
               },
               "transcribe": {
                  "name": "Transcription YouTube",
                  "desc": "Transcrire les vidéos YouTube en texte"
               }
            }
         },
         "notices": {   
            "import": {
               "opml": {
                  "loading": "Import OPML en cours...",
                  "success": "Import OPML terminé avec succès",
                  "error": "Erreur lors de l'import OPML"
               },
               "json": {
                  "loading": "Import de la configuration en cours...",
                  "success": "Configuration importée avec succès",
                  "error": "Erreur lors de l'import de la configuration"
               }
            },
            "export": {
               "opml": {
                  "loading": "Export OPML en cours...",
                  "success": "Feeds exportés avec succès",
                  "error": "Erreur lors de l'export OPML"
               },
               "json": {
                  "loading": "Export de la configuration en cours...",
                  "success": "Configuration exportée avec succès",
                  "error": "Erreur lors de l'export de la configuration"
               }
            },
            "feed": {
               "exists": "Ce feed RSS est déjà dans votre liste",
               "invalid": "URL invalide : Ce n'est pas un feed RSS/Atom valide",
               "added": "Feed ajouté : {title}",
               "deleted": "Feed supprimé : {title}",
               "moved": "Feed {title} déplacé de \"{source}\" vers \"{destination}\"",
               "fetchError": "Erreur lors de la récupération du feed {title}",
               "fetchSuccess": "{count} articles récupérés pour {title}",
               "noArticles": "Aucun article trouvé pour {title}",
               "error": {
                  "title": "Erreur du feed",
                  "lastError": "Dernière erreur : {message}",
                  "lastUpdate": "Dernière mise à jour : {date}",
                  "retry": "Réessayer"
              }
            },
            "group": {
               "added": "Groupe ajouté :",
               "exists": "Ce groupe existe déjà !",
               "deleted": "Groupe et dossier supprimés :"
            },
            "article": {
               "marked": "Article marqué comme lu",
               "deleted": "Article supprimé"
            },
            "errors": {
               "ssl": "Erreur de certificat SSL\nLe site a un certificat invalide.\nVérifiez si le site est accessible dans votre navigateur.",
               "generic": "Erreur : {message}"
            },
            "settings": {
               "feedTypeChanged": "Type de sauvegarde modifié pour {title}",
               "feedGroupChanged": "Feed {title} déplacé vers {group}",
               "feedStatusChanged": "Feed {title} {status}",
               "feedDeleted": "Feed {title} supprimé",
               "feedAdded": "Feed {title} ajouté",
               "aiToggled": "{feature} {status} pour {title}"
            }
         },
         "ribbons": {
            "refresh": {
               "name": "Rafraîchir les flux RSS",
               "tooltip": "Rafraîchir les flux RSS"
            },
            "reading": {
               "name": "Mode Lecture RSS",
               "tooltip": "Activer/Désactiver le mode lecture"
            }
         },
         "commands": {
            "importOpml": {
               "name": "Importer un fichier OPML",
               "desc": "Importer un fichier OPML"
            },
            "exportOpml": {
               "name": "Exporter en OPML",
               "desc": "Exporter un fichier OPML"
            },
            "nextArticle": {
               "name": "Article suivant",
               "desc": "Aller à l'article suivant"
            },
            "previousArticle": {
               "name": "Article précédent",
               "desc": "Aller à l'article précédent"
            }
         },
         "placeholders": {
            "searchFeeds": "Rechercher dans vos feeds...",
            "addFeed": "Entrez l'URL d'un flux RSS",
            "addGroup": "Entrez le nom du groupe",
            "noFeeds": "Aucun feed trouvé",
            "noArticles": "Aucun article trouvé",
            "loading": "Chargement..."
         }
         },
         en: {
         "settings": {
            "title": "RSS Flowz eeeeeSettings",
            "openaiKey": {
                  "name": "OpenAI API Key",
                  "desc": "Your OpenAI API key for summaries"
            },
            "rssFolder": {
                  "name": "RSS Folder",
                  "desc": "Folder where articles will be saved"
            },
            "fetchFrequency": {
                  "name": "Update Frequency",
                  "desc": "How often do you want to fetch new articles?",
                  "options": {
                     "startup": "At startup only",
                     "daily": "Once a day",
                     "hourly": "Every hour"
                  }
            },
            "maxArticles": {
                  "name": "Maximum Number of Articles",
                  "desc": "Maximum number of articles to fetch per feed"
            },
            "retentionDays": {
                  "name": "Retention Period (days)",
                  "desc": "Number of days to keep articles before deletion"
            },
            "importExport": {
                  "title": "Import/Export",
                  "opmlImport": {
                     "name": "Import OPML File",
                     "desc": "Import feeds from an OPML file",
                     "button": "Import OPML"
                  },
                  "opmlExport": {
                     "name": "Export to OPML",
                     "desc": "Export your feeds in OPML format",
                     "button": "Export OPML"
                  },
                  "jsonImport": {
                     "name": "Import JSON Configuration",
                     "desc": "Restore a previously exported configuration",
                     "button": "Import data.json"
                  },
                  "jsonExport": {
                     "name": "Export JSON Configuration",
                     "desc": "Backup all your settings into a file",
                     "button": "Export data.json"
                  }
            },
            "groups": {
                  "title": "Group Management",
                  "add": {
                     "name": "Add a Group",
                     "desc": "Create a new group to organize your feeds (press Enter to add)",
                     "placeholder": "Name of the new group",
                     "success": "Group added:"
                  },
                  "delete": {
                     "button": "Delete",
                     "confirm": "Are you sure you want to delete this group?",
                     "success": "Group deleted:"
                  },
                  "none": "No group"
            },
            "feeds": {
                  "title": "Feed Management",
                  "search": {
                     "placeholder": "Search for a feed..."
                  },
                  "add": {
                     "name": "Add a Feed",
                     "desc": "Enter the URL of an RSS feed",
                     "placeholder": "RSS feed URL",
                     "success": "Feed added:"
                  },
                  "options": {
                     "saveType": "Save Type",
                     "saveTypes": {
                        "multiple": "One file per article",
                        "single": "Single file"
                     },
                     "group": "Group",
                     "noGroup": "No group",
                     "aiSummary": {
                        "name": "AI Summary",
                        "desc": "Automatically generate a concise summary of each article"
                     },
                     "aiRewrite": {
                        "name": "AI Rewrite",
                        "desc": "Rewrite the article in a clearer style"
                     },
                     "ytTranscript": {
                        "name": "YouTube Transcript",
                        "desc": "Transcribe YouTube videos into text"
                     }
                  },
                  "deleteAll": {
                     "button": "Delete all feeds",
                     "confirm": "Are you sure you want to delete all feeds?"
                  },
                  "delete": {
                     "button": "Delete",
                     "confirm": "Are you sure you want to delete this feed?",
                     "confirmMessage": "Are you sure you want to delete {feedTitle}?",
                     "cancel": "Cancel",
                     "success": "Feed deleted"
                  },
                  "add": {
                     "name": "Add a Feed",
                     "desc": "Enter the URL of an RSS feed",
                     "placeholder": "RSS feed URL",
                     "error": "Invalid URL or feed already exists",
                     "success": "Feed added successfully:",
                     "fetching": "Fetching articles for",
                     "noArticles": "No articles found for",
                     "fetchError": "Error fetching articles for",
                     "sslError": "SSL Certificate Error\nThe site has an invalid certificate.\nCheck if the site is accessible in your browser."
                  },
                  "group": {
                     "add": "Add a Group",
                     "name": "Group Name",
                     "placeholder": "Enter the name of the group",
                     "cancel": "Cancel",
                     "create": "Create",
                     "error": "The group name cannot be empty",
                     "none": "No group"
                  },
                  "search": {
                     "placeholder": "Search for a feed..."
                  },
                  "summarize": {
                     "name": "AI Summary",
                     "desc": "Automatically generate a concise summary of each article"
                  },
                  "rewrite": {
                     "name": "AI Rewrite",
                     "desc": "Rewrite the article in a clearer style"
                  },
                  "transcribe": {
                     "name": "YouTube Transcript",
                     "desc": "Transcribe YouTube videos into text"
                  }
            }
         },
         "notices": {
            "import": {
                  "opml": {
                     "loading": "Importing OPML...",
                     "success": "OPML import successful",
                     "error": "Error importing OPML"
                  },
                  "json": {
                     "loading": "Importing configuration...",
                     "success": "Configuration imported successfully",
                     "error": "Error importing configuration"
                  }
            },
            "export": {
                  "opml": {
                     "loading": "Exporting OPML...",
                     "success": "Feeds exported successfully",
                     "error": "Error exporting OPML"
                  },
                  "json": {
                     "loading": "Exporting configuration...",
                     "success": "Configuration exported successfully",
                     "error": "Error exporting configuration"
                  }
            },
            "feed": {
                  "exists": "This RSS feed is already in your list",
                  "invalid": "Invalid URL: This is not a valid RSS/Atom feed",
                  "added": "Feed added: {title}",
                  "deleted": "Feed deleted: {title}",
                  "moved": "Feed {title} moved from \"{source}\" to \"{destination}\"",
                  "fetchError": "Error fetching feed {title}",
                  "fetchSuccess": "{count} articles fetched for {title}",
                  "noArticles": "No articles found for {title}",
                  "error": {
                     "title": "Feed Error",
                     "lastError": "Last error: {message}",
                     "lastUpdate": "Last update: {date}",
                     "retry": "Retry"
                  }
            },
            "group": {
                  "added": "Group added: {name}",
                  "exists": "This group already exists!",
                  "deleted": "Group and folder deleted: {name}"
            },
            "article": {
                  "marked": "Article marked as read",
                  "deleted": "Article deleted"
            },
            "errors": {
                  "ssl": "SSL Certificate Error\nThe site has an invalid certificate.\nCheck if the site is accessible in your browser.",
                  "generic": "Error: {message}"
            },
            "settings": {
               "feedTypeChanged": "Save type changed for {title}",
               "feedGroupChanged": "Feed {title} moved to {group}",
               "feedStatusChanged": "Feed {title} {status}",
               "feedDeleted": "Feed {title} deleted",
               "feedAdded": "Feed {title} added",
               "aiToggled": "{feature} {status} for {title}"
            }
         },
         "ribbons": {
            "refresh": {
                  "name": "Refresh RSS Feeds",
                  "tooltip": "Refresh RSS feeds"
            },
            "reading": {
                  "name": "RSS Reading Mode",
                  "tooltip": "Enable/Disable reading mode"
            }
         },
         "commands": {
            "importOpml": {
                  "name": "Import OPML file",
                  "desc": "Import an OPML file"
            },
            "exportOpml": {
                  "name": "Export OPML file",
                  "desc": "Export an OPML file"
            },
            "nextArticle": {
                  "name": "Next Article",
                  "desc": "Go to next article"
            },
            "previousArticle": {
                  "name": "Previous Article",
                  "desc": "Go to previous article"
            }
         },
         placeholders: {
            searchFeeds: "Search your feeds...",
            addFeed: "Enter RSS feed URL",
            addGroup: "Enter group name",
            noFeeds: "No feeds found",
            noArticles: "No articles found",
            loading: "Loading..."
        }
         
      }
      };

      // Sélectionner les traductions selon la langue
      this.i18n = translations[locale] || translations.en;
      
      // Définir la méthode de traduction
      this.t = (key) => {
         return key.split('.').reduce((o, i) => o?.[i], this.i18n) || key;
      };

      // Vérifier et créer le dossier RSS principal
      await this.ensureFolder(this.settings.rssFolder);
      
      // Créer les dossiers pour les groupes existants
      for (const group of this.settings.groups) {
         await this.ensureFolder(`${this.settings.rssFolder}/${group}`);
      }

   this.addRibbonIcon('refresh-cw', this.t('ribbons.refresh.tooltip'), () => {
      this.fetchAllFeeds();
   });
   
   this.addRibbonIcon('book-open', this.t('ribbons.reading.tooltip'), () => {
      // Mettre à jour l'état immédiatement
      this.settings.readingMode = !this.settings.readingMode;
      
      if (this.settings.readingMode) {
         this.enterReadingMode();
      } else {
         this.exitReadingMode();
      }
      
      // Sauvegarder l'état après le changement
      this.saveData(this.settings);
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
         name: this.t('commands.importOpml.name'),
         desc: this.t('commands.importOpml.desc'),
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
         name: this.t('commands.exportOpml.name'),
         desc: this.t('commands.exportOpml.desc'),
         callback: () => this.exportOpml()
      });

      this.addSettingTab(new RSSReaderSettingTab(this.app, this));

      this.addCommand({
         id: 'next-article',
         name: 'Article suivant',
         callback: () => this.readingMode && this.navigateArticles('next'),
         hotkeys: [{ modifiers: ["Mod"], key: "ArrowRight" }]
      });

      this.addCommand({
         id: 'previous-article',
         name: 'Article précédent',
         callback: () => this.readingMode && this.navigateArticles('previous'),
         hotkeys: [{ modifiers: ["Mod"], key: "ArrowLeft" }]
      });
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
                  'User-Agent': 'Mozilla/5.0',
                  'Accept': 'application/atom+xml,application/xml,text/xml,application/rss+xml,*/*',
                  'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
                  'Cache-Control': 'no-cache'
               }
            });

            // Nettoyer la réponse avant le parsing
            const cleanedContent = response.text.replace(/^\s+/, '').replace(/^\uFEFF/, '');
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleanedContent, 'text/xml');

            // Vérifier les erreurs de parsing
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                  console.error(`Erreur de parsing pour ${feed.url}:`, parseError.textContent);
                  feed.lastError = {
                     message: `Erreur de parsing XML: ${parseError.textContent}`,
                     timestamp: Date.now()
                  };
                  new Notice(this.t('notices.feed.error.title').replace('{title}', feed.title));
                  continue;
            }

            let articles;
            if (doc.querySelector('feed')) {
                articles = await this.parseAtomFeed(doc, feed);
            } else {
                articles = await this.parseRssFeed(doc, feed);
            }

            // Marquer le feed comme fonctionnel
            feed.lastError = null;
            feed.lastSuccessfulFetch = Date.now();

            if (articles && articles.length > 0) {
                await this.saveArticles(articles, feed);
                new Notice(this.t('notices.feed.fetchSuccess')
                    .replace('{count}', articles.length)
                    .replace('{title}', feed.title));
            } else {
                new Notice(this.t('notices.feed.noArticles').replace('{title}', feed.title));
            }
        } catch (error) {
            console.error(`Erreur lors de la récupération du feed ${feed.url}:`, error);
            // Sauvegarder l'erreur dans les paramètres du feed
            feed.lastError = {
                message: error.message,
                timestamp: Date.now()
            };
            new Notice(this.t('notices.feed.fetchError').replace('{title}', feed.title));
        }
    }

    await this.saveData(this.settings);
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

   /*    async parseRssFeed(doc, feed) {
      try {
         // Nettoyer le contenu XML avant le parsing
         const cleanXML = (xml) => {
            // Supprimer BOM et espaces avant <?xml
            return xml.replace(/^\s+/, '').replace(/^\uFEFF/, '');
         };

         // Vérifier si le document est déjà parsé ou s'il faut le parser
         let parsedDoc = doc;
         if (typeof doc === 'string') {
            const parser = new DOMParser();
            parsedDoc = parser.parseFromString(cleanXML(doc), 'text/xml');
         }

         // Vérifier les erreurs de parsing
         const parseError = parsedDoc.querySelector('parsererror');
         if (parseError) {
            console.error(`Erreur de parsing pour ${feed.url}:`, parseError.textContent);
            throw new Error('Invalid XML format');
         }

         const items = Array.from(parsedDoc.querySelectorAll('item'));
         return items
            .slice(0, this.settings.maxArticles)
            .map(item => {
               return {
                  title: item.querySelector('title')?.textContent?.trim() || 'Sans titre',
                  content: item.querySelector('description,content:encoded')?.textContent?.trim() || item.querySelector('content\\:encoded')?.textContent?.trim() || '',
                  date: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
                  link: item.querySelector('link')?.textContent?.trim() || '',
                  tags: feed.tags || [],
                  feedTitle: feed.title
               };
            });
      } catch (error) {
         console.error('Erreur lors du parsing du feed RSS:', error);
         throw error;
      }
   } */
   async cleanOldArticles() {
      await this.cleanArticleStates();
      
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
      const groupFolder = feed.group 
         ? `${baseFolder}/${feed.group}` 
         : baseFolder;
      
      // Fonction utilitaire pour nettoyer le texte et convertir les images
      const cleanText = (text) => {
         // Utiliser DOMParser pour parser correctement le HTML
         const parser = new DOMParser();
         const doc = parser.parseFromString(text, 'text/html');
         
         // Convertir les images en Markdown
         doc.querySelectorAll('img').forEach(img => {
            const markdown = `![](${img.src})`;
            img.replaceWith(parser.parseFromString(markdown, 'text/html').body.textContent);
         });
         
         // Supprimer les styles des balises p
         doc.querySelectorAll('p').forEach(p => {
            p.removeAttribute('style');
         });
         
         // Récupérer le texte nettoyé
         return doc.body.textContent
            .replace(/\r?\n|\r/g, ' ')  // Remplace les sauts de ligne par des espaces
            .replace(/\s+/g, ' ')       // Normalise les espaces multiples
            .replace(/<img.*?src="(.*?)".*?>/g, '![]($1)') // Convertit les images HTML en Markdown
            .trim();                    // Supprime les espaces en début et fin
      };

      // Filtrer les articles déjà supprimés
      const filteredArticles = articles.filter(article => {
         const articleId = this.getArticleId(feed.url, article.link);
         const state = this.settings.articleStates[articleId];
         return !state?.deleted;
      });
      
      if (feed.type === 'uniqueFile') {
         const content = filteredArticles.map(article => {
            const articleId = this.getArticleId(feed.url, article.link);
            const isRead = this.settings.articleStates[articleId]?.read || false;
            return `# ${cleanText(article.title)}\n\nStatut: ${isRead ? '✓ Lu' : '◯ Non lu'}\nDate: ${article.date}\nLien: ${article.link}\n\n${cleanText(article.content)}`;
         }).join('\n\n---\n\n');
         
         const filePath = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
         await this.app.vault.adapter.write(filePath, content);
      } else {
         const feedFolder = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}`;
         await this.ensureFolder(feedFolder);
         
         for (const article of filteredArticles) {
            const articleId = this.getArticleId(feed.url, article.link);
            const isRead = this.settings.articleStates[articleId]?.read || false;
            const fileName = `${feedFolder}/${cleanText(article.title).replace(/[\\/:*?"<>|]/g, '_')}.md`;
            const content = `# ${cleanText(article.title)}\n\nStatut: ${isRead ? '✓ Lu' : '◯ Non lu'}\nDate: ${article.date}\nLien: ${article.link}\n\n${cleanText(article.content)}`;
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
               /(<outline[^>]*)(title="[^"]*&[^"]*\"|category="[^"]*&[^"]*")([^>]*>)/g,
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
            // Récupérer la liste des fichiers et sous-dossiers
            const listing = await adapter.list(path);
            
            // Supprimer d'abord les fichiers
            for (const file of listing.files) {
               await adapter.remove(file);
            }
            
            // Supprimer récursivement les sous-dossiers
            for (const folder of listing.folders) {
               await this.removeFolder(folder);
            }
            
            // Enfin, supprimer le dossier lui-même
            await adapter.rmdir(path);
         }
      } catch (error) {
         console.error(`Erreur lors de la suppression du dossier ${path}:`, error);
         throw error;
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

   async toggleReadingMode() {
      try {
         this.settings.readingMode = !this.settings.readingMode;
         await this.saveData(this.settings);

         if (this.settings.readingMode) {
            await this.enterReadingMode();
         } else {
            await this.exitReadingMode();
         }
      } catch (error) {
         console.error('Erreur lors du toggle du mode lecture:', error);
         new Notice('Erreur lors du changement de mode lecture');
      }
   }

   async enterReadingMode() {
      try {
         const styleEl = document.createElement('style');
         styleEl.id = 'rss-reading-mode-styles';
         styleEl.textContent = `
            /* Limiter la portée du CSS à notre modal uniquement */
            .modal.rss-reading-modal {
               --header-height: 0px !important;
               --file-explorer-width: 0px !important;
               width: 90vw !important;
               height: 90vh !important;
               max-width: none !important;
               max-height: none !important;
               position: fixed !important;
               border-radius: 0 !important;
               border: 1px solid var(--background-modifier-border) !important;
               top: 5vh !important;
               left: 5vw !important;
               z-index: 9999;
               background-color: var(--background-primary);
            }

            .rss-reading-modal .modal-content {
               padding: 0;
               height: 100%;
               display: flex;
               flex-direction: column;
               overflow: hidden;
            }

            .rss-reading-modal .reading-mode-controls {
               display: flex;
               gap: 10px;
               justify-content: center;
               align-items: center;
               padding: 10px;
               border-top: 1px solid var(--background-modifier-border);
               background: var(--background-primary);
               position: sticky;
               bottom: 0;
            }

            .rss-reading-modal .reading-mode-select {
               padding: 8px;
               border-radius: 4px;
               border: 1px solid var(--background-modifier-border);
               background: var(--background-primary);
               color: var(--text-normal);
               min-width: 150px;
            }

            .rss-reading-modal button {
               padding: 8px 16px;
               border-radius: 4px;
               background: var(--interactive-accent);
               color: var(--text-on-accent);
               border: none;
               cursor: pointer;
            }

            .rss-reading-modal button:disabled {
               opacity: 0.5;
               cursor: not-allowed;
            }
         `;
         document.head.appendChild(styleEl);
         
         // Ajouter la classe spécifique à notre modal
         const modalEl = document.querySelector('.modal');
         if (modalEl) {
            modalEl.classList.add('rss-reading-modal');
         }
      } catch (error) {
         console.error('Erreur lors de l\'entrée en mode lecture:', error);
         new Notice('Erreur lors du changement de mode lecture');
      }
   }

   async getCurrentArticle() {
      // Vérifier si un fichier est actuellement ouvert et s'il se trouve dans le dossier RSS
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile && activeFile.path.startsWith(this.settings.rssFolder)) {
          // Lire le contenu du fichier actuellement ouvert s'il est dans le dossier RSS
          const content = await this.app.vault.adapter.read(activeFile.path);
          const articles = content.split('\n---\n');
          const article = articles[0]; // ou sélectionner l'article actif basé sur une certaine logique
          const titleMatch = article.match(/# (.*)/);
          const linkMatch = article.match(/Lien: (.*)/);
          const dateMatch = article.match(/Date: (.*)/);

          return {
              title: titleMatch ? titleMatch[1] : 'Sans titre',
              link: linkMatch ? linkMatch[1] : '',
              date: dateMatch ? dateMatch[1] : '',
              content: article,
              feedUrl: activeFile.path,
              feedTitle: titleMatch ? titleMatch[1] : 'Sans titre',
              path: activeFile.path
          };
      }

      // Si aucun fichier n'est ouvert ou s'il n'est pas dans le dossier RSS, trouver le dernier article lu ou le premier non lu
      const feeds = await this.app.vault.getFiles().filter(file => file.path.startsWith(this.settings.rssFolder));
      if (feeds.length > 0) {
          // Implémenter la logique pour trouver le dernier article lu ou le premier non lu
          // Exemple simplifié : retourner le premier fichier trouvé
          const content = await this.app.vault.adapter.read(feeds[0].path);
          const articles = content.split('\n---\n');
          const article = articles[0]; // ou une logique pour trouver le dernier lu ou le premier non lu
          const titleMatch = article.match(/# (.*)/);
          const linkMatch = article.match(/Lien: (.*)/);
          const dateMatch = article.match(/Date: (.*)/);

          return {
              title: titleMatch ? titleMatch[1] : 'Sans titre',
              link: linkMatch ? linkMatch[1] : '',
              date: dateMatch ? dateMatch[1] : '',
              content: article,
              feedUrl: feeds[0].path,
              feedTitle: titleMatch ? titleMatch[1] : 'Sans titre',
              path: feeds[0].path
          };
      }

      // Si aucun feed n'est trouvé
      console.error("Aucun article de feed trouvé.");
      throw new Error('Aucun article de feed trouvé');
   }

   async exitReadingMode() {
      try {
         const styleEl = document.getElementById('rss-reading-mode-styles');
         if (styleEl) {
            styleEl.remove();
         }
         document.body.classList.remove('reading-mode-active');
      } catch (error) {
         console.error('Erreur lors de la sortie du mode lecture:', error);
         new Notice('Erreur lors du changement de mode lecture');
      }
   }

   updateFeedSelect(selectElement, currentFolder) {
      // Vider le select
      selectElement.innerHTML = '';
      
      // Filtrer les feeds du dossier sélectionné
      const feeds = this.settings.feeds.filter(feed => 
         (currentFolder === 'Défaut' && !feed.group) || 
         feed.group === currentFolder
      );

      // Ajouter une option par défaut
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.text = 'Sélectionner un feed...';
      selectElement.appendChild(defaultOption);

      // Ajouter une option pour chaque feed
      feeds.forEach(feed => {
         const option = document.createElement('option');
         option.value = feed.url;
         option.text = feed.title;
         if (feed.url === this.settings.currentFeed) {
            option.selected = true;
         }
         selectElement.appendChild(option);
      });

      // Ajouter l'événement de changement
      selectElement.addEventListener('change', (e) => {
         this.settings.currentFeed = e.target.value;
         this.saveData(this.settings);
         // Ici vous pourrez ajouter la logique pour charger les articles du feed sélectionné
      });
   }

   async selectFolder(folderName) {
      this.settings.currentFolder = folderName;
      await this.saveData(this.settings);
      
      // Mettre à jour le sélecteur de feeds
      const feedSelect = this.readingModeContainer.querySelector('.reading-mode-select:nth-child(2)');
      if (feedSelect) {
         this.updateFeedSelect(feedSelect, folderName);
      }
   }

   getArticleId(feedUrl, articleLink) {
      return `${feedUrl}::${articleLink}`;
   }

   async markArticleAsRead(feedUrl, articleLink) {
      const articleId = this.getArticleId(feedUrl, articleLink);
      this.settings.articleStates[articleId] = {
         ...this.settings.articleStates[articleId],
         read: true,
         lastUpdate: Date.now()
      };
      await this.saveData(this.settings);
   }

   async markArticleAsDeleted(feedUrl, articleLink) {
      const articleId = this.getArticleId(feedUrl, articleLink);
      this.settings.articleStates[articleId] = {
         ...this.settings.articleStates[articleId],
         deleted: true,
         lastUpdate: Date.now()
      };
      await this.saveData(this.settings);
   }

   async markCurrentArticleAsRead() {
      if (!this.settings.currentFeed || !this.settings.lastReadArticle) return;
      
      await this.markArticleAsRead(this.settings.currentFeed, this.settings.lastReadArticle);
      // Rafraîchir l'affichage de l'article
      await this.refreshCurrentArticle();
      new Notice('Article marqué comme lu');
   }

   async deleteCurrentArticle() {
      if (!this.settings.currentFeed || !this.settings.lastReadArticle) return;
      
      await this.markArticleAsDeleted(this.settings.currentFeed, this.settings.lastReadArticle);
      // Supprimer le fichier physiquement
      const feed = this.settings.feeds.find(f => f.url === this.settings.currentFeed);
      if (feed) {
         const baseFolder = this.settings.rssFolder;
         const groupFolder = feed.group ? `${baseFolder}/${feed.group}` : baseFolder;
         const articlePath = feed.type === 'uniqueFile'
            ? `${groupFolder}/${feed.title}.md`
            : `${groupFolder}/${feed.title}/${this.settings.lastReadArticle}.md`;
         
         try {
            await this.app.vault.adapter.remove(articlePath);
            new Notice('Article supprimé');
            // Passer à l'article suivant
            await this.navigateArticles('next');
         } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            new Notice('Erreur lors de la suppression de l\'article');
         }
      }
   }

   async cleanArticleStates() {
      const now = Date.now();
      const retentionPeriod = this.settings.retentionDays * 86400000; // conversion en millisecondes
      
      const newStates = {};
      for (const [articleId, state] of Object.entries(this.settings.articleStates)) {
         if (now - state.lastUpdate < retentionPeriod) {
            newStates[articleId] = state;
         }
      }
      
      this.settings.articleStates = newStates;
      await this.saveData(this.settings);
   }

   async navigateArticles(direction) {
      try {
          // Récupérer tous les feeds du groupe actuel
          const currentGroup = this.settings.currentFolder || 'Défaut';
          const groupFeeds = this.settings.feeds.filter(feed => 
              (currentGroup === 'Défaut' && !feed.group) || 
              feed.group === currentGroup
          );

          // Si un feed spécifique est sélectionné, filtrer uniquement ses articles
          if (this.settings.currentFeed) {
              groupFeeds = groupFeeds.filter(f => f.url === this.settings.currentFeed);
          }

          if (!groupFeeds.length) {
              new Notice('Aucun feed disponible dans ce groupe');
              return;
          }

          // Récupérer tous les articles des feeds sélectionnés
          let allArticles = [];
          for (const feed of groupFeeds) {
              const baseFolder = this.settings.rssFolder;
              const groupFolder = feed.group ? `${baseFolder}/${feed.group}` : baseFolder;

              try {
                  if (feed.type === 'uniqueFile') {
                      // Pour les feeds en fichier unique
                      const filePath = `${groupFolder}/${feed.title}.md`;
                      const content = await this.app.vault.adapter.read(filePath);
                      const articles = content.split('\n---\n').map(article => {
                          const titleMatch = article.match(/# (.*)/);
                          const linkMatch = article.match(/Lien: (.*)/);
                          const dateMatch = article.match(/Date: (.*)/);
                          return {
                              title: titleMatch?.[1] || 'Sans titre',
                              link: linkMatch?.[1] || '',
                              date: dateMatch?.[1] || '',
                              content: article,
                              feedUrl: feed.url,
                              feedTitle: feed.title,
                              path: filePath
                          };
                      });
                      allArticles.push(...articles);
                  } else {
                      // Pour les feeds multi-fichiers
                      const feedFolder = `${groupFolder}/${feed.title.replace(/[\\/:*?"<>|]/g, '_')}`;
                      const files = await this.app.vault.adapter.list(feedFolder);
                      const articles = await Promise.all(files.files.map(async file => {
                          const content = await this.app.vault.adapter.read(file);
                          const titleMatch = content.match(/# (.*)/);
                          const linkMatch = content.match(/Lien: (.*)/);
                          const dateMatch = content.match(/Date: (.*)/);
                          return {
                              title: titleMatch?.[1] || 'Sans titre',
                              link: linkMatch?.[1] || '',
                              date: dateMatch?.[1] || '',
                              content: content,
                              feedUrl: feed.url,
                              feedTitle: feed.title,
                              path: file
                          };
                      }));
                      allArticles.push(...articles);
                  }
              } catch (error) {
                  console.error(`Erreur lors de la lecture du feed ${feed.title}:`, error);
              }
          }

          // Filtrer les articles supprimés
          allArticles = allArticles.filter(article => {
              const articleId = this.getArticleId(article.feedUrl, article.link);
              return !this.settings.articleStates[articleId]?.deleted;
          });

          // Trier par date (du plus récent au plus ancien)
          allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

          // Trouver l'index de l'article actuel
          let currentIndex = allArticles.findIndex(article => 
              article.link === this.settings.lastReadArticle
          );
          if (currentIndex === -1) currentIndex = direction === 'next' ? -1 : allArticles.length;

          // Calculer le nouvel index
          let newIndex;
          if (direction === 'next') {
              newIndex = currentIndex + 1;
              if (newIndex >= allArticles.length) {
                  new Notice('Fin des articles');
                  return;
              }
          } else if (direction === 'previous') {
              newIndex = currentIndex - 1;
              if (newIndex < 0) {
                  new Notice('Début des articles');
                  return;
              }
          }

          // Ouvrir le nouvel article
          const article = allArticles[newIndex];
          this.settings.lastReadArticle = article.link;
          await this.saveData(this.settings);

          // Ouvrir le fichier
          const file = await this.app.vault.getAbstractFileByPath(article.path);
          if (file) {
              await this.app.workspace.getLeaf().openFile(file);
              
              // Si c'est un fichier unique, scroller jusqu'à l'article
              if (article.feedUrl && this.settings.feeds.find(f => f.url === article.feedUrl)?.type === 'uniqueFile') {
                  setTimeout(() => {
                      const contentEl = this.app.workspace.activeLeaf.view.contentEl;
                      const sections = contentEl.querySelectorAll('h1');
                      for (const section of sections) {
                          if (section.textContent.includes(article.title)) {
                              section.scrollIntoView({ behavior: 'smooth' });
                              break;
                          }
                      }
                  }, 100);
              }
          }

          // Mettre à jour l'interface
          this.updateNavigationButtons(newIndex, allArticles.length);

      } catch (error) {
          console.error('Erreur lors de la navigation:', error);
          new Notice('Erreur lors de la navigation entre les articles');
      }
   }

   // Méthode pour mettre à jour l'état des boutons de navigation
   updateNavigationButtons(currentIndex, totalArticles) {
      const prevButton = this.readingModeContainer.querySelector('button:nth-child(3)');
      const nextButton = this.readingModeContainer.querySelector('button:nth-child(4)');
      
      if (prevButton) {
         prevButton.disabled = currentIndex <= 0;
      }
      if (nextButton) {
         nextButton.disabled = currentIndex >= totalArticles - 1;
      }
   }

   // Méthode pour rafraîchir l'affichage de l'article courant
   async refreshCurrentArticle() {
      const leaf = this.app.workspace.activeLeaf;
      if (leaf && leaf.view) {
         await leaf.view.load();
      }
   }

   // Ajouter cette nouvelle méthode pour la navigation directe vers un article
   async navigateToArticle(articleLink) {
      if (!this.settings.currentFeed) return;
      
      const feed = this.settings.feeds.find(f => f.url === this.settings.currentFeed);
      if (!feed) return;

      this.settings.lastReadArticle = articleLink;
      await this.saveData(this.settings);
      await this.navigateArticles('current'); // Ajouter 'current' comme nouvelle option
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

      containerEl.createEl('h1', {text: this.plugin.t('settings.title')});

      new Setting(containerEl)
            .setName(this.plugin.t('settings.openaiKey.name'))
            .setDesc(this.plugin.t('settings.openaiKey.desc'))
            .addText(text => text
               .setPlaceholder('sk-...')
               .setValue(this.plugin.settings.openaiKey)
               .onChange(async (value) => {
                  this.plugin.settings.openaiKey = value;
                  await this.plugin.saveData(this.plugin.settings);
               }));

      new Setting(containerEl)
         .setName(this.plugin.t('settings.rssFolder.name'))
         .setDesc(this.plugin.t('settings.rssFolder.desc'))
         .addText(text => text
               .setValue(this.plugin.settings.rssFolder)
               .onChange(async (value) => {
                  this.plugin.settings.rssFolder = value;
                  await this.plugin.saveData(this.plugin.settings);
               }));

      new Setting(containerEl)
         .setName(this.plugin.t('settings.fetchFrequency.name'))
         .setDesc(this.plugin.t('settings.fetchFrequency.desc'))
         .addDropdown(dropdown => {
            dropdown.addOption('startup', this.plugin.t('settings.fetchFrequency.options.startup'));
            dropdown.addOption('daily', this.plugin.t('settings.fetchFrequency.options.daily'));
            dropdown.addOption('hourly', this.plugin.t('settings.fetchFrequency.options.hourly'));
            dropdown.setValue(this.plugin.settings.fetchFrequency)
               .onChange(async (value) => {
                  this.plugin.settings.fetchFrequency = value;
                  await this.plugin.saveData(this.plugin.settings);
               });
         })

      new Setting(containerEl)
         .setName(this.plugin.t('settings.maxArticles.name'))
         .setDesc(this.plugin.t('settings.maxArticles.desc'))
         .addText(text => text
               .setValue(String(this.plugin.settings.maxArticles))
               .onChange(async (value) => {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue > 0) {
                     this.plugin.settings.maxArticles = numValue;
                     await this.plugin.saveData(this.plugin.settings);
                     }
                  }
               ));

      new Setting(containerEl)
         .setName(this.plugin.t('settings.retentionDays.name'))
         .setDesc(this.plugin.t('settings.retentionDays.desc'))
         .addText(text => text
               .setValue(String(this.plugin.settings.retentionDays))
               .onChange(async (value) => {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue > 0) {
                     this.plugin.settings.retentionDays = numValue;
                     await this.plugin.saveData(this.plugin.settings);
                  }
               }));

      // Section Import/Export
      containerEl.createEl('h1', {text: this.plugin.t('settings.importExport.title')});
      
      new Setting(containerEl)
         .setName(this.plugin.t('settings.importExport.opmlImport.name'))
         .setDesc(this.plugin.t('settings.importExport.opmlImport.desc'))
         .addButton(button => button
            .setButtonText(this.plugin.t('settings.importExport.opmlImport.button'))
            .onClick(async () => {
               const input = document.createElement('input');
               input.type = 'file';
               input.accept = '.opml,.xml';
               input.style.display = 'none';
               containerEl.appendChild(input);

               input.onchange = async (e) => {
                  if (!e.target.files.length) return;
                  
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  
                  // Notification de début de chargement
                  const loadingNotice = new Notice(this.plugin.t('settings.importExport.opmlImport.loading'), 0);
                  
                  reader.onload = async (e) => {
                     try {
                        await this.plugin.importOpml(e.target.result);
                        loadingNotice.hide(); // Cacher la notification de chargement
                        new Notice(this.plugin.t('settings.importExport.opmlImport.success'));
                     } catch (error) {
                        loadingNotice.hide();
                        new Notice(this.plugin.t('settings.importExport.opmlImport.error'));
                        console.error(error);
                     } finally {
                        input.value = '';
                     }
                  };
                  reader.readAsText(file);
               };

               button
                  .setButtonText(this.plugin.t('settings.importExport.opmlImport.button'))
                  .onClick(() => {
                     input.click();
                  });
               
               return button;
            }));

      new Setting(containerEl)
         .setName(this.plugin.t('settings.importExport.opmlExport.name'))
         .setDesc(this.plugin.t('settings.importExport.opmlExport.desc'))
         .addButton(button => button
            .setButtonText(this.plugin.t('settings.importExport.opmlExport.button'))
            .onClick(async () => {
               const loadingNotice = new Notice(this.plugin.t('settings.importExport.opmlExport.loading'), 0);
               try {
                  await this.plugin.exportOpml();
                  loadingNotice.hide();
                  new Notice(this.plugin.t('settings.importExport.opmlExport.success'));
               } catch (error) {
                  loadingNotice.hide();
                  new Notice(this.plugin.t('settings.importExport.opmlExport.error'));
                  console.error(error);
               }
            }));

            new Setting(containerEl)
            .setName(this.plugin.t('settings.importExport.jsonImport.name'))
            .setDesc(this.plugin.t('settings.importExport.jsonImport.desc'))
            .addButton(button => {
               button
                  .setButtonText(this.plugin.t('settings.importExport.jsonImport.button'))
                  .onClick(() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.style.display = 'none';
                        containerEl.appendChild(input);

                        input.onchange = async (e) => {
                           if (!e.target.files.length) return;
                           
                           const loadingNotice = new Notice(this.plugin.t('settings.importExport.jsonImport.loading'), 0);
                           
                           try {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              
                              reader.onload = async (event) => {
                                    try {
                                       const config = JSON.parse(event.target.result);
                                       
                                       // Vérifier que le fichier contient les champs essentiels
                                       if (!config.feeds || !Array.isArray(config.groups)) {
                                          new Notice(this.plugin.t('settings.importExport.jsonImport.error'));
                                          return;
                                       }

                                       // Créer une sauvegarde de la configuration actuelle
                                       const backup = await this.plugin.loadData();
                                       const backupJson = JSON.stringify(backup, null, 2);
                                       const backupBlob = new Blob([backupJson], { type: 'application/json' });
                                       const backupUrl = window.URL.createObjectURL(backupBlob);
                                       const backupA = document.createElement('a');
                                       backupA.href = backupUrl;
                                       backupA.download = 'rss-reader-config-backup.json';
                                       backupA.click();
                                       window.URL.revokeObjectURL(backupUrl);

                                       // Appliquer la nouvelle configuration
                                       this.plugin.settings = Object.assign({}, this.plugin.settings, config);
                                       await this.plugin.saveData(this.plugin.settings);
                                       
                                       // Recréer les dossiers nécessaires
                                       await this.plugin.ensureFolder(this.plugin.settings.rssFolder);
                                       for (const group of this.plugin.settings.groups) {
                                          if (group !== this.plugin.t('settings.groups.none')) {
                                                await this.plugin.ensureFolder(`${this.plugin.settings.rssFolder}/${group}`);
                                          }
                                       }

                                       // Recréer les dossiers pour chaque feed non-unique
                                       for (const feed of this.plugin.settings.feeds) {
                                          if (feed.type !== 'uniqueFile') {
                                                const feedPath = `${this.plugin.settings.rssFolder}/${feed.group || ''}/${feed.title}`.replace(/\/+/g, '/');
                                                await this.plugin.ensureFolder(feedPath);
                                          }
                                       }

                                       new Notice(this.plugin.t('settings.importExport.jsonImport.success') + '\nUne sauvegarde a été créée');
                                       
                                       // Recharger l'interface des paramètres
                                       this.plugin.settings = await this.plugin.loadData();
                                       this.display();
                                       
                                    } catch (error) {
                                       console.error('Erreur lors du parsing:', error);
                                       new Notice(this.plugin.t('settings.importExport.jsonImport.error'));
                                    }
                              };
                              
                              reader.readAsText(file);
                           } catch (error) {
                              loadingNotice.hide();
                              new Notice(this.plugin.t('settings.importExport.jsonImport.error'));
                              console.error(error);
                           } finally {
                              input.value = '';
                           }
                        };

                        input.click();
                  });
               return button;
            });

      new Setting(containerEl)
         .setName(this.plugin.t('settings.importExport.jsonExport.name'))
         .setDesc(this.plugin.t('settings.importExport.jsonExport.desc'))
         .addButton(button => button
            .setButtonText(this.plugin.t('settings.importExport.jsonExport.button'))
            .onClick(async () => {
               const loadingNotice = new Notice(this.plugin.t('settings.importExport.jsonExport.loading'), 0);
               try {
                  const data = await this.plugin.loadData();
                  const jsonString = JSON.stringify(data, null, 2);
                  
                  const blob = new Blob([jsonString], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'rss-flowz-config.json';
                  a.click();
                  window.URL.revokeObjectURL(url);
                  
                  loadingNotice.hide();
                  new Notice(this.plugin.t('settings.importExport.jsonExport.success'));
               } catch (error) {
                  loadingNotice.hide();
                  new Notice(this.plugin.t('settings.importExport.jsonExport.error'));
                  console.error(error);
               }
            }));

      containerEl.createEl('hr');

      // Section de gestion des groupes
      containerEl.createEl('h1', {text: this.plugin.t('settings.groups.title')});
      
      // Afficher les groupes existants
      this.plugin.settings.groups.forEach((group, index) => {
         if (group !== 'Sans groupe') {
            new Setting(containerEl)
               .setName(group)
               .addButton(button => button
                  .setButtonText(this.plugin.t('settings.groups.delete.button'))
                  .setWarning()
                  .onClick(async () => {
                     try {
                        const groupPath = `${this.plugin.settings.rssFolder}/${group}`;
                        
                        // Déplacer les feeds de ce groupe vers "Sans groupe"
                        this.plugin.settings.feeds.forEach(feed => {
                           if (feed.group === group) {
                              feed.group = '';
                           }
                        });
                        
                        // Supprimer le dossier et son contenu
                        await this.plugin.removeFolder(groupPath);
                        
                        // Supprimer le groupe des paramètres
                        this.plugin.settings.groups.splice(index, 1);
                        await this.plugin.saveData(this.plugin.settings);
                        
                        new Notice(this.plugin.t('settings.groups.delete.success') + ` : ${group}`);
                        this.display();
                     } catch (error) {
                        console.error(`Erreur lors de la suppression du groupe ${group}:`, error);
                        new Notice(this.plugin.t('settings.groups.delete.error'));
                     }
                  }));
         }
      });

      // Ajouter un nouveau groupe
      let inputText = '';
      new Setting(containerEl)
         .setName(this.plugin.t('settings.groups.add.name'))
         .setDesc(this.plugin.t('settings.groups.add.desc'))
         .addText(text => text
            .setPlaceholder(this.plugin.t('settings.groups.add.placeholder'))
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
                     new Notice(this.plugin.t('settings.groups.add.success') + ` : ${groupName}`);
                     this.display();
                  } else {
                     new Notice(this.plugin.t('settings.groups.add.error'));
                  }
               }
            }));


      containerEl.createEl('hr');
      containerEl.createEl('h1', {text: this.plugin.t('settings.feeds.title')});

      // Barre de recherche pour les feeds
      const searchContainer = containerEl.createDiv('search-container');
      const searchInput = searchContainer.createEl('input', {
         type: 'text',
         placeholder: this.plugin.t('settings.feeds.search.placeholder'),
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
               
               // Ajouter le titre du feed et son statut
               const titleContainer = headerContainer.createDiv('feed-title-container');
               titleContainer.createEl('span', { text: feed.title });
               
               // Ajouter une icône d'erreur si nécessaire
               if (feed.lastError) {
                  const errorIcon = titleContainer.createEl('span', { 
                      cls: 'feed-error-icon',
                      attr: {
                          'aria-label': `Dernière erreur: ${feed.lastError.message}\nLe ${new Date(feed.lastError.timestamp).toLocaleString()}`
                      }
                  });
                  errorIcon.innerHTML = '⚠️';
               }

               // Ajouter la date du dernier fetch réussi
               if (feed.lastSuccessfulFetch) {
                  const lastFetchSpan = titleContainer.createEl('span', {
                      cls: 'feed-last-fetch',
                      text: `Dernière mise à jour: ${new Date(feed.lastSuccessfulFetch).toLocaleString()}`
                  });
               }

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
                  .setName(this.plugin.t('settings.feeds.options.saveType'))
                  .addDropdown(dropdown => {
                     // Ajouter d'abord une valeur par défaut
                     dropdown.addOption('multiple', this.plugin.t('settings.feeds.options.saveTypes.multiple'));
                     dropdown.addOption('single', this.plugin.t('settings.feeds.options.saveTypes.single'));
                     
                     // Définir la valeur actuelle (comme pour le groupe)
                     dropdown.setValue(feed.type || 'multiple');
                     
                     dropdown.onChange(async (value) => {
                        this.plugin.settings.feeds[index].type = value;
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(this.plugin.t('notices.settings.feedTypeChanged').replace('{title}', feed.title));
                     });
                  });

               // Ajouter un identifiant unique au container pour le retrouver après refresh
               feedContainer.setAttribute('data-feed-id', feed.url);

               // Options du feed
               new Setting(optionsContainer)
                  .setName('Groupe')
                  .addDropdown(dropdown => {
                     dropdown.addOption('', this.plugin.t('settings.feeds.group.none'));
                     this.plugin.settings.groups.forEach(g => 
                        dropdown.addOption(g, g)
                     );
                     dropdown.setValue(feed.group || '');
                     dropdown.onChange(async (value) => {
                        const oldGroup = feed.group || '';
                        const newGroup = value || '';
                        
                        try {
                           // Tous les chemins doivent partir du dossier RSS principal
                           const oldPath = oldGroup 
                              ? `${this.plugin.settings.rssFolder}/${oldGroup}` 
                              : this.plugin.settings.rssFolder;
                           const newPath = newGroup 
                              ? `${this.plugin.settings.rssFolder}/${newGroup}` 
                              : this.plugin.settings.rssFolder;
                           
                           // S'assurer que les dossiers nécessaires existent
                           await this.plugin.ensureFolder(this.plugin.settings.rssFolder);
                           if (newGroup) {
                              await this.plugin.ensureFolder(newPath);
                           }
                           
                           if (feed.type === 'uniqueFile') {
                              // Pour les fichiers uniques
                              const oldFilePath = `${oldPath}/${feed.title}.md`;
                              const newFilePath = `${newPath}/${feed.title}.md`;
                              
                              if (await this.app.vault.adapter.exists(oldFilePath)) {
                                 await this.app.vault.adapter.rename(oldFilePath, newFilePath);
                              }
                           } else {
                              // Pour les feeds multi-fichiers
                              const oldFeedFolder = `${oldPath}/${feed.title}`;
                              const newFeedFolder = `${newPath}/${feed.title}`;
                              
                              if (await this.app.vault.adapter.exists(oldFeedFolder)) {
                                 await this.plugin.ensureFolder(newFeedFolder);
                                 
                                 const files = await this.app.vault.adapter.list(oldFeedFolder);
                                 for (const file of files.files) {
                                    const fileName = file.split('/').pop();
                                    const newFilePath = `${newFeedFolder}/${fileName}`;
                                    await this.app.vault.adapter.rename(file, newFilePath);
                                 }
                                 
                                 // Supprimer l'ancien dossier
                                 await this.plugin.removeFolder(oldFeedFolder);
                              }
                           }
                           
                           // Mettre à jour les paramètres
                           this.plugin.settings.feeds[index].group = value;
                           await this.plugin.saveData(this.plugin.settings);
                           
                           this.display();
                           
                           const sourceFolder = oldGroup || this.plugin.t('settings.feeds.group.none');
                           const destinationFolder = newGroup || this.plugin.t('settings.feeds.group.none');
                           new Notice(`Feed ${feed.title} déplacé de "${sourceFolder}" vers "${destinationFolder}"`);
                        } catch (error) {
                           console.error('Erreur lors du déplacement des fichiers:', error);
                           new Notice(this.plugin.t('settings.feeds.group.error'));
                        }
                     });
                  });

               // Options avancées avec notifications
               new Setting(optionsContainer)
                  .setName(this.plugin.t('settings.feeds.summarize.name'))
                  .setDesc(this.plugin.t('settings.feeds.summarize.desc'))
                  .addToggle(toggle => toggle
                     .setValue(feed.summarize || false)
                     .onChange(async (value) => {
                        if (value && !this.plugin.settings.openaiKey) {
                           new Notice(this.plugin.t('settings.feeds.summarize.error'));
                           toggle.setValue(false);
                           return;
                        }
                        this.plugin.settings.feeds[index].summarize = value;
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(this.plugin.t('notices.settings.aiToggled')
                           .replace('{feature}', this.plugin.t('settings.feeds.summarize.name'))
                           .replace('{status}', value ? '✅' : '❌')
                           .replace('{title}', feed.title)
                        );
                     })
                  );

               new Setting(optionsContainer)
                  .setName(this.plugin.t('settings.feeds.rewrite.name'))
                  .setDesc(this.plugin.t('settings.feeds.rewrite.desc'))
                  .addToggle(toggle => toggle
                     .setValue(feed.rewrite || false)
                     .onChange(async (value) => {
                        if (value && !this.plugin.settings.openaiKey) {
                           new Notice(this.plugin.t('settings.feeds.rewrite.error'));
                           toggle.setValue(false);
                           return;
                        }
                        this.plugin.settings.feeds[index].rewrite = value;
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(this.plugin.t('notices.settings.aiToggled')
                           .replace('{feature}', this.plugin.t('settings.feeds.rewrite.name'))
                           .replace('{status}', value ? '✅' : '❌')
                           .replace('{title}', feed.title)
                        );
                     })
                  );

               new Setting(optionsContainer)
                  .setName(this.plugin.t('settings.feeds.transcribe.name'))
                  .setDesc(this.plugin.t('settings.feeds.transcribe.desc'))
                  .addToggle(toggle => toggle
                     .setValue(feed.transcribe || false)
                     .onChange(async (value) => {
                        if (value && !this.plugin.settings.openaiKey) {
                           new Notice(this.plugin.t('settings.feeds.transcribe.error'));
                           toggle.setValue(false);
                           return;
                        }
                        this.plugin.settings.feeds[index].transcribe = value;
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(this.plugin.t('notices.settings.aiToggled')
                           .replace('{feature}', this.plugin.t('settings.feeds.transcribe.name'))
                           .replace('{status}', value ? '✅' : '❌')
                           .replace('{title}', feed.title)
                        );
                     })
                  );

               new Setting(optionsContainer)
                  .addButton(button => button
                     .setButtonText(this.plugin.t('settings.feeds.delete.button'))
                     .setWarning()
                     .onClick(async () => {
                        this.plugin.settings.feeds.splice(index, 1);
                        await this.plugin.saveData(this.plugin.settings);
                        new Notice(this.t('notices.settings.feedDeleted')
                        .replace('{title}', feed.title)
                        );
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
         .setName(this.plugin.t('settings.feeds.add.name'))
         .setDesc(this.plugin.t('settings.feeds.add.desc'))
         .addText(text => text
            .setPlaceholder(this.plugin.t('settings.feeds.add.placeholder'))
            .onChange(async (value) => {
               if (value) {
                  try {
                     // Vérifier si le feed existe déjà
                     const feedExists = this.plugin.settings.feeds.some(feed => 
                        feed.url.toLowerCase() === value.toLowerCase()
                     );

                     if (feedExists) {
                        new Notice(this.plugin.t('settings.feeds.add.error'));
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
                        new Notice(this.plugin.t('settings.feeds.add.error'));
                        return;
                     }

                     const title = doc.querySelector('channel > title, feed > title')?.textContent || 'Nouveau feed';
                     
                     // Créer le nouveau feed
                     const newFeed = {
                        title: title,
                        url: value,
                        type: 'multiple',
                        status: 'active',
                        summarize: false,
                        transcribe: false,
                        tags: []
                     };

                     // Ajouter le feed aux settings
                     this.plugin.settings.feeds.push(newFeed);
                     await this.plugin.saveData(this.plugin.settings);

                     // Fetch immédiatement les articles
                     try {
                        new Notice(this.plugin.t('settings.feeds.add.fetching') + ` ${title}...`);
                        
                        let articles;
                        if (isAtom) {
                           articles = await this.plugin.parseAtomFeed(doc, newFeed);
                        } else {
                           articles = await this.plugin.parseRssFeed(doc, newFeed);
                        }

                        if (articles && articles.length > 0) {
                           await this.plugin.saveArticles(articles, newFeed);
                           new Notice(this.plugin.t('settings.feeds.add.success') + ` ${articles.length} articles récupérés pour ${title}`);
                        } else {
                           new Notice(this.plugin.t('settings.feeds.add.noArticles') + ` ${title}`);
                        }
                     } catch (fetchError) {
                        console.error('Erreur lors de la r��cupération des articles:', fetchError);
                        new Notice(this.plugin.t('settings.feeds.add.fetchError') + ` ${title}`);
                     }

                     // Rafraîchir l'interface
                     this.display();
                     new Notice(this.plugin.t('settings.feeds.add.success') + ` ${title}`);
                  } catch (error) {
                     console.error('Erreur lors de l\'ajout du feed:', error);
                     if (error.message.includes('CERT_')) {
                        new Notice(
                           this.plugin.t('settings.feeds.add.sslError')
                        );
                     } else {
                        new Notice(this.plugin.t('settings.feeds.add.error') + ` ${error.message}`);
                     }
                  }
               }
            })
         );

      // Ajouter un bouton pour supprimer tous les feeds
      new Setting(containerEl)
         .addButton(button => button
            .setButtonText(this.plugin.t('settings.feeds.deleteAll.button'))
            .setWarning()
            .onClick(async () => {
               const confirmation = await this.confirmDelete('tous les feeds');
               if (confirmation) {
                  this.plugin.settings.feeds = [];
                  await this.plugin.saveData(this.plugin.settings);
                  new Notice(this.plugin.t('settings.feeds.deleteAll.success'));
                  this.display();
               }
            }));
      };

   async confirmDelete(feedTitle) {
      return new Promise((resolve) => {
         const modal = new Modal(this.app);
         modal.titleEl.setText(this.plugin.t('settings.feeds.delete.confirm'));
         
         modal.contentEl.empty();
         modal.contentEl.createEl("p", { 
            text: this.plugin.t('settings.feeds.delete.confirmMessage').replace('{feedTitle}', feedTitle) 
         });

         new Setting(modal.contentEl)
            .addButton(btn => btn
               .setButtonText(this.plugin.t('settings.feeds.delete.cancel'))
               .onClick(() => {
                  modal.close();
                  resolve(false);
               }))
            .addButton(btn => btn
               .setButtonText(this.plugin.t('settings.feeds.delete.confirm'))
               .setWarning()
               .onClick(() => {
                  modal.close();
                  resolve(true);
               })
            );

         modal.open();
      });
   }

   async createNewGroup() {
      return new Promise((resolve) => {
         const modal = new Modal(this.app);
         modal.titleEl.setText(this.plugin.t('settings.feeds.group.add'));
         
         modal.contentEl.empty();
         const inputContainer = modal.contentEl.createDiv();
         const input = new Setting(inputContainer)
            .setName(this.plugin.t('settings.feeds.group.name'))
            .addText(text => text
               .setPlaceholder(this.plugin.t('settings.feeds.group.placeholder'))
               .setValue("")
            );

         new Setting(modal.contentEl)
            .addButton(btn => btn
               .setButtonText(this.plugin.t('settings.feeds.group.cancel'))
               .onClick(() => {
                  modal.close();
                  resolve(null);
               }))
            .addButton(btn => btn
               .setButtonText(this.plugin.t('settings.feeds.group.create'))
               .setCta()
               .onClick(() => {
                  const value = input.components[0].getValue().trim();
                  if (value) {
                     modal.close();
                     resolve(value);
                  } else {
                     new Notice(this.plugin.t('settings.feeds.group.error'));
                  }
               }));

         modal.open();
      });
   }
}

// Ajouter ces styles CSS
document.head.appendChild(Object.assign(document.createElement('style'), {
   textContent: `

         .feed-header span {
            flex-grow: 1;
            margin-right: 8px;
            font-weight: 500;
         }

         .feed-error-icon {
            color: var(--text-error);
            margin-left: 8px;
            cursor: help;
         }

         .feed-last-fetch {
            font-size: 0.8em;
            color: var(--text-muted);
            margin-left: 8px;
         }

         .feed-title-container { 
            display: flex;
            align-items: center;
            gap: 8px;
         }

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

class ReadingModeModal extends Modal {
    constructor(app, article, groups, currentFolder, updateFeeds) {
        super(app);
        this.article = article;
        this.groups = groups;
        this.currentFolder = currentFolder;
        this.updateFeeds = updateFeeds;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.classList.add('reading-mode-active');

        // Ajouter le contenu de l'article
        const titleElement = document.createElement('h1');
        titleElement.textContent = this.article.title;
        contentEl.appendChild(titleElement);

        const contentElement = document.createElement('div');
        contentElement.innerHTML = this.article.content; // Assurez-vous que le contenu est sécurisé
        contentEl.appendChild(contentElement);

        // Créer la barre de contrôle
        const controlBar = document.createElement('div');
        controlBar.classList.add('reading-mode-controls');

        // Sélecteur de groupe
        const folderSelect = document.createElement('select');
        folderSelect.classList.add('reading-mode-select');
        this.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.text = group;
            if (this.currentFolder === group) {
                option.selected = true;
            }
            folderSelect.appendChild(option);
        });
        folderSelect.addEventListener('change', (e) => {
            this.currentFolder = e.target.value;
            this.updateFeeds(this.currentFolder); // Mettre à jour les feeds
        });
        controlBar.appendChild(folderSelect);

        // Boutons de navigation
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '⬅️ Précédent';
        prevButton.onclick = () => this.navigateArticles('previous');
        controlBar.appendChild(prevButton);

        const nextButton = document.createElement('button');
        nextButton.innerHTML = 'Suivant ➡️';
        nextButton.onclick = () => this.navigateArticles('next');
        controlBar.appendChild(nextButton);

        // Ajouter un bouton pour fermer le modal
        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'Fermer';
        closeButton.onclick = () => this.close();
        contentEl.appendChild(closeButton);

        // Ajouter la barre de contrôle au modal
        contentEl.appendChild(controlBar);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    navigateArticles(direction) {
        // Implémentez la logique pour naviguer entre les articles ici
        // Vous pouvez appeler une méthode de votre classe principale pour cela
    }
}

module.exports = RSSReaderPlugin; 