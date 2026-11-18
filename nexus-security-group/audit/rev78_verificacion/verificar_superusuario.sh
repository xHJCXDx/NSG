#!/usr/bin/env bash
# REV78 V-M1: check whether the database users of the API and of the n8n
# PostgreSQL credential are superusers (rules R8A-32, A-53, AD-14; thesis
# §8.2.1 and Annex C.1 require a service role that is NOT a superuser).
#
# 1. API: runs the query inside osint-dashboard-api with the API's own
#    DATABASE_URL, so it checks the exact connection the API uses.
# 2. n8n: the PostgreSQL credential lives only in n8n (it is created by hand,
#    see README.md, "Credenciales n8n"). Pass the "User" field of that
#    credential as the first argument; the query runs in osint-postgres as
#    that role. The script never reads or prints passwords.
#
# Requires the stack running (docker compose up -d).
#
# Usage (from any directory):
#   sudo bash audit/rev78_verificacion/verificar_superusuario.sh <n8n_credential_user>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
N8N_USER="${1:?usage: $0 <user field of the n8n PostgreSQL credential>}"
API_CONTAINER="osint-dashboard-api"
DB_CONTAINER="osint-postgres"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$SCRIPT_DIR/superusuario_${STAMP}.log"
QUERY="SELECT current_user, rolsuper, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = current_user"

exec > >(tee "$LOG") 2>&1

echo "# REV78 V-M1: are the API and n8n database users superusers?"
echo "date: $(date -Iseconds)"
echo "commit: $(git -C "$PROJECT_DIR" rev-parse HEAD)"
echo "branch: $(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)"
echo "code changed since 9f24de2 outside audit/: $(git -C "$PROJECT_DIR" diff --name-only 9f24de2 HEAD -- . ':(exclude)audit' | wc -l) files"
echo "== Uncommitted tracked changes (empty means clean)"
git -C "$PROJECT_DIR" status --porcelain --untracked-files=no
echo "== Containers"
docker ps --filter "name=$API_CONTAINER" --filter "name=$DB_CONTAINER" --format '{{.Names}}  {{.Image}}  {{.Status}}'
echo

echo "## 1. API connection (DATABASE_URL of $API_CONTAINER)"
docker exec -e Q="$QUERY" "$API_CONTAINER" python -c '
import os
from sqlalchemy import create_engine, text
row = create_engine(os.environ["DATABASE_URL"]).connect().execute(text(os.environ["Q"])).one()
print("current_user={} rolsuper={} rolcreaterole={} rolbypassrls={}".format(*row))
'
echo

echo "## 2. n8n PostgreSQL credential (user declared by the author: $N8N_USER)"
DB_NAME="$(docker exec "$DB_CONTAINER" printenv POSTGRES_DB)"
docker exec "$DB_CONTAINER" psql -U "$N8N_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -tA -F ' ' -c "$QUERY" \
    | awk '{print "current_user="$1" rolsuper="$2" rolcreaterole="$3" rolbypassrls="$4}'
echo

echo "log: ${LOG#"$PROJECT_DIR"/}"
