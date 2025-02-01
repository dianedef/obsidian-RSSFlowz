import { TFile } from 'obsidian';
import RSSReaderPlugin from '../main';
import { DigestMode } from '../types/settings';
import { Article } from '../types';

export class DigestService {
    constructor(private plugin: RSSReaderPlugin) {}

    async createDigest(articles: Article[], mode: DigestMode): Promise<void> {
        if (!this.plugin.settingsService.getSettings().digest.enabled) {
            return;
        }

        const template = this.plugin.settingsService.getSettings().digest.template || '# Digest du {{date}}\n\n{{articles}}';
        const folderPath = this.plugin.settingsService.getSettings().digest.folderPath || 'RSS/Digests';

        // Créer le dossier si nécessaire
        await this.plugin.fileService.ensureFolder(folderPath);

        // Formater la date selon le mode
        const date = new Date();
        const dateStr = mode === 'daily' 
            ? date.toLocaleDateString('fr-FR')
            : `Semaine ${this.getWeekNumber(date)}`;

        // Créer le contenu du digest
        const content = template
            .replace('{{date}}', dateStr)
            .replace('{{articles}}', this.formatArticles(articles));

        // Créer ou mettre à jour le fichier
        const fileName = `${folderPath}/${mode === 'daily' ? 'Digest' : 'Digest_Hebdo'}_${dateStr.replace(/\//g, '-')}.md`;
        await this.plugin.fileService.createOrUpdateFile(fileName, content);
    }

    private formatArticles(articles: Article[]): string {
        return articles
            .map(article => {
                return `## ${article.title}\n\n${article.description || ''}\n\n[Lire l'article](${article.link})\n`;
            })
            .join('\n---\n\n');
    }

    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    async scheduleDigest(): Promise<void> {
        const settings = this.plugin.settingsService.getSettings();
        if (!settings.digest.enabled) {
            return;
        }

        // Récupérer tous les articles non lus des dernières 24h ou 7 jours selon le mode
        const mode = settings.digest.mode;
        const cutoffDate = new Date();
        if (mode === 'daily') {
            cutoffDate.setDate(cutoffDate.getDate() - 1);
        } else if (mode === 'weekly') {
            cutoffDate.setDate(cutoffDate.getDate() - 7);
        }

        const articles = await this.plugin.storageService.getArticlesSince(cutoffDate);
        if (articles.length > 0) {
            await this.createDigest(articles, mode);
        }
    }
} 