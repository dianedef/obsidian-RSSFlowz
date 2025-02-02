export const en = {
  plugin: {
    loaded: 'RSS Reader plugin loaded',
    unloaded: 'RSS Reader plugin unloaded'
  },
  settings: {
    title: 'RSS Reader Settings',
    openaiKey: {
      name: 'OpenAI API Key',
      desc: 'Your OpenAI API key for summaries'
    },
    rssFolder: {
      name: 'RSS Folder',
      desc: 'Folder where articles will be saved',
      updated: 'RSS folder updated'
    },
    fetchFrequency: {
      name: 'Update Frequency',
      desc: 'How often do you want to fetch new articles?',
      options: {
        startup: 'At startup only',
        daily: 'Once a day',
        hourly: 'Every hour'
      }
    },
    maxArticles: {
      name: 'Maximum Number of Articles',
      desc: 'Maximum number of articles to fetch per feed'
    },
    retentionDays: {
      name: 'Retention Period (days)',
      desc: 'Number of days to keep articles before deletion'
    },
    importExport: {
      title: 'Import/Export',
      opmlImport: {
        name: 'Import OPML File',
        desc: 'Import feeds from an OPML file',
        button: 'Import OPML'
      },
      opmlExport: {
        name: 'Export to OPML',
        desc: 'Export your feeds in OPML format',
        button: 'Export OPML'
      },
      jsonImport: {
        name: 'Import JSON Configuration',
        desc: 'Restore a previously exported configuration',
        button: 'Import data.json'
      },
      jsonExport: {
        name: 'Export JSON Configuration',
        desc: 'Backup all your settings into a file',
        button: 'Export data.json'
      }
    },
    groups: {
      title: 'Group Management',
      add: {
        name: 'Add a Group',
        desc: 'Create a new group to organize your feeds',
        placeholder: 'Name of the new group',
        success: 'Group added:'
      },
      delete: {
        button: 'Delete',
        confirm: 'Delete Group',
        confirmMessage: 'Are you sure you want to delete the group "{group}"?',
        warning: 'Warning: All articles in this group will also be deleted!',
        success: 'Group deleted: {group}',
        error: 'Error deleting group',
        cancel: 'Cancel'
      },
      none: 'No group'
    },
    feeds: {
      title: 'Feed Management',
      search: {
        placeholder: 'Search for a feed...'
      },
      options: {
        saveType: 'Save Type',
        saveTypes: {
          multiple: 'One file per article',
          single: 'All articles in one file'
        }
      },
      group: {
        name: 'Group',
        desc: 'Choose a group for this feed',
        noGroup: 'No group',
        success: 'Feed moved to group: {group}',
        error: 'Error changing group'
      },
      summarize: {
        name: 'Summarize articles',
        desc: 'Use AI to generate article summaries',
        error: 'OpenAI API key required for summaries'
      },
      rewrite: {
        name: 'Rewrite articles',
        desc: 'Use AI to rewrite articles',
        error: 'OpenAI API key required for rewriting'
      },
      transcribe: {
        name: 'Transcribe audio/video',
        desc: 'Use AI to transcribe audio/video content',
        error: 'OpenAI API key required for transcription'
      },
      add: {
        name: 'Add a feed',
        desc: 'Enter an RSS feed URL',
        placeholder: 'RSS feed URL',
        success: 'Feed added: {title}',
        error: 'Error adding feed',
        sslError: 'SSL error while connecting to feed',
        fetching: 'Fetching articles for',
        fetchError: 'Error fetching articles for'
      },
      deleteAll: {
        button: 'Delete all feeds',
        success: 'All feeds have been deleted',
        error: 'Error deleting feeds',
        confirm: 'Are you sure you want to delete these feeds?',
        confirmMessage: 'Are you sure you want to delete these feeds?'
      },
      delete: {
        button: 'Delete',
        success: 'Feed deleted: {title}',
        confirm: 'Are you sure you want to delete this feed?',
        confirmMessage: 'Are you sure you want to delete this feed?'
      }
    }
  },
  commands: {
    refresh: {
      name: 'Refresh feeds',
      start: 'Refreshing feeds...',
      error: 'Error refreshing feed {url}',
      complete: 'Feeds refresh complete'
    },
    import: {
      name: 'Import OPML file',
      success: 'OPML import successful',
      error: 'Error importing OPML'
    },
    export: {
      name: 'Export to OPML',
      success: 'OPML export successful to {path}',
      error: 'Error exporting OPML'
    },
    reading: {
      toggle: 'Toggle reading mode',
      next: 'Next article',
      previous: 'Previous article'
    }
  },
  notices: {
    import: {
      opml: {
        loading: 'Importing OPML...',
        success: 'OPML import successful',
        error: 'Error importing OPML'
      },
      json: {
        loading: 'Importing configuration...',
        success: 'Configuration imported successfully',
        error: 'Error importing configuration'
      }
    },
    export: {
      opml: {
        loading: 'Exporting OPML...',
        success: 'Feeds exported successfully',
        error: 'Error exporting OPML'
      },
      json: {
        loading: 'Exporting configuration...',
        success: 'Configuration exported successfully',
        error: 'Error exporting configuration'
      }
    },
    template: {
      name: 'Note template',
      desc: 'Template for note creation (uses {{title}}, {{description}}, {{link}}, {{pubDate}})'
    },
    feed: {
      exists: 'This RSS feed is already in your list',
      invalid: 'Invalid URL: This is not a valid RSS/Atom feed',
      added: 'Feed added: {title}',
      deleted: 'Feed deleted: {title}',
      moved: 'Feed {title} moved from "{source}" to "{destination}"',
      fetchError: 'Error fetching feed {title}',
      fetchSuccess: '{count} articles fetched for {title}',
      noArticles: 'No articles found for {title}'
    },
    settings: {
      feedTypeChanged: 'Save type changed for {title}',
      feedDeleted: 'Feed deleted: {title}',
      aiToggled: '{feature} {status} for {title}',
      feedMoved: 'Feed {title} moved to {group}'
    }
  },
  errors: {
    reading: {
      enter: 'Error entering reading mode',
      navigation: 'Error navigating between articles',
      open: 'Error opening article',
      mark: 'Error marking article as read'
    },
    sync: {
      feed: 'Error syncing feed',
      parse: 'Error parsing RSS feed'
    },
    storage: {
      load: 'Error loading data',
      save: 'Error saving data'
    },
    ssl: 'SSL Certificate Error\nThe site has an invalid certificate.\nCheck if the site is accessible in your browser.',
    generic: 'Error: {message}'
  }
}