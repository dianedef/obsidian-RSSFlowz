export const en = {
  plugin: {
    loaded: 'RSS Reader plugin loaded',
    unloaded: 'RSS Reader plugin unloaded'
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
      toggle: 'Toggle reading mode'
    }
  },
  feeds: {
    added: 'RSS feed added: {url}',
    removed: 'RSS feed removed: {url}',
    updated: 'RSS feed updated: {url}'
  },
  settings: {
    title: 'RSS Reader Settings',
    defaultFolder: {
      name: 'Default folder',
      desc: 'Folder where notes will be created by default'
    },
    updateInterval: {
      name: 'Update interval',
      desc: 'Default interval in minutes between updates'
    },
    maxItems: {
      name: 'Maximum number of articles',
      desc: 'Maximum number of articles to keep per feed'
    },
    template: {
      name: 'Note template',
      desc: 'Template for note creation (uses {{title}}, {{description}}, {{link}}, {{pubDate}})'
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
    }
  }
} 