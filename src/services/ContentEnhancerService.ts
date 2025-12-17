import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { Article } from '../types';
import { LogService } from './LogService';

/**
 * Extracts full article content from web pages using Mozilla Readability
 * 
 * Purpose: RSS feeds often only include summaries or truncated content.
 * This service fetches the full article HTML and extracts the main content.
 * 
 * Technology stack:
 * - linkedom: Fast, lightweight DOM implementation (alternative to jsdom)
 * - @mozilla/readability: Mozilla's algorithm for extracting article content
 * 
 * What Readability does:
 * - Identifies main content vs. navigation/ads/comments
 * - Strips unnecessary HTML while preserving structure
 * - Extracts metadata (author, site name, excerpt)
 * - Calculates reading time
 * 
 * Limitations:
 * - Fails on paywalled content
 * - May be blocked by anti-scraping measures
 * - Requires full page load (slower than RSS parsing)
 */
export class ContentEnhancerService {
    constructor(private logService: LogService) {}

    /**
     * Fetch and parse article content from URL
     * 
     * Process:
     * 1. HTTP fetch with browser-like User-Agent (reduces blocking)
     * 2. Parse HTML into DOM with linkedom
     * 3. Apply Readability algorithm to extract article
     * 4. Merge extracted content with existing article metadata
     * 
     * Fallback: Returns original article if enhancement fails
     * This ensures sync continues even when content extraction fails
     */
    async enhanceArticleContent(article: Article): Promise<Article> {
        try {
            if (!article.link) {
                this.logService.warn('Pas de lien pour récupérer le contenu complet');
                return article;
            }

            // Fetch article HTML with browser-like User-Agent to avoid blocking
            const response = await fetch(article.link, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; RSSFlowz/1.0; +https://github.com/Mearnic/RSSFlowz)'
                }
            });
            const html = await response.text();

            // Parse HTML with linkedom (lightweight DOM implementation)
            const { document } = parseHTML(html);
            
            // Apply Readability algorithm to extract main content
            const reader = new Readability(document);
            const parsed = reader.parse();

            if (!parsed) {
                this.logService.warn('Impossible de parser le contenu avec Readability');
                return article;
            }

            // Merge extracted content with original article metadata
            // Prefer original RSS data (title, author) over extracted data when available
            return {
                ...article,
                title: article.title || parsed.title,
                content: parsed.content,              // Enhanced: full article HTML
                excerpt: parsed.excerpt,              // Enhanced: article summary
                author: article.author || parsed.byline,
                siteName: article.siteName || parsed.siteName,
                language: article.language || parsed.lang,
                readingTime: this.estimateReadingTime(parsed.textContent || '')
            };
        } catch (error) {
            // Graceful degradation: return original article on error
            this.logService.error('Erreur lors de l\'amélioration du contenu:', error);
            return article;
        }
    }

    /**
     * Calculate estimated reading time
     * 
     * Assumptions:
     * - Average reader: 200 words per minute
     * - Split on whitespace to count words
     * - Round up to avoid showing "0 min" for short articles
     * 
     * Note: 200 WPM is conservative (some studies suggest 250-300 WPM)
     * but accounts for code snippets, complex topics, and non-native speakers
     */
    private estimateReadingTime(text: string): number {
        const wordsPerMinute = 200;
        const words = text.trim().split(/\s+/).length;
        return Math.ceil(words / wordsPerMinute);
    }
} 