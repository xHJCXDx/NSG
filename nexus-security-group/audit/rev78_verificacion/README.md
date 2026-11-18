# REV78 verification session

Evidence for the fifth-instance review (18/11/2026): V-M1 (superuser), V-M2 (E14, E29, E30 on the evaluated commit) and V-B5 (clean tree). The evaluated code is still `9f24de2`; after it, only `audit/` changes.

Run everything from the repository root (`nexus-security-group/`), in this order. Docker needs `sudo`.

1. **Clean tree.** `git status --porcelain --untracked-files=no` must print nothing. If it prints files, commit or restore them first.
2. **Stack up.** `sudo docker compose up -d` and wait until the containers are healthy.
3. **V-M1.** Open n8n, the PostgreSQL credential used by the workflow, and read its `User` field (not the password). Then:
   `sudo bash audit/rev78_verificacion/verificar_superusuario.sh <user>`
4. **V-M2.** `sudo bash audit/rev78_verificacion/correr_e14_e29_e30.sh` (ref `9f24de2`). Optionally, for comparison: `sudo bash audit/rev78_verificacion/correr_e14_e29_e30.sh b0c76dd`.
5. **V-B5.** Repeat the functional run as on 17/11, with the log in this folder:
   `sh scripts/functional_run.sh --since "<start of the run window, with offset>" --out-dir audit/rev78_verificacion`
   Its header must show an empty «Uncommitted tracked changes» block.
6. Tell Claude the log paths; Claude commits them with `git add -f` (`*.log` is ignored).

Each script writes a dated log to this folder and prints its path at the end.
