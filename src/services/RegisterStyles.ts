import { Plugin } from 'obsidian'

export class RegisterStyles {
   constructor(private plugin: Plugin) {}

   register(): void {
      // Ajouter ces styles CSS
      document.head.appendChild(Object.assign(document.createElement('style'), {
         id: 'rssflowz-styles',
         textContent: `
            /* Styles pour la vue de lecture */
            .rssflowz-reader-container {
               padding: 16px;
            }

            .rssflowz-reader-header {
               display: flex;
               justify-content: space-between;
               align-items: center;
               margin-bottom: 16px;
               padding-bottom: 8px;
               border-bottom: 1px solid var(--background-modifier-border);
            }

            .rssflowz-reader-nav-buttons {
               display: flex;
               gap: 8px;
            }

            .rssflowz-reader-nav-buttons button {
               padding: 4px 12px;
               border-radius: 4px;
               background: var(--interactive-accent);
               color: var(--text-on-accent);
               border: none;
               cursor: pointer;
               transition: background-color 0.2s ease;
            }

            .rssflowz-reader-nav-buttons button:hover {
               background: var(--interactive-accent-hover);
            }

            .rssflowz-reader-content {
               line-height: 1.6;
            }

            /* Styles pour la modal de lecture */
            .rssflowz-reading-mode-active {
               max-width: 800px;
               margin: 0 auto;
               padding: 20px;
               line-height: 1.6;
            }

            .rssflowz-reading-mode-active h1 {
               margin-bottom: 24px;
               padding-bottom: 12px;
               border-bottom: 1px solid var(--background-modifier-border);
            }

            .rssflowz-reading-mode-controls {
               position: fixed;
               bottom: 20px;
               left: 50%;
               transform: translateX(-50%);
               background: var(--background-primary);
               padding: 10px 20px;
               border-radius: 8px;
               box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
               display: flex;
               gap: 10px;
               align-items: center;
               z-index: 1000;
            }

            .rssflowz-reading-mode-select {
               padding: 4px 8px;
               border-radius: 4px;
               border: 1px solid var(--background-modifier-border);
               background: var(--background-primary);
               color: var(--text-normal);
            }

            .rssflowz-reading-mode-controls button {
               padding: 4px 12px;
               border-radius: 4px;
               background: var(--interactive-accent);
               color: var(--text-on-accent);
               border: none;
               cursor: pointer;
               transition: background-color 0.2s ease;
            }

            .rssflowz-reading-mode-controls button:hover {
               background: var(--interactive-accent-hover);
            }

            /* Styles pour le contenu des articles */
            .rssflowz-reading-mode-active img {
               max-width: 100%;
               height: auto;
               margin: 16px 0;
               border-radius: 4px;
            }

            .rssflowz-reading-mode-active blockquote {
               margin: 16px 0;
               padding: 8px 16px;
               border-left: 4px solid var(--interactive-accent);
               background: var(--background-primary-alt);
               border-radius: 0 4px 4px 0;
            }

            .rssflowz-reading-mode-active pre {
               margin: 16px 0;
               padding: 16px;
               background: var(--background-primary-alt);
               border-radius: 4px;
               overflow-x: auto;
            }

            .rssflowz-reading-mode-active code {
               font-family: var(--font-monospace);
               font-size: 0.9em;
               padding: 2px 4px;
               background: var(--background-primary-alt);
               border-radius: 3px;
            }

            .rssflowz-reading-mode-active a {
               color: var(--interactive-accent);
               text-decoration: none;
            }

            .rssflowz-reading-mode-active a:hover {
               text-decoration: underline;
            }

            /* Styles pour la section des feeds dans les paramètres */
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
               border-radius: 4px;
            }

            .rssflowz-feed-header:hover {
               background: var(--background-primary-alt);
            }

            .rssflowz-feed-title {
               font-size: 14px;
               font-weight: 600;
               color: var(--text-normal);
               margin-bottom: 4px;
            }

            .rssflowz-feed-url {
               font-size: 12px;
               color: var(--text-muted);
            }

            .rssflowz-feed-options {
               padding: 8px 12px;
               border-top: 1px solid var(--background-modifier-border);
            }

            .rssflowz-feed-buttons {
               float: right;
            }

            .rssflowz-feed-error-icon {
               color: var(--text-error);
            }

            .rssflowz-search-container {
               margin-bottom: 16px;
            }

            .rssflowz-feed-search-input {
               width: 100%;
               padding: 8px 12px;
               border-radius: 4px;
               border: 1px solid var(--background-modifier-border);
               background: var(--background-primary);
               color: var(--text-normal);
            }

            .rssflowz-feed-search-input:focus {
               border-color: var(--interactive-accent);
               outline: none;
            }

            /* Style pour les boutons d'avertissement */
            .setting-item button.mod-warning {
               color: white !important;
            }

            /* Animation pour le toggle des feeds */
            .rssflowz-feed-container.rssflowz-collapsed .rssflowz-feed-options {
               display: none;
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
