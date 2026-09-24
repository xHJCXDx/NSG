-- Create a separate database for n8n internal storage (users, workflows,
-- credentials, execution history) so it doesn't conflict with osint_db tables.
SELECT 'CREATE DATABASE n8n_internal'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n_internal')\gexec
