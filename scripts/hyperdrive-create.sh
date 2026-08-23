#!/usr/bin/env bash
# Membuat Hyperdrive binding dari DIRECT_URL di root .env.
# Butuh CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) di .env atau environment.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then echo "ERROR: .env tidak ditemukan di root repo"; exit 1; fi

set -a
source <(grep -E '^(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)=' .env || true)
set +a

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN belum ada di .env"
  echo "Tambahkan baris:  CLOUDFLARE_API_TOKEN=<token-anda>"
  exit 1
fi

CONN_STR=$(node -e "
const l = require('fs').readFileSync('.env','utf8').split('\n')
  .find(l => l.startsWith('DIRECT_URL='));
if (!l) { console.error('DIRECT_URL tidak ada di .env'); process.exit(1); }
console.log(l.slice('DIRECT_URL='.length).trim().replace(/^\"|\"$/g, ''));
")

echo "== Membuat Hyperdrive 'geoaware-db' dari session pooler (:5432)..."
npx --prefix backend wrangler hyperdrive create geoaware-db --connection-string="$CONN_STR"
