export const fr = {
  plugin: {
    loaded: 'Plugin RSS Reader chargé',
    unloaded: 'Plugin RSS Reader déchargé'
  },
  commands: {
    refresh: {
      name: 'Rafraîchir les flux',
      start: 'Rafraîchissement des flux en cours...',
      error: 'Erreur lors du rafraîchissement du flux {url}',
      complete: 'Rafraîchissement des flux terminé'
    },
    import: {
      name: 'Importer un fichier OPML',
      success: 'Import OPML réussi',
      error: 'Erreur lors de l\'import OPML'
    },
    export: {
      name: 'Exporter en OPML',
      success: 'Export OPML réussi dans {path}',
      error: 'Erreur lors de l\'export OPML'
    },
    reading: {
      toggle: 'Activer/Désactiver le mode lecture'
    }
  },
  feeds: {
    added: 'Flux RSS ajouté : {url}',
    removed: 'Flux RSS supprimé : {url}',
    updated: 'Flux RSS mis à jour : {url}'
  },
  settings: {
    title: 'Paramètres RSS Reader',
    defaultFolder: {
      name: 'Dossier par défaut',
      desc: 'Dossier où seront créées les notes par défaut'
    },
    updateInterval: {
      name: 'Intervalle de mise à jour',
      desc: 'Intervalle par défaut en minutes entre les mises à jour'
    },
    maxItems: {
      name: 'Nombre maximum d\'articles',
      desc: 'Nombre maximum d\'articles à conserver par flux'
    },
    template: {
      name: 'Template des notes',
      desc: 'Template pour la création des notes (utilise {{title}}, {{description}}, {{link}}, {{pubDate}})'
    }
  },
  errors: {
    reading: {
      enter: 'Erreur lors de l\'entrée en mode lecture',
      navigation: 'Erreur lors de la navigation entre articles',
      open: 'Erreur lors de l\'ouverture de l\'article',
      mark: 'Erreur lors du marquage de l\'article comme lu'
    },
    sync: {
      feed: 'Erreur lors de la synchronisation du flux',
      parse: 'Erreur lors du parsing du flux RSS'
    },
    storage: {
      load: 'Erreur lors du chargement des données',
      save: 'Erreur lors de la sauvegarde des données'
    }
  }
} 