         .modal {
            --header-height: 0px !important;
            --file-explorer-width: 0px !important;
            width: 90vw !important;
            height: 90vh !important;
            max-width: none !important;
            max-height: none !important;
            position: fixed !important;
            border-radius: 0 !important;
            border: 1px solid var(--background-modifier-border) !important;
            top: 5vh !important;
            left: 5vw !important;
            z-index: 9999;
            background-color: var(--background-primary);
         }

         .plugin-manager-modal .modal-content {
            padding: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden; 
         }

         .modal-content {
            display: flex;
            flex-direction: column;
            justify-content: center; /* Centrer le contenu */
            height: 100%;
            overflow: hidden;
         }

         .reading-mode-controls {
            margin-top: auto; /* Pousse la barre de contrôle vers le bas */
            display: flex;
            gap: 10px;
            justify-content: center;
            align-items: center;
            padding: 10px; /* Ajoute un peu de padding autour de la barre */
            border-top: 1px solid var(--background-modifier-border); /* Ajoute une ligne de séparation */
         }

         .reading-mode-controls button {
            padding: 8px 16px;
            border-radius: 4px;
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            border: none;
            cursor: pointer;
            font-size: 14px;
         }

         .reading-mode-controls button:hover {
            background: var(--interactive-accent-hover);
         }

         .reading-mode-select {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-primary);
            color: var(--text-normal);
            min-width: 150px;
         }

         .reading-mode-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--background-modifier-border);
         }

         
         .reading-mode-active .workspace-tabs {
            padding: 0 !important;
         }

         .reading-mode-active .workspace {
            padding: 0 !important;
         }

         .reading-mode-active .workspace-leaf.mod-active {
            --file-line-width: 70rem;
         }

         .reading-mode-active .workspace-split.mod-left-split,
         .reading-mode-active .workspace-split.mod-right-split,
         .reading-mode-active .status-bar {
            display: none !important;
         }

         .reading-mode-active .workspace-leaf {
            width: 100% !important;
         }

         .reading-mode-active .markdown-preview-view {
            padding: 2em 20% !important;
         }

         .reading-mode-container {
            background: var(--background-primary);
            border-top: 1px solid var(--background-modifier-border);
            padding: 10px;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
         }
