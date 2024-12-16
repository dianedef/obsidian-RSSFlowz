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
      desc: 'Folder where articles will be saved'
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
        confirm: 'Are you sure you want to delete this group?',
        success: 'Group deleted:'
      },
      none: 'No group'
    },
    feeds: {
      title: 'Feed Management',
      search: {
        placeholder: 'Search for a feed...'
      },
      add: {
        name: 'Add a Feed',
        desc: 'Enter the URL of an RSS feed',
        placeholder: 'RSS feed URL',
        success: 'Feed added: {title}'
      },
      deleteAll: {
        name: 'Delete all feeds',
        desc: 'Delete all feeds from your list',
        button: 'Delete all feeds',
        confirm: 'Are you sure you want to delete these feeds?',
        confirmMessage: 'Are you sure you want to delete these feeds?',
        success: 'Feeds deleted:'
      },
      delete: {
        button: 'Delete',
        success: 'Feed deleted: {title}'
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