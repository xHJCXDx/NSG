#!/usr/bin/env bash
# REV78 V-M2: re-run the manual scenarios E14, E29 and E30 (purge) on the
# init.sql of a git ref, by default the evaluated commit 9f24de2. The REV76
# run used b0c76dd, before the purge fix 7edd963 (cut by collected_at).
#
# Runs audit/rev76_verificacion/manuales/E14_E29_E30_purga.sql UNCHANGED on a
# throwaway postgres:17 container (same image as docker-compose.yml) loaded
# with that ref's init.sql, then removes the container. Touches no existing
# volume or container. Same container handling as
# audit/rev77_verificacion/verificar_purga_corte.sh.
#
# Usage (from any directory):
#   sudo bash audit/rev78_verificacion/correr_e14_e29_e30.sh           # 9f24de2
#   sudo bash audit/rev78_verificacion/correr_e14_e29_e30.sh b0c76dd   # REV76 base, for comparison
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REF="${1:-9f24de2}"
SQL_FILE="$PROJECT_DIR/audit/rev76_verificacion/manuales/E14_E29_E30_purga.sql"
CONTAINER="nsg-rev78-e14-e29-e30"
DB="osint_db"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$SCRIPT_DIR/E14_E29_E30_${REF//\//-}_${STAMP}.log"
SCRATCH="$(mktemp -d)"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$SCRATCH"; }
trap cleanup EXIT
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

INIT_SQL="$SCRATCH/init.sql"
git -C "$PROJECT_DIR" show "$REF:./init.sql" > "$INIT_SQL"
chmod 644 "$INIT_SQL"

exec > >(tee "$LOG") 2>&1

echo "# REV78 V-M2: E14, E29, E30 on a clean database"
echo "date: $(date -Iseconds)"
echo "commit (HEAD): $(git -C "$PROJECT_DIR" rev-parse HEAD)"
echo "init.sql source: git ref $REF ($(git -C "$PROJECT_DIR" rev-parse --short "$REF"))"
echo "init.sql sha256: $(sha256sum "$INIT_SQL" | cut -d' ' -f1)"
echo "purge cut line: $(grep -n 'WHERE .* < cutoff_date' "$INIT_SQL" | head -1)"
echo "scenario script: ${SQL_FILE#"$PROJECT_DIR"/} sha256 $(sha256sum "$SQL_FILE" | cut -d' ' -f1)"
echo "== Uncommitted tracked changes (empty means clean)"
git -C "$PROJECT_DIR" status --porcelain --untracked-files=no
echo

docker run -d --name "$CONTAINER" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=rev78-check-only \
    -e POSTGRES_DB="$DB" \
    -v "$INIT_SQL:/docker-entrypoint-initdb.d/01-init.sql:ro" \
    postgres:17 >/dev/null

# The entrypoint restarts the server after running init scripts; wait until
# the final server answers and social_mentions exists.
for _ in $(seq 1 60); do
    if docker exec "$CONTAINER" psql -U postgres -d "$DB" -tAc \
        "SELECT to_regclass('public.social_mentions') IS NOT NULL" 2>/dev/null | grep -q t; then
        if docker logs "$CONTAINER" 2>&1 | grep -q "PostgreSQL init process complete"; then
            break
        fi
    fi
    sleep 2
done
docker logs "$CONTAINER" 2>&1 | grep -q "PostgreSQL init process complete" \
    || { echo "ERROR: database did not finish initializing"; docker logs "$CONTAINER" | tail -30; exit 1; }
docker logs "$CONTAINER" 2>&1 | grep -E "ERROR" && { echo "ERROR: init.sql reported errors"; exit 1; } || true
for _ in $(seq 1 30); do
    docker exec "$CONTAINER" pg_isready -U postgres -d "$DB" >/dev/null 2>&1 && break
    sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres -d "$DB" || { echo "ERROR: server not ready"; exit 1; }

echo "## E14_E29_E30_purga.sql"
docker exec -i "$CONTAINER" psql -U postgres -d "$DB" < "$SQL_FILE"

echo
echo "log: ${LOG#"$PROJECT_DIR"/}"
