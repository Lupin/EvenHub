#!/usr/bin/env bash
# ship.sh — bump, build, pack for any EvenHub project
# Reads version from app.json, bumps it, syncs to index.html, builds & packs
# Usage: ./ship.sh [bump|minor|major]  (default: bump = patch)

set -euo pipefail
cd "$(dirname "$0")"

BUMP="${1:-bump}"

# Read current version
CUR=$(python3 -c "import json; print(json.load(open('app.json'))['version'])")
IFS='.' read -r MAJ MIN PAT <<< "$CUR"

case "$BUMP" in
  major) MAJ=$((MAJ+1)); MIN=0; PAT=0 ;;
  minor) MIN=$((MIN+1)); PAT=0 ;;
  bump|patch) PAT=$((PAT+1)) ;;
  *) echo "Usage: $0 [bump|minor|major]"; exit 1 ;;
esac

NEW="$MAJ.$MIN.$PAT"
echo "Bumping $CUR → $NEW"

# Update app.json
python3 -c "
import json
d=json.load(open('app.json'))
d['version']='$NEW'
json.dump(d,open('app.json','w'),indent=2)
open('app.json','a').write('\n')
"

# Update footer version in index.html if present
if grep -q 'footerVersion' index.html 2>/dev/null; then
  sed -i '' "s/footerVersion\">[^<]*</footerVersion\">$NEW</g" index.html
fi

# Build
npx vite build

# Pack
npx evenhub pack app.json dist/ -o "draw-v$NEW.ehpk"

echo "→ draw-v$NEW.ehpk ready"
