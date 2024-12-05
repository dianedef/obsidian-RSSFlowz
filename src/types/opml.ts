import { RSSFeed } from "./rss";

export interface OpmlOutline {
	text: string;
	title?: string;
	type?: string;
	xmlUrl?: string;
	htmlUrl?: string;
	description?: string;
	outlines?: OpmlOutline[];
}

export interface OpmlDocument {
	title: string;
	dateCreated?: Date;
	dateModified?: Date;
	ownerName?: string;
	ownerEmail?: string;
	outlines: OpmlOutline[];
}

export interface OpmlImportOptions {
	overwrite?: boolean;
	categorize?: boolean;
	defaultCategory?: string;
}

export interface OpmlExportOptions {
	includeMetadata?: boolean;
	prettyPrint?: boolean;
}

export interface OpmlServiceInterface {
	importOpml(
		opmlContent: string,
		options?: OpmlImportOptions
	): Promise<RSSFeed[]>;
	exportOpml(feeds: RSSFeed[], options?: OpmlExportOptions): Promise<string>;
	parseOpml(opmlContent: string): OpmlDocument;
	buildOpml(document: OpmlDocument): string;
}

export interface OpmlError extends Error {
	type: "parse" | "export" | "import";
	originalError?: Error;
}
