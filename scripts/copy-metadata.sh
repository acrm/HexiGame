#!/bin/bash
# Script to copy metadata files into build distribution

set -e

# Ensure dist exists
mkdir -p dist

# Detect build mode from environment or default
MODE=${VITE_MODE:-default}

if [ "$MODE" = "yandex" ]; then
  # Copy Yandex metadata only
  cp YANDEX_METADATA_RU.md dist/METADATA_RU.md
  cp YANDEX_METADATA_EN.md dist/METADATA_EN.md
  
  cat > dist/METADATA.md << 'EOF'
# Yandex Games Publishing Metadata

## Metadata Files

- **METADATA_RU.md** — Русская метаинформация (Название, Описание, Об игре, Как играть)
- **METADATA_EN.md** — English metadata

## How to Use

Copy contents from METADATA_RU.md or METADATA_EN.md to corresponding fields in Yandex Games Console.

## Version Info

Check version.json in root or package.json for current build version.
EOF
  
  echo "✓ Yandex metadata files copied to dist/"
else
  # Copy Itch.io metadata only
  cp ITCH_DESCRIPTION.md dist/PUBLISHING_ITCH.md
  
  cat > dist/METADATA.md << 'EOF'
# Itch.io Publishing Metadata

## Metadata Files

- **PUBLISHING_ITCH.md** — Description and publishing guidelines

## How to Use

Use PUBLISHING_ITCH.md as reference for game description on itch.io.

## Version Info

Check version.json in root or package.json for current build version.
EOF
  
  echo "✓ Itch.io metadata files copied to dist/"
fi
