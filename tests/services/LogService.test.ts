import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogService } from '../../src/services/LogService'
import { LogLevel } from '../../src/types/logs'

describe('LogService', () => {
  let service: LogService
  let mockConsole: Console

  beforeEach(() => {
    mockConsole = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as unknown as Console

    service = new LogService(mockConsole)
  })

  describe('Log Management', () => {
    it('devrait ajouter des logs avec différents niveaux', () => {
      // Logs pour le feed Tech
      service.debug('Mise à jour du feed tech', { 
        feed: 'tech123', 
        url: 'https://tech-blog.com/rss',
        articles: ['TypeScript 5.0', 'React 18 Features'] 
      })

      service.info('Nouveaux articles tech trouvés', { 
        feed: 'tech123',
        count: 5,
        titles: ['TypeScript Tips', 'React Hooks', 'Node.js Best Practices']
      })

      // Logs pour le feed News
      service.warn('Délai de réponse élevé pour news', { 
        feed: 'news123',
        url: 'https://tech-news.com/feed',
        responseTime: '5000ms'
      })

      service.error('Échec de synchronisation news', { 
        feed: 'news123',
        error: new Error('Timeout')
      })

      // Logs pour le feed Blog
      service.info('Mise à jour du feed blog', { 
        feed: 'blog123',
        url: 'https://dev-blog.com/rss',
        articles: ['Web Components', 'CSS Grid Tips']
      })

      service.warn('Articles dupliqués détectés', { 
        feed: 'blog123',
        duplicates: ['JavaScript Future', 'CSS Grid']
      })

      // Vérification des appels
      expect(mockConsole.debug).toHaveBeenCalledWith(
        '[DEBUG] Mise à jour du feed tech',
        expect.objectContaining({ feed: 'tech123' })
      )

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[INFO] Nouveaux articles tech trouvés',
        expect.objectContaining({ feed: 'tech123' })
      )

      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[WARN] Délai de réponse élevé pour news',
        expect.objectContaining({ feed: 'news123' })
      )

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ERROR] Échec de synchronisation news',
        expect.objectContaining({ feed: 'news123' })
      )

      expect(mockConsole.info).toHaveBeenCalledWith(
        '[INFO] Mise à jour du feed blog',
        expect.objectContaining({ feed: 'blog123' })
      )

      expect(mockConsole.warn).toHaveBeenCalledWith(
        '[WARN] Articles dupliqués détectés',
        expect.objectContaining({ feed: 'blog123' })
      )
    })

    it('devrait gérer les erreurs de synchronisation pour chaque feed', () => {
      const feeds = {
        tech: {
          id: 'tech123',
          url: 'https://tech-blog.com/rss',
          error: new Error('Network Error')
        },
        news: {
          id: 'news123',
          url: 'https://tech-news.com/feed',
          error: new Error('Invalid RSS')
        },
        blog: {
          id: 'blog123',
          url: 'https://dev-blog.com/rss',
          error: new Error('Timeout')
        }
      }

      // Test des erreurs pour chaque feed
      for (const [name, feed] of Object.entries(feeds)) {
        service.error(`Erreur de synchronisation ${name}`, {
          feed: feed.id,
          url: feed.url,
          error: feed.error
        })

        expect(mockConsole.error).toHaveBeenCalledWith(
          `[ERROR] Erreur de synchronisation ${name}`,
          expect.objectContaining({
            feed: feed.id,
            url: feed.url,
            error: feed.error
          })
        )
      }
    })

    it('devrait logger les statistiques de chaque feed', () => {
      const stats = {
        tech: {
          id: 'tech123',
          articles: 15,
          nouveaux: 5,
          temps: '2.3s'
        },
        news: {
          id: 'news123',
          articles: 25,
          nouveaux: 8,
          temps: '1.8s'
        },
        blog: {
          id: 'blog123',
          articles: 10,
          nouveaux: 3,
          temps: '1.5s'
        }
      }

      // Log des stats pour chaque feed
      for (const [name, stat] of Object.entries(stats)) {
        service.info(`Statistiques ${name}`, {
          feed: stat.id,
          totalArticles: stat.articles,
          newArticles: stat.nouveaux,
          syncTime: stat.temps
        })

        expect(mockConsole.info).toHaveBeenCalledWith(
          `[INFO] Statistiques ${name}`,
          expect.objectContaining({
            feed: stat.id,
            totalArticles: stat.articles
          })
        )
      }
    })
  })
}) 