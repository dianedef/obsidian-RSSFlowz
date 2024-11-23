export async function parseOpml(opmlContent) {
    return new Promise((resolve, reject) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(opmlContent, 'text/xml');
        const outlines = doc.querySelectorAll('outline[xmlUrl]');
        
        const feeds = Array.from(outlines).map(outline => ({
            title: outline.getAttribute('title'),
            url: outline.getAttribute('xmlUrl'),
            category: outline.getAttribute('category') || '',
            type: 'feed',
            status: 'active',
            tags: outline.getAttribute('category') ? [outline.getAttribute('category')] : []
        }));
        
        resolve(feeds);
    });
}

export async function parseFeed(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    
    return {
        title: doc.querySelector('channel > title')?.textContent,
        items: Array.from(doc.querySelectorAll('item')).map(item => ({
            title: item.querySelector('title')?.textContent,
            content: item.querySelector('description')?.textContent,
            pubDate: item.querySelector('pubDate')?.textContent,
            link: item.querySelector('link')?.textContent
        }))
    };
} 