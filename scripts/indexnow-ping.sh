#!/usr/bin/env bash
# Ping IndexNow (Bing, Yandex, etc.) with every URL in sitemap.xml. Usage: scripts/indexnow-ping.sh [base_url]
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="${1:-https://joshuaofisrael.github.io/maps-rank-tracker}"
KEY=$(ls | grep -E '^[0-9a-f]{32}\.txt$' | head -1 | sed 's/\.txt$//')
HOST=$(echo "$BASE" | sed -E 's#https?://([^/]+).*#\1#')
URLS=$(grep -o '<loc>[^<]*' sitemap.xml | sed 's/<loc>//' | python3 -c 'import sys,json;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')
curl -s -o /dev/null -w 'IndexNow HTTP %{http_code}\n' -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"$BASE/$KEY.txt\",\"urlList\":$URLS}"
