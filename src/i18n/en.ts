export const en = {
  settings: {
    title: "RSS Reader Settings",
    openaiKey: {
      name: "OpenAI API Key",
      desc: "Your OpenAI API key for summaries"
    },
    rssFolder: {
      name: "RSS Folder",
      desc: "Folder where articles will be saved"
    },
    fetchFrequency: {
      name: "Update Frequency",
      desc: "How often do you want to fetch new articles?",
      options: {
        startup: "At startup only",
        daily: "Once a day",
        hourly: "Every hour"
      }
    },
    maxArticles: {
      name: "Maximum Number of Articles",
      desc: "Maximum number of articles to fetch per feed"
    },
    retentionDays: {
      name: "Retention Period (days)",
      desc: "Number of days to keep articles before deletion"
    },
    importExport: {
      title: "Import/Export",
      opmlImport: {
        name: "Import OPML File",
        desc: "Import feeds from an OPML file",
        button: "Import OPML"
      },
      opmlExport: {
        name: "Export to OPML",
        desc: "Export your feeds in OPML format",
        button: "Export OPML"
      }
    },
    groups: {
      title: "Group Management",
      add: {
        name: "Add a Group",
        desc: "Create a new group to organize your feeds",
        placeholder: "Name of the new group",
        success: "Group added:"
      },
      delete: {
        button: "Delete",
        confirm: "Are you sure you want to delete this group?",
        success: "Group deleted:"
      },
      none: "No group"
    }
  },
  notices: {
    import: {
      opml: {
        loading: "Importing OPML...",
        success: "OPML import successful",
        error: "Error importing OPML"
      }
    },
    export: {
      opml: {
        loading: "Exporting OPML...",
        success: "Feeds exported successfully",
        error: "Error exporting OPML"
      }
    },
    feed: {
      exists: "This RSS feed is already in your list",
      invalid: "Invalid URL: This is not a valid RSS/Atom feed",
      added: "Feed added: {title}",
      deleted: "Feed deleted: {title}",
      moved: "Feed {title} moved from \"{source}\" to \"{destination}\"",
      fetchError: "Error fetching feed {title}",
      fetchSuccess: "{count} articles fetched for {title}",
      noArticles: "No articles found for {title}"
    }
  },
  ribbons: {
    refresh: {
      name: "Refresh RSS Feeds",
      tooltip: "Refresh RSS feeds"
    },
    reading: {
      name: "RSS Reading Mode",
      tooltip: "Enable/Disable reading mode"
    }
  },
  commands: {
    importOpml: {
      name: "Import OPML file",
      desc: "Import an OPML file"
    },
    exportOpml: {
      name: "Export OPML file",
      desc: "Export an OPML file"
    },
    nextArticle: {
      name: "Next Article",
      desc: "Go to next article"
    },
    previousArticle: {
      name: "Previous Article",
      desc: "Go to previous article"
    }
  },
  placeholders: {
    searchFeeds: "Search your feeds...",
    addFeed: "Enter RSS feed URL",
    addGroup: "Enter group name",
    noFeeds: "No feeds found",
    noArticles: "No articles found",
    loading: "Loading..."
  }
} 