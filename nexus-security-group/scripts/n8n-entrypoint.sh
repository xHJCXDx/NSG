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

echo "[n8n-entrypoint] Cleaning stale webhook registrations …"

# Run from n8n's install directory so require('pg') resolves against
# n8n's bundled node_modules (the image does not install pg globally).
cd /usr/local/lib/node_modules/n8n

node -e "
const { Client } = require('pg');
const client = new Client({
  host:     process.env.DB_POSTGRESDB_HOST,
  port:     parseInt(process.env.DB_POSTGRESDB_PORT || '5432', 10),
  database: process.env.DB_POSTGRESDB_DATABASE,
  user:     process.env.DB_POSTGRESDB_USER,
  password: process.env.DB_POSTGRESDB_PASSWORD,
});

(async () => {
  try {
    await client.connect();
    const res = await client.query('DELETE FROM webhook_entity');
    console.log('[n8n-entrypoint] Cleared ' + res.rowCount + ' stale webhook(s).');
  } catch (err) {
    // Table may not exist on a fresh database — not an error.
    if (err.code === '42P01') {
      console.log('[n8n-entrypoint] webhook_entity not found (fresh DB) — skipping.');
    } else {
      console.error('[n8n-entrypoint] Warning: could not clean webhooks:', err.message);
    }
  } finally {
    await client.end();
  }
})();
"

echo "[n8n-entrypoint] Starting n8n …"
exec n8n "$@"
