import { Plugin } from 'obsidian'

export class RegisterStyles {
   constructor(private plugin: Plugin) {}

   register(): void {
      // Ajouter ces styles CSS
      document.head.appendChild(Object.assign(document.createElement('style'), {
         id: 'rssflowz-styles',
         textContent: `
            /* Styles pour la section des feeds */
            .rssflowz-feeds-container {
               margin-top: 20px;
            }

            .rssflowz-feed-container {
               margin-bottom: 8px;
               border: 1px solid var(--background-modifier-border);
               border-radius: 4px;
            }

            .rssflowz-feed-header {
               padding: 8px 12px;
               cursor: pointer;
               background: var(--background-primary);
               display: flex;
               justify-content: space-between;
               align-items: center;
            }

            .rssflowz-feed-info {
               flex: 1;
               display: flex;
               align-items: center;
               gap: 12px;
            }

            .rssflowz-feed-title-group {
               flex: 1;
            }

            .rssflowz-feed-title {
               font-weight: 600;
               margin-bottom: 4px;
            }

            .rssflowz-feed-url {
               font-size: 12px;
               color: var(--text-muted);
            }

            .rssflowz-feed-controls {
               display: flex;
               align-items: center;
               gap: 8px;
            }

            .rssflowz-feed-options {
               padding: 8px 12px;
               border-top: 1px solid var(--background-modifier-border);
            }

            /* Animation pour le toggle des feeds */
            .rssflowz-feed-container.rssflowz-collapsed .rssflowz-feed-options {
               display: none;
            }

            /* Ajustements pour les contrôles */
            .rssflowz-feed-header .setting-item {
               border: none;
               padding: 0;
               margin: 0;
            }

            .rssflowz-feed-header .setting-item-control {
               padding: 0;
            }
         `
      }));
   }

   unregister(): void {
      const styleElement = document.getElementById('rssflowz-styles');
      if (styleElement) {
         styleElement.remove();
      }
   }
}
