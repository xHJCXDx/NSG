#!/bin/sh
# ---------------------------------------------------------------------------
# n8n-entrypoint.sh
#
# Custom entrypoint that cleans stale webhook registrations from n8n's
# internal Postgres database BEFORE starting n8n.
#
# Problem: when n8n shuts down uncleanly (container killed, OOM, etc.) the
# webhook rows in webhook_entity are not removed.  On the next startup n8n
# tries to INSERT them again and hits:
#   ERROR: duplicate key value violates unique constraint
#   Key ("webhookPath", method)=(osint-trigger, POST) already exists.
#
# The workflow still activates, but the error pollutes logs.
#
# Fix: delete all rows from webhook_entity before n8n boots.  n8n will
# re-register every active webhook cleanly on startup.
#
# Note: the n8n Docker image (alpine-based) does not ship psql, so we use
# Node.js + the pg driver already bundled with n8n.
# ---------------------------------------------------------------------------

set -e

# Run from n8n's install directory so require('pg') resolves against
# n8n's bundled node_modules (the image does not install pg globally).
cd /usr/local/lib/node_modules/n8n

echo "[n8n-entrypoint] Cleaning stale webhook registrations …"

# Delete all webhook_entity rows so n8n can re-register them cleanly.
# Uses Node.js + pg driver bundled with n8n (no psql available in alpine image).
node -e "
const { Client } = require('pg');
const c = new Client({
  host: process.env.DB_POSTGRESDB_HOST || 'postgres',
  port: parseInt(process.env.DB_POSTGRESDB_PORT || '5432'),
  database: process.env.DB_POSTGRESDB_DATABASE || 'n8n_internal',
  user: process.env.DB_POSTGRESDB_USER,
  password: process.env.DB_POSTGRESDB_PASSWORD,
});
c.connect()
  .then(() => c.query('DELETE FROM webhook_entity'))
  .then(r => { console.log('[n8n-entrypoint] Deleted ' + r.rowCount + ' stale webhook(s)'); return c.end(); })
  .catch(e => { console.warn('[n8n-entrypoint] Webhook cleanup skipped:', e.message); process.exit(0); });
" || true

echo "[n8n-entrypoint] Publishing workflows …"

# Get workflow IDs (filter out n8n startup noise) and publish each one
for WF_ID in $(n8n list:workflow 2>/dev/null | grep '|' | cut -d'|' -f1); do
  if [ -n "$WF_ID" ]; then
    echo "[n8n-entrypoint] Publishing workflow $WF_ID …"
    n8n publish:workflow --id="$WF_ID" 2>&1 || true
  fi
done

echo "[n8n-entrypoint] Starting n8n …"
exec n8n "$@"
