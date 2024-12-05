import { App, PluginSettingTab, Setting, TextComponent } from 'obsidian'
import RSSReaderPlugin from '../main'

export class RSSReaderSettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: RSSReaderPlugin
  ) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()
    containerEl.createEl('h2', { text: 'Paramètres RSS Reader' })

    new Setting(containerEl)
      .setName('Dossier par défaut')
      .setDesc('Dossier où seront créées les notes par défaut')
      .addText((text: TextComponent) => text
        .setPlaceholder('RSS')
        .setValue(this.plugin.settings.defaultFolder)
        .onChange(async (value: string) => {
          this.plugin.settings.defaultFolder = value
          await this.plugin.saveSettings()
        }))

    new Setting(containerEl)
      .setName('Intervalle de mise à jour')
      .setDesc('Intervalle par défaut en minutes entre les mises à jour')
      .addText((text: TextComponent) => text
        .setPlaceholder('60')
        .setValue(String(this.plugin.settings.defaultUpdateInterval))
        .onChange(async (value: string) => {
          const interval = parseInt(value)
          if (!isNaN(interval) && interval > 0) {
            this.plugin.settings.defaultUpdateInterval = interval
            await this.plugin.saveSettings()
          }
        }))

    new Setting(containerEl)
      .setName('Nombre maximum d\'articles')
      .setDesc('Nombre maximum d\'articles à conserver par flux')
      .addText((text: TextComponent) => text
        .setPlaceholder('50')
        .setValue(String(this.plugin.settings.maxItemsPerFeed))
        .onChange(async (value: string) => {
          const max = parseInt(value)
          if (!isNaN(max) && max > 0) {
            this.plugin.settings.maxItemsPerFeed = max
            await this.plugin.saveSettings()
          }
        }))

    new Setting(containerEl)
      .setName('Template des notes')
      .setDesc('Template pour la création des notes (utilise {{title}}, {{description}}, {{link}}, {{pubDate}})')
      .addTextArea((text: TextComponent) => text
        .setPlaceholder('# {{title}}\n\n{{description}}\n\n{{link}}')
        .setValue(this.plugin.settings.template)
        .onChange(async (value: string) => {
          this.plugin.settings.template = value
          await this.plugin.saveSettings()
        }))
  }
} 