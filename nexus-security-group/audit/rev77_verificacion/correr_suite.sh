#!/usr/bin/env bash
# REV77 B5 step 6: run the same three blocks as the REV76 suite log
# (audit/rev76_verificacion/suite_20261113-161324.log) and save the output
# unedited. Does not start the system.
# Usage, from any directory: bash audit/rev77_verificacion/correr_suite.sh
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG="$SCRIPT_DIR/suite_$(date +%Y%m%d-%H%M%S).log"
cd "$PROJECT_DIR" || exit 1

# run_scenarios.sh calls python3 -m pytest: use the backend virtualenv.
export PATH="$PROJECT_DIR/backend/.venv/bin:$PATH"

{
    echo "# Suite output (REV77, B5 step 6). Not edited."
    echo "date: $(date '+%Y-%m-%d %H:%M:%S %:z')"
    echo "commit: $(git rev-parse HEAD)"
    echo "branch: $(git rev-parse --abbrev-ref HEAD)"
    echo "tracked changes outside audit/: $(git status --porcelain --untracked-files=no -- . ':!audit' | wc -l)"
    echo "python: $(python3 --version 2>&1); node: $(node --version)"
    echo
    echo "## sh tests/scenarios/run_scenarios.sh"
    sh tests/scenarios/run_scenarios.sh
    echo "exit: $?"
    echo
    echo '## node --test "tests/workflow/*.test.mjs"'
    node --test "tests/workflow/*.test.mjs"
    echo "exit: $?"
    echo
    echo "## cd backend && .venv/bin/python -m pytest -q -p no:cacheprovider tests"
    (cd backend && .venv/bin/python -m pytest -q -p no:cacheprovider tests)
    echo "exit: $?"
} 2>&1 | tee "$LOG"

echo "log: $LOG"
