import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { Article } from '../types';
import { LogService } from './LogService';

export class ContentEnhancerService {
    constructor(private logService: LogService) {}

    async enhanceArticleContent(article: Article): Promise<Article> {
        try {
            if (!article.link) {
                this.logService.warn('Pas de lien pour récupérer le contenu complet');
                return article;
            }

            // Récupérer le contenu de la page
            const response = await fetch(article.link, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; RSSFlowz/1.0; +https://github.com/Mearnic/RSSFlowz)'
                }
            });
            const html = await response.text();

            // Parser avec linkedom
            const { document } = parseHTML(html);
            const reader = new Readability(document);
            const parsed = reader.parse();

            if (!parsed) {
                this.logService.warn('Impossible de parser le contenu avec Readability');
                return article;
            }

            // Mettre à jour l'article avec le contenu amélioré
            return {
                ...article,
                title: article.title || parsed.title,
                content: parsed.content,
                excerpt: parsed.excerpt,
                author: article.author || parsed.byline,
                siteName: article.siteName || parsed.siteName,
                language: article.language || parsed.lang,
                readingTime: this.estimateReadingTime(parsed.textContent || '')
            };
        } catch (error) {
            this.logService.error('Erreur lors de l\'amélioration du contenu:', error);
            return article;
        }
    }

    private estimateReadingTime(text: string): number {
        const wordsPerMinute = 200;
        const words = text.trim().split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    }
} 