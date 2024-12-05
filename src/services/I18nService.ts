import { Plugin } from 'obsidian'
import { fr } from '../i18n/fr'
import { en } from '../i18n/en'

export type TranslationKey = string

export class I18nService {
  private locale: string
  private translations: Record<string, any>

  constructor(private plugin: Plugin) {
    // Obtenir la locale d'Obsidian ou utiliser 'en' par défaut
    this.locale = (window as any).moment?.locale() || 'en'
    this.translations = {
      fr,
      en
    }
  }

  /**
   * Traduit une clé donnée dans la langue actuelle
   * @param key - La clé de traduction (peut être imbriquée avec des points, ex: 'settings.title')
   * @param params - Les paramètres à remplacer dans la traduction (ex: {name: 'John'})
   * @returns La traduction ou la clé si non trouvée
   */
  t(key: TranslationKey, params: Record<string, string> = {}): string {
    // Récupérer la traduction pour la langue actuelle
    const translation = key.split('.').reduce((obj, i) => obj?.[i], this.translations[this.locale])

    if (!translation) {
      // Si pas de traduction trouvée, essayer en anglais
      const fallback = key.split('.').reduce((obj, i) => obj?.[i], this.translations['en'])
      return this.replaceParams(fallback || key, params)
    }

    return this.replaceParams(translation, params)
  }

  /**
   * Change la langue actuelle
   * @param locale - Le code de la langue ('fr' ou 'en')
   */
  setLocale(locale: string): void {
    if (this.translations[locale]) {
      this.locale = locale
    }
  }

  /**
   * Obtient la langue actuelle
   * @returns Le code de la langue actuelle
   */
  getLocale(): string {
    return this.locale
  }

  /**
   * Remplace les paramètres dans une chaîne de traduction
   * @param text - Le texte contenant les paramètres
   * @param params - Les valeurs des paramètres
   * @returns Le texte avec les paramètres remplacés
   */
  private replaceParams(text: string, params: Record<string, string>): string {
    return text.replace(/{(\w+)}/g, (match, key) => params[key] || match)
  }
} 