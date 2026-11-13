-- E08: step 3 of 3. Removes the injected constraint.
\set ON_ERROR_STOP on
ALTER TABLE threat_detections DROP CONSTRAINT IF EXISTS e08_reject_new_rows;

\echo '== Constraint removed (expect 0 rows)'
SELECT conname FROM pg_constraint WHERE conname = 'e08_reject_new_rows';
