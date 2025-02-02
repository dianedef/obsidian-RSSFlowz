import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpmlService } from '../OpmlService';
import { StorageService } from '../StorageService';
import { LogService } from '../LogService';
import { Plugin } from 'obsidian';

describe('OpmlService', () => {
  let opmlService: OpmlService;
  let storageService: StorageService;
  let logService: LogService;
  let plugin: Plugin;

  beforeEach(() => {
    plugin = {
      loadData: vi.fn(),
      saveData: vi.fn()
    } as unknown as Plugin;

    storageService = new StorageService(plugin);
    logService = new LogService(console);
    opmlService = new OpmlService(plugin, storageService, logService);
  });

  describe('importOpml', () => {
    it('devrait importer correctement les feeds depuis un fichier OPML', async () => {
      // Mock des données initiales
      (plugin.loadData as ReturnType<typeof vi.fn>).mockResolvedValue({
        feeds: [],
        settings: {
          feeds: [],
          groups: ['Défaut'],
          rssFolder: 'RSS'
        }
      });

      const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <opml version="2.0">
          <head>
            <title>RSS Feeds Export</title>
          </head>
          <body>
            <outline text="Feeds">
              <outline text="Test Feed" title="Test Feed" type="rss" 
                xmlUrl="https://example.com/feed.xml" htmlUrl="https://example.com"
                description="Test description" category="Test Category"
                status="active" saveType="multiple" />
            </outline>
          </body>
        </opml>`;

      const result = await opmlService.importOpml(opmlContent);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.errors).length(0);
      expect(result.duplicates).length(0);

      // Vérifier que saveData a été appelé avec les bonnes données
      expect(plugin.saveData).toHaveBeenCalled();
      const savedData = (plugin.saveData as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(savedData.feeds).length(1);
      expect(savedData.feeds[0].settings.title).toBe('Test Feed');
    });
  });
}); 
