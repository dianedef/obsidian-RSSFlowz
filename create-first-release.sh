#!/bin/bash
# Script to create the first release for BRAT compatibility
# This script creates and pushes the v1.0.0 tag to trigger the GitHub Actions release workflow

set -e  # Exit on error

echo "🚀 Creating first release for BRAT installation"
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the repository root."
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You are not on the master/main branch."
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Check if tag already exists
if git show-ref --tags --quiet refs/tags/1.0.0; then
    echo "⚠️  Tag 1.0.0 already exists locally"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d 1.0.0
        echo "✓ Local tag deleted"
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

# Verify build works
echo ""
echo "🔨 Testing build process..."
BUILD_OUTPUT=$(npm run build 2>&1)
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
    echo "❌ Build failed:"
    echo "$BUILD_OUTPUT"
    exit 1
fi

if [ -f "main.js" ]; then
    MAIN_SIZE=$(du -h main.js | cut -f1)
    echo "✓ Build successful (main.js: $MAIN_SIZE)"
else
    echo "❌ Build failed - main.js not created"
    echo "$BUILD_OUTPUT"
    exit 1
fi

# Check required files
echo ""
echo "📋 Verifying required files..."
MISSING_FILES=0

if [ ! -f "manifest.json" ]; then
    echo "  ❌ manifest.json is missing"
    MISSING_FILES=1
fi

if [ ! -f "styles.css" ]; then
    echo "  ❌ styles.css is missing"
    MISSING_FILES=1
fi

if [ $MISSING_FILES -eq 1 ]; then
    echo "❌ Required files are missing"
    exit 1
fi

echo "  ✓ main.js"
echo "  ✓ manifest.json"
echo "  ✓ styles.css"

# Create tag
echo ""
echo "🏷️  Creating tag 1.0.0..."
git tag 1.0.0

echo "✓ Tag created successfully"
echo ""
echo "📤 Pushing tag to GitHub..."
git push origin 1.0.0

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! The GitHub Actions workflow will now:"
    echo "   1. Build the plugin"
    echo "   2. Create a release named '1.0.0'"
    echo "   3. Attach main.js, manifest.json, and styles.css"
    echo ""
    echo "🔗 Check the release at:"
    echo "   https://github.com/dianedef/obsidian-RSSFlowz/releases"
    echo ""
    echo "📦 Install with BRAT:"
    echo "   Repository: dianedef/obsidian-RSSFlowz"
else
    echo ""
    echo "❌ Failed to push tag. Please check your git credentials and try again."
    echo "You can manually push the tag with: git push origin 1.0.0"
    exit 1
fi
