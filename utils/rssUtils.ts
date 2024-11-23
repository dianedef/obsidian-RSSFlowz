import { parseString } from 'xml2js';
import Parser from 'rss-parser';

export async function parseOpml(opmlContent: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        parseString(opmlContent, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            
            const feeds = result.opml.body[0].outline[0].outline
                .map((outline: any) => ({
                    title: outline.$.title,
                    url: outline.$.xmlUrl,
                    category: outline.$.category || '',
                    type: 'feed',
                    status: 'active',
                    tags: outline.$.category ? [outline.$.category] : []
                }));
            
            resolve(feeds);
        });
    });
}

export async function parseFeed(url: string) {
    const parser = new Parser();
    return await parser.parseURL(url);
}

export function createMarkdownFromFeed(feedItem: any): string {
    return `# ${feedItem.title}

Date: ${feedItem.pubDate}
Link: ${feedItem.link}

${feedItem.content}`;
} 