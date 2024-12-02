export const fr = {
  settings: {
    title: "Paramètres du lecteur RSS",
    openaiKey: {
      name: "Clé API OpenAI",
      desc: "Votre clé API OpenAI pour les résumés"
    },
    rssFolder: {
      name: "Dossier RSS",
      desc: "Dossier où seront sauvegardés les articles"
    },
    fetchFrequency: {
      name: "Fréquence de mise à jour",
      desc: "À quelle fréquence voulez-vous récupérer les nouveaux articles ?",
      options: {
        startup: "Au démarrage uniquement",
        daily: "Une fois par jour",
        hourly: "Toutes les heures"
      }
    },
    maxArticles: {
      name: "Nombre maximum d'articles",
      desc: "Nombre maximum d'articles à récupérer par feed"
    },
    retentionDays: {
      name: "Durée de rétention (jours)",
      desc: "Nombre de jours pendant lesquels garder les articles avant suppression"
    },
    importExport: {
      title: "Import/Export",
      opmlImport: {
        name: "Import d'un fichier OPML",
        desc: "Importer des feeds depuis un fichier OPML",
        button: "Importer OPML"
      },
      opmlExport: {
        name: "Export vers OPML",
        desc: "Exporter vos feeds au format OPML",
        button: "Exporter OPML"
      }
    },
    groups: {
      title: "Gestion des Groupes",
      add: {
        name: "Ajouter un groupe",
        desc: "Créer un nouveau groupe pour organiser vos feeds",
        placeholder: "Nom du nouveau groupe",
        success: "Groupe ajouté :"
      },
      delete: {
        button: "Supprimer",
        confirm: "Êtes-vous sûr de vouloir supprimer ce groupe ?",
        success: "Groupe supprimé :"
      },
      none: "Sans groupe"
    }
  },
  notices: {
    import: {
      opml: {
        loading: "Import OPML en cours...",
        success: "Import OPML terminé avec succès",
        error: "Erreur lors de l'import OPML"
      }
    },
    export: {
      opml: {
        loading: "Export OPML en cours...",
        success: "Feeds exportés avec succès",
        error: "Erreur lors de l'export OPML"
      }
    },
    feed: {
      exists: "Ce feed RSS est déjà dans votre liste",
      invalid: "URL invalide : Ce n'est pas un feed RSS/Atom valide",
      added: "Feed ajouté : {title}",
      deleted: "Feed supprimé : {title}",
      moved: "Feed {title} déplacé de \"{source}\" vers \"{destination}\"",
      fetchError: "Erreur lors de la récupération du feed {title}",
      fetchSuccess: "{count} articles récupérés pour {title}",
      noArticles: "Aucun article trouvé pour {title}"
    }
  },
  ribbons: {
    refresh: {
      name: "Rafraîchir les flux RSS",
      tooltip: "Rafraîchir les flux RSS"
    },
    reading: {
      name: "Mode Lecture RSS",
      tooltip: "Activer/Désactiver le mode lecture"
    }
  },
  commands: {
    importOpml: {
      name: "Importer un fichier OPML",
      desc: "Importer un fichier OPML"
    },
    exportOpml: {
      name: "Exporter en OPML",
      desc: "Exporter un fichier OPML"
    },
    nextArticle: {
      name: "Article suivant",
      desc: "Aller à l'article suivant"
    },
    previousArticle: {
      name: "Article précédent",
      desc: "Aller à l'article précédent"
    }
  },
  placeholders: {
    searchFeeds: "Rechercher dans vos feeds...",
    addFeed: "Entrez l'URL d'un flux RSS",
    addGroup: "Entrez le nom du groupe",
    noFeeds: "Aucun feed trouvé",
    noArticles: "Aucun article trouvé",
    loading: "Chargement..."
  }
} 