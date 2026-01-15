# Creating the First Release for BRAT

This repository is now fully configured to work with BRAT (Beta Reviewers Auto-update Tool). To create the first release and enable BRAT installation, follow these simple steps:

## Quick Start

```bash
# 1. Ensure you're on master/main branch with latest changes
git checkout master  # or main
git pull

# 2. Create and push the version tag
git tag 1.0.0
git push origin 1.0.0
```

That's it! The GitHub Actions workflow will automatically:
- ✅ Build the plugin (`npm run build`)
- ✅ Create a GitHub release named "1.0.0"
- ✅ Attach `main.js`, `manifest.json`, and `styles.css`

## Verifying the Release

1. Go to: https://github.com/dianedef/obsidian-RSSFlowz/releases
2. You should see a release titled "1.0.0"
3. The release should have 3 files attached:
   - `main.js` (~354 KB)
   - `manifest.json`
   - `styles.css`

## Installing with BRAT

Once the release is created, users can install the plugin via BRAT:

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) in Obsidian
2. Open Obsidian Settings → BRAT
3. Click "Add Beta plugin"
4. Enter: `dianedef/obsidian-RSSFlowz`
5. Enable the plugin in Settings → Community plugins

## For Future Releases

For subsequent releases, use the npm version command which automates everything:

```bash
# For bug fixes (1.0.0 -> 1.0.1)
npm version patch
git push --follow-tags

# For new features (1.0.0 -> 1.1.0)
npm version minor
git push --follow-tags

# For breaking changes (1.0.0 -> 2.0.0)
npm version major
git push --follow-tags
```

The `npm version` command automatically:
- Updates `package.json`
- Updates `manifest.json` and `versions.json` (via version-bump.mjs)
- Creates a git commit
- Creates a git tag

Then `git push --follow-tags` pushes both the commit and tag, triggering the release workflow.

## Troubleshooting

### The workflow didn't run
- Check that you pushed the tag: `git push origin 1.0.0`
- Verify the workflow file exists: `.github/workflows/release.yml`
- Check the Actions tab on GitHub for any errors

### The release has no files attached
- Check the workflow logs in the Actions tab
- Ensure `npm run build` works locally
- Verify that `main.js`, `manifest.json`, and `styles.css` exist after building

### BRAT can't find the plugin
- Ensure at least one release exists with proper version tag (e.g., "1.0.0")
- Verify the release is published (not draft)
- Check that all three required files are attached to the release
- Make sure the repository is public

## Technical Details

### Required Files
- ✅ `manifest.json` - Plugin metadata (version: 1.0.0)
- ✅ `versions.json` - Version compatibility (1.0.0 requires Obsidian 0.15.0+)
- ✅ `styles.css` - Plugin styles
- ✅ `.github/workflows/release.yml` - Automated release workflow
- ✅ `esbuild.config.js` - Build configuration
- ✅ `version-bump.mjs` - Version management script

### Current Version
- Package version: 1.0.0
- Manifest version: 1.0.0
- Minimum Obsidian version: 0.15.0

All files are properly configured and ready for the first release!
