#!/usr/bin/env sh
# Runs the automatic scenarios of the REV76 inventory
# (audit/rev76_verificacion/escenarios.md). Does not start the system.
# Usage, from the repository root: sh tests/scenarios/run_scenarios.sh
set -u
cd "$(dirname "$0")/../.." || exit 1
status=0

echo "== Workflow scenarios: E01-E05, E09 (automatic part), E18 (partial), E20, E31"
node --test "tests/scenarios/*.test.mjs" "tests/workflow/overlap_no_overwrite.test.mjs" || status=1

echo "== API scenarios: E12 (adapted), E13"
(
  cd backend &&
    python3 -m pytest -rxX -p no:cacheprovider \
      tests/test_scenarios.py \
      "tests/test_threats_router.py::test_review_threat_rejects_user_without_threats_write_permission"
) || status=1

exit "$status"
