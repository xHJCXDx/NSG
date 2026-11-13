-- E08 (§8.4; D.1, regla 5): declared fault injection, step 1 of 3.
-- Adds a constraint that rejects every NEW row in threat_detections.
-- NOT VALID: existing rows are not checked, so no stored data changes.
-- Remove it with E08_quitar.sql right after the query.
\set ON_ERROR_STOP on

\echo '== Injection time (use it as since for E08_consulta.sql)'
SELECT now() AS injected_at;

ALTER TABLE threat_detections
  ADD CONSTRAINT e08_reject_new_rows CHECK (false) NOT VALID;

\echo '== Constraint in place (expect 1 row, convalidated f)'
SELECT conname, convalidated
FROM pg_constraint
WHERE conname = 'e08_reject_new_rows';
