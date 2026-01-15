# Release Guide for obsidian-RSSFlowz

This guide explains how to create a new release that works with BRAT and Obsidian's plugin system.

## Prerequisites

- Ensure all changes are committed and pushed
- Make sure the build passes: `npm run build`
- Update CHANGELOG if applicable

## Creating the First Release (v1.0.0)

If this is the first release, follow these steps:

1. **Ensure you're on the main/master branch**
   ```bash
   git checkout master  # or main
   git pull origin master
   ```

2. **Verify the build works**
   ```bash
   npm install
   npm run build
   ```

3. **Create and push the v1.0.0 tag**
   ```bash
   git tag 1.0.0
   git push origin 1.0.0
   ```

4. **The GitHub Actions workflow will automatically**:
   - Install dependencies with `npm ci`
   - Build the plugin with `npm run build`
   - Create a GitHub release named "1.0.0"
   - Attach `main.js`, `manifest.json`, and `styles.css` to the release

5. **Verify the release was created**:
   - Go to https://github.com/dianedef/obsidian-RSSFlowz/releases
   - Check that release "1.0.0" exists
   - Verify all three files are attached: main.js, manifest.json, styles.css

6. **Test with BRAT**:
   - In Obsidian, install the BRAT plugin
   - Add `dianedef/obsidian-RSSFlowz` as a beta plugin
   - Verify it installs and works correctly

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
