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
      const now = new Date().toISOString();
      
      // Création d'un document OPML 2.0 propre
      const opmlDoc = {
        '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
        opml: {
          '@_version': '2.0',
          head: {
            title: 'RSS Feeds Export',
            dateCreated: now,
            dateModified: now,
            ownerName: 'RSSFlowz',
            docs: 'http://dev.opml.org/spec2.html'
          },
          body: {
            outline: {
              '@_text': 'Feeds',
              '@_title': 'Feeds',
              outline: data.feeds.map(feed => ({
                '@_text': feed.settings.title || feed.settings.url,
                '@_title': feed.settings.title || feed.settings.url,
                '@_type': 'rss',
                '@_xmlUrl': this.sanitizeUrl(feed.settings.url),
                '@_htmlUrl': feed.settings.link || '',
                '@_description': feed.settings.description || '',
                '@_category': feed.settings.category || '',
                '@_status': feed.settings.status || 'active',
                '@_saveType': feed.settings.type || 'multiple',
                '@_summarize': String(feed.settings.summarize || false),
                '@_transcribe': String(feed.settings.transcribe || false)
              }))
            }
          }
        }
      };

      // Utilisation du builder XML pour générer le document
      const opml = this.builder.build(opmlDoc);

      // Création et téléchargement du fichier
      const blob = new Blob([opml], { type: 'text/xml;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const filename = `rss-feeds-${new Date().toISOString().split('T')[0]}.opml`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.logService.info('Export OPML réussi');
    } catch (error) {
      this.logService.error('Erreur lors de l\'export OPML', { error });
      throw createOpmlError(OpmlErrorCode.EXPORT_FAILED, 'Erreur lors de l\'export OPML');
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      return encodeURI(decodeURI(url));
    } catch {
      return url;
    }
  }

  private extractFeedOutlines(doc: any): Array<{
    title: string;
    xmlUrl: string;
    text?: string;
    category?: string;
    saveType?: 'multiple' | 'single';
    status?: 'active' | 'paused';
    summarize?: string;
    transcribe?: string;
    description?: string;
    htmlUrl?: string;
  }> {
    const outlines: any[] = [];
    
    const processOutline = (node: any) => {
      if (node['@_xmlUrl']) {
        outlines.push({
          title: node['@_title'],
          text: node['@_text'],
          xmlUrl: node['@_xmlUrl'],
          category: node['@_category'],
          saveType: node['@_saveType'] as 'multiple' | 'single',
          status: node['@_status'] as 'active' | 'paused',
          summarize: node['@_summarize'],
          transcribe: node['@_transcribe'],
          description: node['@_description'],
          htmlUrl: node['@_htmlUrl']
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

  async importOpml(fileContent: string): Promise<{
    success: boolean;
    imported: number;
    errors: Array<{ title: string; url: string; error: string }>;
    duplicates: Array<{ title: string; url: string; error: string }>;
  }> {
    try {
      // 1. Nettoyer et valider le contenu XML
      const cleanedContent = this.sanitizeXmlContent(fileContent);
      console.log('Contenu XML nettoyé:', cleanedContent.substring(0, 200) + '...');
      
      // 2. Parser le document OPML
      const doc = this.parseOpmlDocument(cleanedContent);
      console.log('Document OPML parsé:', doc);
      
      // 3. Extraire les feeds
      const feedOutlines = this.extractFeedOutlines(doc);
      console.log('Feeds extraits du fichier OPML:', feedOutlines);
      
      if (!feedOutlines.length) {
        this.logService.warn('Aucun feed RSS trouvé dans le fichier OPML');
        return {
          success: false,
          imported: 0,
          errors: [],
          duplicates: []
        };
      }

      // 4. Charger les données existantes
      const data = await this.storageService.loadData();
      console.log('Données existantes avant import:', data);

      // Initialiser data.feeds s'il n'existe pas
      if (!data.feeds) {
        data.feeds = [];
      }

      let successCount = 0;
      const errorFeeds: Array<{ title: string; url: string; error: string }> = [];
      const duplicateFeeds: Array<{ title: string; url: string; error: string }> = [];

      // 5. Traiter chaque feed
      for (const feed of feedOutlines) {
        try {
          const feedUrl = this.sanitizeUrl(feed.xmlUrl);
          const feedTitle = feed.title || feed.text || feedUrl;
          
          console.log('Traitement du feed:', { title: feedTitle, url: feedUrl });
          
          // Vérifier si le feed existe déjà
          const existingFeed = data.feeds.find(f => 
            f.settings.url.toLowerCase() === feedUrl.toLowerCase()
          );

          if (existingFeed) {
            console.log('Feed déjà existant:', existingFeed);
            duplicateFeeds.push({
              title: feedTitle,
              url: feedUrl,
              error: 'Feed déjà présent dans la liste'
            });
            continue;
          }

          // Créer le nouveau feed
          const newFeed = {
            id: crypto.randomUUID(),
            settings: {
              title: feedTitle,
              url: feedUrl,
              type: (feed.saveType || 'multiple') as 'multiple' | 'single',
              status: (feed.status || 'active') as 'active' | 'paused',
              summarize: feed.summarize === 'true',
              transcribe: feed.transcribe === 'true',
              category: feed.category,
              folder: feed.category || 'RSS',
              description: feed.description,
              link: feed.htmlUrl
            }
          };
          
          data.feeds.push(newFeed);
          console.log('Nouveau feed ajouté:', newFeed);
          successCount++;

        } catch (error) {
          console.error('Erreur lors du traitement du feed:', { 
            feed: feed.title,
            error 
          });
          
          errorFeeds.push({
            title: feed.title || feed.xmlUrl,
            url: feed.xmlUrl,
            error: this.getReadableErrorMessage(error)
          });
        }
      }

      // 6. Sauvegarder les modifications si des feeds ont été importés
      if (successCount > 0) {
        console.log('Données à sauvegarder:', data);
        await this.storageService.saveData(data);
        
        // Vérifier que les données ont été sauvegardées
        const savedData = await this.storageService.loadData();
        console.log('Données après sauvegarde:', savedData);
        
        this.logService.info(`${successCount} feeds importés avec succès`);
      }

      // 7. Afficher le résumé
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

  private sanitizeXmlContent(content: string): string {
    // 1. Nettoyer les caractères spéciaux dans les attributs
    let cleaned = content.replace(
      /(<outline[^>]*)(title="[^"]*"|category="[^"]*"|description="[^"]*")([^>]*>)/g,
      (match, before, attribute, after) => {
        return before + attribute.replace(/&(?!(amp|lt|gt|apos|quot);)/g, '&amp;') + after;
      }
    );
    
    // 2. Encoder les URLs
    cleaned = cleaned.replace(
      /xmlUrl="([^"]*)"/g,
      (match, url) => `xmlUrl="${this.sanitizeUrl(url)}"`
    );

    return cleaned;
  }

  private parseOpmlDocument(content: string): any {
    try {
      return this.parser.parse(content);
    } catch (error) {
      throw createOpmlError(OpmlErrorCode.PARSE_FAILED, 'Erreur lors du parsing du document OPML');
    }
  }

  private async validateFeed(url: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const response = await requestUrl({
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/atom+xml,application/xml,text/xml,application/rss+xml,*/*',
          'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });

      const contentType = response.headers?.['content-type'] || '';
      const isValidFeed = contentType.includes('xml') || 
                         response.text.includes('<rss') || 
                         response.text.includes('<feed') ||
                         response.text.includes('<?xml');

      return {
        isValid: isValidFeed,
        error: isValidFeed ? undefined : 'Le contenu ne semble pas être un feed RSS/Atom valide'
      };
    } catch (error) {
      return {
        isValid: false,
        error: this.getReadableErrorMessage(error)
      };
    }
  }

  private getReadableErrorMessage(error: any): string {
    const message = error.message || String(error);
    
    if (message.includes('ERR_NAME_NOT_RESOLVED')) {
      return "Le site web n'existe plus ou est inaccessible";
    }
    if (message.includes('CERT_')) {
      return 'Certificat SSL invalide';
    }
    if (message.includes('ECONNREFUSED')) {
      return 'Connexion refusée par le serveur';
    }
    if (message.includes('ETIMEDOUT')) {
      return 'Le serveur met trop de temps à répondre';
    }
    if (error.status === 404) {
      return 'Feed introuvable (404)';
    }
    if (error.status === 403) {
      return 'Accès refusé par le serveur';
    }
    
    return message;
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