#!/usr/bin/env bash
# REV77 B5 step 5: verify on a clean database that the analyst and read-only
# roles cannot read system_users.password_hash but can read the other columns.
#
# Starts a throwaway postgres:17 container (same image as docker-compose.yml),
# loads init.sql through docker-entrypoint-initdb.d, runs the checks and
# removes the container. Touches no existing volume or container.
#
# Usage (from any directory): sudo bash audit/rev77_verificacion/verificar_password_hash.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTAINER="nsg-rev77-grants-check"
DB="osint_db"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$SCRIPT_DIR/password_hash_${STAMP}.log"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

exec > >(tee "$LOG") 2>&1

echo "# REV77 B5: column access to system_users.password_hash"
echo "date: $(date -Iseconds)"
echo "commit: $(git -C "$PROJECT_DIR" rev-parse HEAD)"
echo "branch: $(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)"
echo "init.sql sha256: $(sha256sum "$PROJECT_DIR/init.sql" | cut -d' ' -f1)"
echo "uncommitted changes to init.sql: $(git -C "$PROJECT_DIR" status --porcelain -- init.sql | wc -l)"
echo

docker run -d --name "$CONTAINER" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=rev77-check-only \
    -e POSTGRES_DB="$DB" \
    -v "$PROJECT_DIR/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro" \
    postgres:17 >/dev/null

# The entrypoint restarts the server after running init scripts; wait until
# the final server answers and system_users exists.
for _ in $(seq 1 60); do
    if docker exec "$CONTAINER" psql -U postgres -d "$DB" -tAc \
        "SELECT to_regclass('public.system_users') IS NOT NULL" 2>/dev/null | grep -q t; then
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

psql_db() { docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=0 "$@"; }

echo "## 1. Column privileges (has_column_privilege)"
psql_db -c "
SELECT r.role, c.column_name,
       has_column_privilege(r.role, 'public.system_users', c.column_name, 'SELECT') AS can_select
FROM (VALUES ('osint_analyst'), ('osint_readonly'), ('appsmith_readonly'), ('osint_admin')) AS r(role)
CROSS JOIN information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'system_users'
ORDER BY r.role, c.ordinal_position;"

FAIL=0
expect() {  # expect <ok|denied> <role> <sql>
    local want="$1" role="$2" sql="$3" out
    out="$(printf 'SET ROLE %s;\n%s\n' "$role" "$sql" | psql_db 2>&1 || true)"
    if grep -q "permission denied" <<<"$out"; then
        got="denied"
    elif grep -qE "ERROR|FATAL|could not|error" <<<"$out"; then
        got="error"
        printf '%s\n' "$out"
    else
        got="ok"
    fi
    printf '%-18s %-7s expected=%-6s got=%-6s %s\n' "$role" "$([ "$want" = "$got" ] && echo PASS || echo FAIL)" "$want" "$got" "$sql"
    [ "$want" = "$got" ] || FAIL=1
}

echo
echo "## 2. Queries executed as each role"
ALLOWED="SELECT user_id, username, role_id, is_active, created_by, created_at, updated_at FROM system_users;"
HASH="SELECT password_hash FROM system_users;"
STAR="SELECT * FROM system_users;"
for role in osint_analyst osint_readonly appsmith_readonly; do
    expect ok     "$role" "$ALLOWED"
    expect denied "$role" "$HASH"
    expect denied "$role" "$STAR"
done
expect ok osint_admin "$HASH"

echo
if [ "$FAIL" -eq 0 ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
echo "log: $LOG"
exit "$FAIL"
