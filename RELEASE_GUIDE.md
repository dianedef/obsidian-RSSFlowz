# Release Guide for obsidian-RSSFlowz

This guide explains how to create a new release that works with BRAT and Obsidian's plugin system.

## Prerequisites

- Ensure all changes are committed and pushed
- Make sure the build passes: `npm run build`
- Update CHANGELOG if applicable

## Creating a Release

### Method 1: Automated (Recommended)

1. **Update version in package.json**
   ```bash
   npm version patch  # for bug fixes (1.0.0 -> 1.0.1)
   npm version minor  # for new features (1.0.0 -> 1.1.0)
   npm version major  # for breaking changes (1.0.0 -> 2.0.0)
   ```
   
   This will automatically:
   - Update package.json
   - Update manifest.json via version-bump.mjs
   - Update versions.json
   - Create a git tag

2. **Push the tag**
   ```bash
   git push --follow-tags
   ```

3. **GitHub Actions will automatically**:
   - Build the plugin
   - Create a GitHub release
   - Attach main.js, manifest.json, and styles.css

### Method 2: Manual

1. **Update versions**:
   - Update `version` in package.json
   - Run `npm run version` to update manifest.json and versions.json
   - Commit changes: `git commit -am "Bump version to X.Y.Z"`

2. **Create and push tag**:
   ```bash
   git tag X.Y.Z
   git push origin X.Y.Z
   ```

3. **The GitHub Action will create the release automatically**

## Required Files for BRAT

Each release must include these files as assets:
- ✅ `main.js` - The compiled plugin code
- ✅ `manifest.json` - Plugin metadata
- ✅ `styles.css` - Plugin styles

The GitHub Action workflow handles this automatically.

## Verifying the Release

After the release is created:

1. Check that the release has all three files attached
2. Verify the version in manifest.json matches the tag
3. Test installation via BRAT:
   - Install BRAT plugin in Obsidian
   - Add `dianedef/obsidian-RSSFlowz` as a beta plugin
   - Verify it installs correctly

## Troubleshooting

### BRAT can't find the release
- Ensure the release is published (not draft)
- Check that main.js, manifest.json, and styles.css are attached
- Verify the tag version matches manifest.json version

### Build fails
- Run `npm install` to ensure dependencies are up to date
- Run `npm run build` locally to test
- Check the GitHub Actions logs for errors

## Version Compatibility

The `versions.json` file tracks which Obsidian version is required for each plugin version:
```json
{
  "1.0.0": "0.15.0"
}
```

This means plugin version 1.0.0 requires Obsidian 0.15.0 or higher.
