#!/bin/bash
# Script to copy metadata files into build distribution

set -e

# Ensure dist exists
mkdir -p dist

# Copy metadata files
cp YANDEX_METADATA_RU.md dist/METADATA_RU.md
cp YANDEX_METADATA_EN.md dist/METADATA_EN.md
cp ITCH_DESCRIPTION.md dist/PUBLISHING_ITCH.md

# Create metadata manifest for distribution
cat > dist/METADATA.md << 'EOF'
# Game Metadata & Publishing Files

This directory contains build artifacts and publishing metadata.

## Metadata Files

### Yandex Games
- **METADATA_RU.md** — Russian metadata (Название, Описание, Об игре, Как играть)
- **METADATA_EN.md** — English metadata

### Itch.io
- **PUBLISHING_ITCH.md** — Description and publishing guidelines

## How to Use

1. **For Yandex Games Console**: Copy contents from METADATA_RU.md or METADATA_EN.md to corresponding fields
2. **For Itch.io**: Use PUBLISHING_ITCH.md as reference for game description

## Version Info

Check version.json in root or package.json for current build version.
EOF

echo "✓ Metadata files copied to dist/"
