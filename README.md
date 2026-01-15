# RSS Reader pour Obsidian

## 🇫🇷 Français

Un puissant lecteur RSS pour Obsidian qui transforme vos flux RSS en notes Markdown avec des fonctionnalités avancées d'IA.

### ✨ Fonctionnalités principales

- **Organisation intelligente**
  - Créez des groupes pour organiser vos flux RSS
  - Choisissez entre un fichier par article ou un fichier unique par flux
  - Recherchez facilement dans vos flux
  - Interface utilisateur intuitive et responsive

- **Gestion avancée des contenus**
  - Importation/exportation OPML pour migrer facilement vos flux
  - Sauvegarde/restauration de la configuration complète
  - Nettoyage automatique des anciens articles
  - Support des flux RSS et Atom

- **Fonctionnalités IA (avec OpenAI)**
  - Génération automatique de résumés d'articles
  - Réécriture d'articles dans un style plus clair
  - Transcription automatique des vidéos YouTube

### 🚀 Installation

#### Installation via BRAT (recommandé pour les versions de développement)

1. Installez le plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Ouvrez les paramètres de BRAT
3. Cliquez sur "Add Beta plugin"
4. Entrez: `dianedef/obsidian-RSSFlowz`
5. Activez le plugin dans les paramètres d'Obsidian

#### Installation manuelle

1. Dans Obsidian, allez dans Paramètres > Extensions tierces
2. Désactivez le mode restreint
3. Cliquez sur "Parcourir" et recherchez "RSS Reader"
4. Installez l'extension

### ⚙️ Configuration

- Définissez le dossier de destination des articles
- Choisissez la fréquence de mise à jour (horaire/quotidienne)
- Configurez le nombre maximum d'articles à conserver
- Ajoutez votre clé API OpenAI pour les fonctionnalités d'IA
- Créez des groupes pour organiser vos flux

### 📝 Utilisation

1. Ajoutez des flux RSS via l'URL ou importez un fichier OPML
2. Organisez vos flux en groupes
3. Les articles sont automatiquement téléchargés selon la fréquence choisie
4. Retrouvez vos articles dans le dossier RSS de votre coffre-fort

---

# RSS Reader for Obsidian

## 🇬🇧 English

A powerful RSS reader for Obsidian that transforms your RSS feeds into Markdown notes with advanced AI features.

### ✨ Key Features

- **Smart Organization**
  - Create groups to organize your RSS feeds
  - Choose between one file per article or one file per feed
  - Easy feed search
  - Intuitive and responsive user interface

- **Advanced Content Management**
  - OPML import/export for easy feed migration
  - Complete configuration backup/restore
  - Automatic cleanup of old articles
  - RSS and Atom feeds support

- **AI Features (with OpenAI)**
  - Automatic article summary generation
  - Article rewriting in a clearer style
  - Automatic YouTube video transcription

### 🚀 Installation

#### Installation via BRAT (recommended for development versions)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings
3. Click "Add Beta plugin"
4. Enter: `dianedef/obsidian-RSSFlowz`
5. Enable the plugin in Obsidian settings

#### Manual Installation

1. In Obsidian, go to Settings > Third-party plugins
2. Disable restricted mode
3. Click "Browse" and search for "RSS Reader"
4. Install the plugin

### ⚙️ Configuration

- Set the article destination folder
- Choose update frequency (hourly/daily)
- Configure maximum number of articles to keep
- Add your OpenAI API key for AI features
- Create groups to organize your feeds

### 📝 Usage

1. Add RSS feeds via URL or import an OPML file
2. Organize your feeds into groups
3. Articles are automatically downloaded based on chosen frequency
4. Find your articles in the RSS folder of your vault

## 🔧 Technical Details

- Built for Obsidian 0.15.0+
- Uses modern web standards
- Efficient XML parsing
- Robust error handling
- Secure API communication