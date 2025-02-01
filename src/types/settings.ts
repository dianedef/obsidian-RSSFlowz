export type FetchFrequency = 'startup' | 'daily' | 'hourly';

export type DigestMode = 'disabled' | 'daily' | 'weekly';

export interface DigestSettings {
	enabled: boolean;
	mode: DigestMode;
	template: string;
	folderPath: string;
}

export interface PluginSettings {
	feeds: any[];
	groups: string[];
	openaiKey: string;
	rssFolder: string;
	fetchFrequency: FetchFrequency;
	maxArticles: number;
	retentionDays: number;
	readingMode: boolean;
	lastFetch: number;
	lastReadArticle: string | null;
	currentFeed: string | null;
	currentFolder: string | null;
	articleStates: Record<string, any>;
	template: string;
	digest: DigestSettings;
}
export const DEFAULT_SETTINGS: PluginSettings = {
	feeds: [],
	groups: ['Défaut'],
	openaiKey: '',
	rssFolder: 'RSS',
	fetchFrequency: 'startup',
	maxArticles: 50,
	retentionDays: 30,
	readingMode: false,
	lastFetch: Date.now(),
	lastReadArticle: null,
	currentFeed: null,
	currentFolder: null,
	articleStates: {},
	template: `# {{title}}

{{excerpt}}

{{content}}

---
Source : [{{siteName}}]({{link}})
Auteur : {{author}}
{{readingTime}}`,
	digest: {
		enabled: false,
		mode: 'disabled',
		template: '',
		folderPath: ''
	}
}; 