export type SupportedLocale = "en" | "fr";

export interface TranslationKey {
	[key: string]: string | TranslationKey;
}

export interface Translations {
	[locale: string]: TranslationKey;
}

export interface I18nOptions {
	defaultLocale?: SupportedLocale;
	fallbackLocale?: SupportedLocale;
	debug?: boolean;
}

export interface TranslationParams {
	[key: string]: string | number | boolean;
}

export interface I18nServiceInterface {
	t(key: string, params?: TranslationParams): string;
	setLocale(locale: SupportedLocale): void;
	getLocale(): SupportedLocale;
	hasTranslation(key: string): boolean;
	addTranslations(locale: SupportedLocale, translations: TranslationKey): void;
}
