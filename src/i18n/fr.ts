export const fr = {
  plugin: {
    loaded: 'Plugin RSS Reader chargé',
    unloaded: 'Plugin RSS Reader déchargé'
  },
  settings: {
    title: 'Paramètres du lecteur RSS',
    openaiKey: {
      name: 'Clé API OpenAI',
      desc: 'Votre clé API OpenAI pour les résumés'
    },
    rssFolder: {
      name: 'Dossier RSS',
      desc: 'Dossier où seront sauvegardés les articles',
      updated: 'Dossier RSS mis à jour'
    },
    fetchFrequency: {
      name: 'Fréquence de mise à jour',
      desc: 'À quelle fréquence voulez-vous récupérer les nouveaux articles ?',
      options: {
        startup: 'Au démarrage uniquement',
        daily: 'Une fois par jour',
        hourly: 'Toutes les heures'
      }
    },
    maxArticles: {
      name: 'Nombre maximum d\'articles',
      desc: 'Nombre maximum d\'articles à récupérer par feed'
    },
    retentionDays: {
      name: 'Durée de rétention (jours)',
      desc: 'Nombre de jours pendant lesquels garder les articles avant suppression'
    },
    importExport: {
      title: 'Import/Export',
      opmlImport: {
        name: 'Import d\'un fichier OPML',
        desc: 'Importer des feeds depuis un fichier OPML',
        button: 'Importer OPML'
      },
      opmlExport: {
        name: 'Export vers OPML',
        desc: 'Exporter vos feeds au format OPML',
        button: 'Exporter OPML'
      },
      jsonImport: {
        name: 'Importer une configuration JSON',
        desc: 'Restaurer une configuration précédemment exportée',
        button: 'Importer data.json'
      },
      jsonExport: {
        name: 'Exporter la configuration JSON',
        desc: 'Sauvegarder tous vos paramètres dans un fichier',
        button: 'Exporter data.json'
      }
    },
    groups: {
      title: 'Gestion des Groupes',
      add: {
        name: 'Ajouter un groupe',
        desc: 'Créer un nouveau groupe pour organiser vos feeds',
        placeholder: 'Nom du nouveau groupe',
        success: 'Groupe ajouté :'
      },
      delete: {
        button: 'Supprimer',
        confirm: 'Êtes-vous sûr de vouloir supprimer ce groupe ?',
        confirmMessage: 'Êtes-vous sûr de vouloir supprimer le groupe "{group}" ?',
        warning: 'Attention : Tous les articles de ce groupe seront également supprimés !',
        success: 'Groupe supprimé : {group}',
        error: 'Erreur lors de la suppression du groupe',
        cancel: 'Annuler'
      },
      none: 'Sans groupe'
    },
    feeds: {
      title: 'Gestion des feeds',
      search: {
        placeholder: 'Rechercher un feed...'
      },
      options: {
        saveType: 'Type de sauvegarde',
        saveTypes: {
          multiple: 'Un fichier par article',
          single: 'Tous les articles dans un fichier'
        }
      },
      group: {
        name: 'Groupe',
        desc: 'Choisissez un groupe pour ce feed',
        noGroup: 'Sans groupe',
        success: 'Feed déplacé vers le groupe : {group}',
        error: 'Erreur lors du changement de groupe'
      },
      summarize: {
        name: 'Résumer les articles',
        desc: 'Utiliser l\'IA pour générer un résumé des articles',
        error: 'Clé API OpenAI requise pour les résumés'
      },
      rewrite: {
        name: 'Réécrire les articles',
        desc: 'Utiliser l\'IA pour réécrire les articles',
        error: 'Clé API OpenAI requise pour la réécriture'
      },
      transcribe: {
        name: 'Transcrire l\'audio/vidéo',
        desc: 'Utiliser l\'IA pour transcrire le contenu audio/vidéo',
        error: 'Clé API OpenAI requise pour la transcription'
      },
      add: {
        name: 'Ajouter un feed',
        desc: 'Entrez l\'URL d\'un flux RSS',
        placeholder: 'URL du feed RSS',
        success: 'Feed ajouté : {title}',
        error: 'Erreur lors de l\'ajout du feed',
        sslError: 'Erreur SSL lors de la connexion au feed',
        fetching: 'Récupération des articles pour',
        fetchError: 'Erreur lors de la récupération des articles pour'
      },
      deleteAll: {
        button: 'Supprimer tous les feeds',
        success: 'Tous les feeds ont été supprimés',
        error: 'Erreur lors de la suppression des feeds',
        confirm: 'Êtes-vous sûr de vouloir supprimer ces feeds ?',
        confirmMessage: 'Êtes-vous sûr de vouloir supprimer ces feeds ?'
      },
      delete: {
        button: 'Supprimer',
        success: 'Feed supprimé : {title}',
        confirm: 'Êtes-vous sûr de vouloir supprimer ce feed ?',
        confirmMessage: 'Êtes-vous sûr de vouloir supprimer ce feed ?'
      }
    }
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
      toggle: 'Activer/Désactiver le mode lecture',
      next: 'Article suivant',
      previous: 'Article précédent'
    }
  },
  notices: {
    import: {
      opml: {
        loading: 'Import OPML en cours...',
        success: 'Import OPML terminé avec succès',
        error: 'Erreur lors de l\'import OPML'
      },
      json: {
        loading: 'Import de la configuration en cours...',
        success: 'Configuration importée avec succès',
        error: 'Erreur lors de l\'import de la configuration'
      }
    },
    export: {
      opml: {
        loading: 'Export OPML en cours...',
        success: 'Feeds exportés avec succès',
        error: 'Erreur lors de l\'export OPML'
      },
      json: {
        loading: 'Export de la configuration en cours...',
        success: 'Configuration exportée avec succès',
        error: 'Erreur lors de l\'export de la configuration'
      }
    },
    template: {
      name: 'Template des notes',
      desc: 'Template pour la création des notes (utilise {{title}}, {{description}}, {{link}}, {{pubDate}})'
    },
    feed: {
      exists: 'Ce feed RSS est déjà dans votre liste',
      invalid: 'URL invalide : Ce n\'est pas un feed RSS/Atom valide',
      added: 'Feed ajouté : {title}',
      deleted: 'Feed supprimé : {title}',
      moved: 'Feed {title} déplacé de "{source}" vers "{destination}"',
      fetchError: 'Erreur lors de la récupération du feed {title}',
      fetchSuccess: '{count} articles récupérés pour {title}',
      noArticles: 'Aucun article trouvé pour {title}'
    },
    settings: {
      feedTypeChanged: 'Type de sauvegarde modifié pour {title}',
      feedDeleted: 'Feed supprimé : {title}',
      aiToggled: '{feature} {status} pour {title}',
      feedMoved: 'Feed {title} déplacé vers {group}'
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
    },
    ssl: 'Erreur de certificat SSL\nLe site a un certificat invalide.\nVérifiez si le site est accessible dans votre navigateur.',
    generic: 'Erreur : {message}'
  }
} 