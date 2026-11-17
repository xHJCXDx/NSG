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

# Tools print absolute paths (pytest rootdir, warning locations). Show them
# relative to the project so the log does not carry the local home directory.
# index() matches the path literally, with no regex escaping.
relative_paths() {
    awk -v p="$PROJECT_DIR/" '{
        while ((i = index($0, p)) > 0) $0 = substr($0, 1, i - 1) substr($0, i + length(p))
        print
    }'
}

# run_scenarios.sh calls python3 -m pytest: use the backend virtualenv.
export PATH="$PROJECT_DIR/backend/.venv/bin:$PATH"

{
    echo "# Suite output (REV77, B5 step 6). Not edited, except that paths are shown relative to the project."
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
} 2>&1 | relative_paths | tee "$LOG"

echo "log: ${LOG#"$PROJECT_DIR"/}"
