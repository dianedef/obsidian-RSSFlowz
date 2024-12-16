import { Plugin, requestUrl, Notice, Modal } from 'obsidian'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { StorageService } from './StorageService'
import { LogService } from './LogService'
import { createOpmlError, OpmlErrorCode } from '../types/errors'
import { FeedData, FeedSettings } from '../types'

export class OpmlService {
  private parser: XMLParser
  private builder: XMLBuilder

  constructor(
    private plugin: Plugin,
    private storageService: StorageService,
    private logService: LogService
  ) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    })
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      format: true
    })
  }

  async exportOpml(): Promise<void> {
    try {
      const data = await this.storageService.loadData();
      const opml = `<?xml version="1.0" encoding="UTF-8"?>
      <opml version="1.0">
      <head>
         <title>RSS Feeds Export</title>
      </head>
      <body>
      <outline text="Feeds" title="Feeds">
         ${data.feeds.map(feed => `
         <outline 
            title="${feed.settings.title}"
            type="rss"
            xmlUrl="${feed.settings.url}"
            category="${feed.settings.category || ''}"
            status="${feed.settings.status}"
            saveType="${feed.settings.type}"
            summarize="${feed.settings.summarize || false}"
            transcribe="${feed.settings.transcribe || false}"
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

      this.logService.info('Export OPML réussi');
    } catch (error) {
      this.logService.error('Erreur lors de l\'export OPML', { error });
      throw createOpmlError(OpmlErrorCode.EXPORT_FAILED, 'Erreur lors de l\'export OPML');
    }
  }

  async importOpml(fileContent: string): Promise<{
    success: boolean;
    imported: number;
    errors: Array<{ title: string; url: string; error: string }>;
    duplicates: Array<{ title: string; url: string; error: string }>;
  }> {
    try {
      // 1. Nettoyer le contenu
      const cleanedContent = fileContent.replace(
        /(<outline[^>]*)(title="[^"]*&[^"]*\"|category="[^"]*&[^"]*")([^>]*>)/g,
        (match, before, attribute, after) => {
          return before + attribute.replace(/&(?!(amp|lt|gt|apos|quot);)/g, '&amp;') + after;
        }
      );
      
      // 2. Encoder les URLs
      const preparedContent = cleanedContent.replace(
        /xmlUrl="([^"]*)"/g,
        (match, url) => `xmlUrl="${encodeURIComponent(url)}"`
      );
      
      const doc = this.parser.parse(preparedContent);
      
      // Trouver tous les outlines avec xmlUrl
      const feedOutlines = this.extractFeedOutlines(doc);
      
      if (!feedOutlines.length) {
        this.logService.warn('Aucun feed RSS trouvé dans le fichier OPML');
        return {
          success: false,
          imported: 0,
          errors: [],
          duplicates: []
        };
      }

      let successCount = 0;
      const errorFeeds: Array<{ title: string; url: string; error: string }> = [];
      const duplicateFeeds: Array<{ title: string; url: string; error: string }> = [];
      
      const data = await this.storageService.loadData();
      
      for (const feed of feedOutlines) {
        try {
          const xmlUrl = feed.xmlUrl;
          const feedTitle = feed.title || feed.text || xmlUrl;
          
          // Désanitizer l'URL si nécessaire
          let feedUrl = xmlUrl;
          if (xmlUrl.includes('%')) {
            feedUrl = decodeURIComponent(xmlUrl);
          }
          
          // Vérifier si le feed existe déjà
          const feedExists = data.feeds.some(f => 
            f.settings.url.toLowerCase() === feedUrl.toLowerCase()
          );

          if (feedExists) {
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
              'User-Agent': 'Mozilla/5.0',
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
          data.feeds.push({
            id: crypto.randomUUID(),
            settings: {
              title: feedTitle,
              url: feedUrl,
              type: feed.saveType || 'multiple',
              status: feed.status || 'active',
              summarize: feed.summarize === 'true',
              transcribe: feed.transcribe === 'true',
              category: feed.category || undefined,
              folder: feed.category || 'RSS'
            }
          });
          successCount++;

        } catch (error) {
          this.logService.error('Erreur lors de la vérification du feed', { 
            feed: feed.title,
            error 
          });
          
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
        await this.storageService.saveData(data);
        this.logService.info(`${successCount} feeds importés avec succès`);
      }

      // Afficher le résumé dans une modal
      this.showImportSummary(feedOutlines.length, successCount, duplicateFeeds, errorFeeds);

      return {
        success: successCount > 0,
        imported: successCount,
        errors: errorFeeds,
        duplicates: duplicateFeeds
      };

    } catch (error) {
      this.logService.error('Erreur lors du parsing du fichier OPML', { error });
      throw createOpmlError(OpmlErrorCode.IMPORT_FAILED, 'Erreur lors de l\'import OPML');
    }
  }

  private extractFeedOutlines(doc: any): Array<{
    title: string;
    xmlUrl: string;
    text?: string;
    category?: string;
    saveType?: string;
    status?: string;
    summarize?: string;
    transcribe?: string;
  }> {
    const outlines: any[] = [];
    
    const processOutline = (node: any) => {
      if (node['@_xmlUrl']) {
        outlines.push({
          title: node['@_title'],
          text: node['@_text'],
          xmlUrl: node['@_xmlUrl'],
          category: node['@_category'],
          saveType: node['@_saveType'],
          status: node['@_status'],
          summarize: node['@_summarize'],
          transcribe: node['@_transcribe']
        });
      }
      
      if (node.outline) {
        const children = Array.isArray(node.outline) ? node.outline : [node.outline];
        children.forEach(processOutline);
      }
    };

    if (doc.opml?.body?.outline) {
      const rootOutlines = Array.isArray(doc.opml.body.outline) 
        ? doc.opml.body.outline 
        : [doc.opml.body.outline];
      rootOutlines.forEach(processOutline);
    }

    return outlines;
  }

  private showImportSummary(
    total: number,
    successCount: number,
    duplicateFeeds: Array<{ title: string; url: string; error: string }>,
    errorFeeds: Array<{ title: string; url: string; error: string }>
  ): void {
    const modal = new Modal(this.plugin.app);
    modal.titleEl.setText("Résumé de l'import OPML");
    
    const contentEl = modal.contentEl;
    
    // Statistiques
    contentEl.createEl('h3', {text: 'Statistiques'});
    contentEl.createEl('p', {text: `Total des feeds : ${total}`});
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
      
      contentEl.createEl('button', {
        text: 'Copier la liste des problèmes',
        cls: 'mod-cta'
      }).onclick = () => {
        navigator.clipboard.writeText(issuesText);
        new Notice('Liste copiée dans le presse-papier');
      };
    }

    modal.open();
  }
} 