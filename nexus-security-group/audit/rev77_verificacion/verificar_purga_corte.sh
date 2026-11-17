#!/usr/bin/env bash
# REV77 B17: verify on a clean database that purge_old_data() cuts by the
# acquisition date (collected_at) and not by the publication date (created_at)
# (rule A-57; thesis Annex A.2, "Corte de la purga").
#
# Fixtures (platform 'other', external_id 'rev77-*'):
#   published-old-acquired-now   created_at 800 days ago, collected_at now     -> kept
#   published-now-acquired-old   created_at 10 days ago,  collected_at 366 ago -> deleted
#   acquired-old-confirmed       collected_at 366 days ago, detection confirmed -> kept
#                                (regression: confirmed detections stay protected)
#   acquired-now                 both dates now                                 -> kept
#
# Starts a throwaway postgres:17 container (same image as docker-compose.yml),
# loads init.sql through docker-entrypoint-initdb.d, runs the checks and
# removes the container. Touches no existing volume or container.
#
# Usage (from any directory):
#   sudo bash audit/rev77_verificacion/verificar_purga_corte.sh          # init.sql of the working tree
#   sudo bash audit/rev77_verificacion/verificar_purga_corte.sh develop  # init.sql of a git ref (e.g. the base, to see it fail)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REF="${1:-}"
CONTAINER="nsg-rev77-purge-cutoff-check"
DB="osint_db"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$SCRIPT_DIR/purga_corte_${STAMP}${REF:+_${REF//\//-}}.log"
SCRATCH="$(mktemp -d)"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$SCRATCH"; }
trap cleanup EXIT
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

if [ -n "$REF" ]; then
    INIT_SQL="$SCRATCH/init.sql"
    git -C "$PROJECT_DIR" show "$REF:./init.sql" > "$INIT_SQL"
    chmod 644 "$INIT_SQL"
    SOURCE="git ref $REF ($(git -C "$PROJECT_DIR" rev-parse --short "$REF"))"
else
    INIT_SQL="$PROJECT_DIR/init.sql"
    SOURCE="working tree"
fi

exec > >(tee "$LOG") 2>&1

echo "# REV77 B17: purge cut by acquisition date (A-57)"
echo "date: $(date -Iseconds)"
echo "commit: $(git -C "$PROJECT_DIR" rev-parse HEAD)"
echo "branch: $(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)"
echo "init.sql source: $SOURCE"
echo "init.sql sha256: $(sha256sum "$INIT_SQL" | cut -d' ' -f1)"
echo "uncommitted changes to init.sql: $(git -C "$PROJECT_DIR" status --porcelain -- init.sql | wc -l)"
echo "purge cut line: $(grep -n 'WHERE .* < cutoff_date' "$INIT_SQL" | head -1)"
echo

docker run -d --name "$CONTAINER" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=rev77-check-only \
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

psql_db() { docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 "$@"; }

echo "## 1. Fixtures"
psql_db <<'SQL'
INSERT INTO social_mentions (platform, external_id, text_content, created_at, collected_at)
VALUES
    ('other', 'rev77-published-old-acquired-now', 'rev77 purge cutoff fixture',
     NOW() - INTERVAL '800 days', NOW()),
    ('other', 'rev77-published-now-acquired-old', 'rev77 purge cutoff fixture',
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '366 days'),
    ('other', 'rev77-acquired-old-confirmed', 'rev77 purge cutoff fixture',
     NOW() - INTERVAL '366 days', NOW() - INTERVAL '366 days'),
    ('other', 'rev77-acquired-now', 'rev77 purge cutoff fixture',
     NOW(), NOW());
INSERT INTO threat_detections (mention_id, threat_type, criticality_level, confidence_score, review_status)
SELECT mention_id, 'general', 'high', 0.500, 'confirmed'
FROM social_mentions WHERE external_id = 'rev77-acquired-old-confirmed';
SELECT external_id, created_at::date AS published, collected_at::date AS acquired
FROM social_mentions ORDER BY external_id;
SQL

echo
echo "## 2. CALL purge_old_data()"
psql_db -c "CALL purge_old_data();"

echo
echo "## 3. Checks"
FAIL=0
expect() {  # expect <kept|deleted> <external_id>
    local want="$1" ext="$2" n got
    n="$(psql_db -tAc "SELECT COUNT(*) FROM social_mentions WHERE external_id = '$ext';")"
    if [ "$n" = "1" ]; then got="kept"; else got="deleted"; fi
    printf '%-36s %-4s expected=%-7s got=%s\n' "$ext" "$([ "$want" = "$got" ] && echo PASS || echo FAIL)" "$want" "$got"
    [ "$want" = "$got" ] || FAIL=1
}
expect kept    rev77-published-old-acquired-now
expect deleted rev77-published-now-acquired-old
expect kept    rev77-acquired-old-confirmed
expect kept    rev77-acquired-now

echo
if [ "$FAIL" -eq 0 ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
echo "log: $LOG"
exit "$FAIL"
