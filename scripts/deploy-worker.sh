#!/usr/bin/env bash
# Deploy the RankFootprint API Worker (Cloudflare free plan) under the box heavy-build lock.
# Auth: box wrangler OAuth (joshofisrael@yahoo.com). The box-wide CLOUDFLARE_API_TOKEN sees no accounts, so it is unset here.
# If /workspace/.secrets/serpapi.env exists (SERPAPI_KEY=...), the key is pushed as a Worker secret (never printed or committed).
# Usage: scripts/deploy-worker.sh [--schema]   (--schema re-applies worker/schema.sql to remote D1; it is idempotent)
set -euo pipefail
cd "$(dirname "$0")/../worker"
export PATH="$HOME/.local/node22/bin:$PATH"   # wrangler 4 needs Node 22
unset CLOUDFLARE_API_TOKEN
mkdir -p node_modules/.cache                  # wrangler otherwise tries /node_modules/.cache (EACCES)
LOCK=/workspace/.locks/heavy-build.lock
W="npx -y wrangler@4"
run() { timeout 600 flock -w 900 "$LOCK" "$@"; }

if [[ "${1:-}" == "--schema" ]]; then run $W d1 execute rankfootprint --remote --file=schema.sql -y; fi

SECRETS=/workspace/.secrets/serpapi.env
if [[ -r "$SECRETS" ]]; then
  KEY=$(grep -E '^SERPAPI_KEY=' "$SECRETS" | head -1 | cut -d= -f2- | tr -d '"'"'"' \r')
  if [[ -n "$KEY" ]]; then printf '%s' "$KEY" | run $W secret put SERPAPI_KEY >/dev/null && echo "SERPAPI_KEY secret set"; fi
else
  echo "No $SECRETS: deploying without SERPAPI_KEY (free scan returns 'warming up', site falls back to FormSubmit)"
fi

run $W deploy
curl -fsS https://rankfootprint-api.joshofisrael.workers.dev/api/health && echo
