import { requestUrl, RequestUrlResponse } from 'obsidian'
import { RSSFeed, RSSItem, FeedData } from '../types'

export class RSSService {
  /**
   * Récupère et parse un flux RSS/Atom
   * @param url - L'URL du flux à récupérer
   * @returns Le flux parsé avec ses articles
   */
  async fetchFeed(url: string): Promise<RSSFeed> {
    try {
      const response = await this.fetchUrl(url)
      const parser = new DOMParser()
      const doc = parser.parseFromString(response.text, 'text/xml')

      // Vérifier les erreurs de parsing
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        throw new Error(`Erreur de parsing XML: ${parseError.textContent}`)
      }

      // Détecter le type de flux (RSS ou Atom)
      if (doc.querySelector('feed')) {
        return this.parseAtomFeed(doc)
      } else {
        return this.parseRssFeed(doc)
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération du feed ${url}:`, error)
      throw error
    }
  }

  /**
   * Parse un flux au format Atom
   * @param doc - Le document XML du flux Atom
   * @returns Le flux parsé
   */
  private parseAtomFeed(doc: Document): RSSFeed {
    const feed = doc.querySelector('feed')
    if (!feed) throw new Error('Document Atom invalide')

    const title = feed.querySelector('title')?.textContent || 'Sans titre'
    const description = feed.querySelector('subtitle')?.textContent || ''

    // Gestion du lien principal
    let link = ''
    const links = feed.querySelectorAll('link')
    for (const l of links) {
      if (l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel')) {
        link = l.getAttribute('href') || ''
        break
      }
    }

    // Parser les articles
    const entries = Array.from(feed.querySelectorAll('entry'))
    const items = entries.map(entry => this.parseAtomEntry(entry))

    return {
      title,
      description,
      link,
      items
    }
  }

  /**
   * Parse un article au format Atom
   * @param entry - L'élément XML de l'article Atom
   * @returns L'article parsé
   */
  private parseAtomEntry(entry: Element): RSSItem {
    // Gestion du lien
    let link = ''
    const links = entry.querySelectorAll('link')
    for (const l of links) {
      if (l.getAttribute('rel') === 'alternate' || !l.getAttribute('rel')) {
        link = l.getAttribute('href') || ''
        break
      }
    }

    // Gestion du contenu avec fallback sur le résumé
    const content = entry.querySelector('content')?.textContent || 
                   entry.querySelector('summary')?.textContent || ''

    return {
      title: entry.querySelector('title')?.textContent?.trim() || 'Sans titre',
      description: content.trim(),
      link: link,
      pubDate: entry.querySelector('updated')?.textContent || 
               entry.querySelector('published')?.textContent || 
               new Date().toISOString(),
      guid: entry.querySelector('id')?.textContent || link
    }
  }

  /**
   * Parse un flux au format RSS
   * @param doc - Le document XML du flux RSS
   * @returns Le flux parsé
   */
  private parseRssFeed(doc: Document): RSSFeed {
    const channel = doc.querySelector('channel')
    if (!channel) throw new Error('Document RSS invalide')

    const title = channel.querySelector('title')?.textContent || 'Sans titre'
    const description = channel.querySelector('description')?.textContent || ''
    const link = channel.querySelector('link')?.textContent || ''

    // Parser les articles
    const items = Array.from(channel.querySelectorAll('item'))
      .map(item => this.parseRSSItem(item))

    return {
      title,
      description,
      link,
      items
    }
  }

  /**
   * Parse un article au format RSS
   * @param item - L'élément XML de l'article RSS
   * @returns L'article parsé
   */
  private parseRSSItem(item: Element): RSSItem {
    return {
      title: item.querySelector('title')?.textContent?.trim() || 'Sans titre',
      description: item.querySelector('description')?.textContent?.trim() || '',
      link: item.querySelector('link')?.textContent?.trim() || '',
      pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
      guid: item.querySelector('guid')?.textContent || item.querySelector('link')?.textContent || ''
    }
  }

  /**
   * Effectue une requête HTTP avec les bons en-têtes
   * @param url - L'URL à requêter
   * @returns La réponse de la requête
   */
  private async fetchUrl(url: string): Promise<RequestUrlResponse> {
    return await requestUrl({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/atom+xml,application/xml,text/xml,application/rss+xml,*/*',
        'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      }
    })
  }
} 