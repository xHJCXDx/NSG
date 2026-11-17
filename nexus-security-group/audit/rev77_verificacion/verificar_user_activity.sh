#!/usr/bin/env bash
# REV77 O1: verify on a clean database that the analyst and read-only roles
# cannot read the network, session and additional data of user_activity
# (ip_address, user_agent, session_id, activity_data) but can read the other
# columns, that the analyst role can insert where init.sql grants INSERT (it
# needs USAGE on the BIGSERIAL sequences), and that the B5 restriction on
# system_users.password_hash still holds.
#
# Starts a throwaway postgres:17 container (same image as docker-compose.yml),
# loads init.sql through docker-entrypoint-initdb.d, runs the checks and
# removes the container. Touches no existing volume or container.
#
# Usage (from any directory): sudo bash audit/rev77_verificacion/verificar_user_activity.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTAINER="nsg-rev77-activity-grants-check"
DB="osint_db"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$SCRIPT_DIR/user_activity_${STAMP}.log"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

exec > >(tee "$LOG") 2>&1

echo "# REV77 O1: column access to user_activity (and system_users.password_hash)"
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
       has_column_privilege(r.role, 'public.user_activity', c.column_name, 'SELECT') AS can_select
FROM (VALUES ('osint_analyst'), ('osint_readonly'), ('appsmith_readonly'), ('osint_admin')) AS r(role)
CROSS JOIN information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'user_activity'
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
ALLOWED="SELECT activity_id, username, user_role, activity_type, activity_description, related_mention_id, related_detection_id, related_alert_id, activity_timestamp FROM user_activity;"
STAR="SELECT * FROM user_activity;"
for role in osint_analyst osint_readonly appsmith_readonly; do
    expect ok     "$role" "$ALLOWED"
    for col in ip_address user_agent session_id activity_data; do
        expect denied "$role" "SELECT $col FROM user_activity;"
    done
    expect denied "$role" "$STAR"
done
expect ok osint_admin "SELECT ip_address, user_agent, session_id, activity_data FROM user_activity;"
# The analyst role keeps its INSERT privilege on user_activity (init.sql) and
# can draw ids from the sequences of the tables it inserts into (R8A-35).
expect ok osint_analyst "INSERT INTO user_activity (username, activity_type, ip_address, session_id) VALUES ('o1-check', 'check', '127.0.0.1', 'sess-o1');"
for seq in threat_detections_detection_id_seq alerts_alert_id_seq user_activity_activity_id_seq; do
    expect ok     osint_analyst  "SELECT nextval('$seq');"
    expect denied osint_readonly "SELECT nextval('$seq');"
done

echo
echo "## 3. Regression: system_users.password_hash (REV77 B5)"
for role in osint_analyst osint_readonly appsmith_readonly; do
    expect ok     "$role" "SELECT user_id, username, role_id, is_active, created_by, created_at, updated_at FROM system_users;"
    expect denied "$role" "SELECT password_hash FROM system_users;"
done
expect ok osint_admin "SELECT password_hash FROM system_users;"

echo
if [ "$FAIL" -eq 0 ]; then echo "RESULT: PASS"; else echo "RESULT: FAIL"; fi
echo "log: ${LOG#"$PROJECT_DIR"/}"
exit "$FAIL"
