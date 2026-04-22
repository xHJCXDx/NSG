# NSG Deployment Guide

## Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] All environment variables configured in `.env`
- [ ] Docker and Docker Compose installed
- [ ] PostgreSQL 14+ compatible
- [ ] Twitter API credentials obtained and configured
- [ ] Reddit API credentials (optional but recommended)
- [ ] Slack workspace and webhook configured
- [ ] Email SMTP credentials configured
- [ ] n8n credentials configured in UI

## Environment Variables

Create `.env` file with:

```bash
# PostgreSQL
POSTGRES_USER=osint_user
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=osint_db

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<strong-password>
N8N_ENCRYPTION_KEY=<32-char-random-string>

# Sentiment API
API_HOST=0.0.0.0
API_PORT=5000
API_TOKEN=<random-bearer-token>
```

Generate strong passwords:
```bash
openssl rand -base64 32
```

## Initial Deployment

### 1. Start Services

```bash
cd nexus-security-group
docker-compose up -d
```

Wait 10-15 seconds for all services to start.

### 2. Verify Services

```bash
docker-compose ps
```

All containers should show `Up`.

### 3. Configure n8n Credentials

Open n8n UI: `http://localhost:5678`

1. **Twitter OAuth2**:
   - Credentials → Add New
   - Type: Twitter OAuth2 API
   - Paste consumer key and secret
   - Save and note the credential ID

2. **Sentiment API** (if running remotely):
   - HTTP credentials for Bearer token
   - Token: match `API_TOKEN` from `.env`

3. **Database**:
   - PostgreSQL credentials for workflow access

4. **Slack** (optional):
   - OAuth token for alert notifications

### 4. Import Workflow

The workflow imports automatically via `n8n-entrypoint.sh`. If manual import is needed:

1. In n8n UI: Workflows → Import
2. Upload `workflow.json`
3. Update credentials if they changed

### 5. Activate Workflow

1. Open the "Twitter OSINT Monitor" workflow
2. Click the ON/OFF toggle to **activate**
3. Workflow now runs every 15 minutes on schedule

## Health Checks

### API Health

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{"status": "healthy"}
```

### Database Health

```bash
docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"
```

### n8n Health

Open `http://localhost:5678` and verify UI loads.

### Sentiment Analysis Test

```bash
curl -X POST http://localhost:5000/analyze \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"text": "phishing attack detected"}'
```

Expected: JSON with sentiment scores.

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f sentiment-api
docker-compose logs -f n8n
docker-compose logs -f postgres
```

### Database Monitoring

Query execution stats:

```sql
SELECT workflow_name, status, COUNT(*) as executions, 
       AVG(duration_seconds) as avg_duration
FROM execution_logs
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY workflow_name, status;
```

Latest alerts:

```sql
SELECT alert_id, alert_severity, created_at, delivery_status
FROM alerts
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Maintenance

### Database Backup

```bash
docker-compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql
```

Restore:

```bash
docker-compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

### Refresh Materialized Views

Run daily to update reporting dashboards:

```bash
docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "SELECT refresh_all_materialized_views();"
```

Or add cron job:

```bash
0 0 * * * docker-compose -f /path/to/docker-compose.yml exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT refresh_all_materialized_views();"
```

### Cleanup Old Data

Remove mentions older than 1 year:

```bash
docker-compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
  -c "CALL purge_old_data(365);"
```

## Troubleshooting

### API Connection Timeout

**Problem**: Sentiment Analysis node fails with timeout.

**Solution**:
1. Check API is running: `docker-compose logs sentiment-api`
2. Verify network: `docker-compose exec n8n curl http://sentiment-api:5000/health`
3. Increase timeout in workflow node if texts are very long

### Database Connection Refused

**Problem**: Postgres connection fails.

**Solution**:
1. Check container running: `docker-compose ps postgres`
2. Verify credentials in `.env`
3. Check port 5432 not in use: `lsof -i :5432`

### n8n Workflow Not Executing

**Problem**: Workflow scheduled but not running.

**Solution**:
1. Verify workflow is **activated** (toggle ON)
2. Check execution logs: n8n UI → Executions tab
3. Verify credentials are still valid
4. Restart n8n: `docker-compose restart n8n`

### Low Sentiment Confidence

**Problem**: confidence_score is always low.

**Solution**: This is normal if VADER and TextBlob diverge. It indicates disagreement between methods. Check the individual scores to debug.

## Scaling

For production with high data volume:

1. **Database**: Configure PostgreSQL with more memory/CPU
2. **n8n**: Run multiple instances behind load balancer
3. **Sentiment API**: Scale from 4 workers to 8-12
4. **Redis**: Add caching layer for rate limit state (currently in-memory)

## Security

- ✅ API requires Bearer token
- ✅ Secrets in `.env` (not committed)
- ✅ PostgreSQL credentials encrypted
- ⚠️ TODO: Add API rate limiting per token
- ⚠️ TODO: Add request size limits
- ⚠️ TODO: Add CORS configuration if needed

## Disaster Recovery

### Backup Strategy

Run daily:
```bash
docker-compose exec postgres pg_dump -U $POSTGRES_USER -F c -f backup_$(date +%Y%m%d).dump $POSTGRES_DB
```

Store backups securely (off-site, encrypted).

### Recovery Procedure

1. Stop services: `docker-compose down`
2. Restore database: `pg_restore -U $POSTGRES_USER -d $POSTGRES_DB backup_YYYYMMDD.dump`
3. Restart: `docker-compose up -d`
4. Verify: Check data in dashboards

## Version Management

Track deployed version:

```bash
# Tag images with version
docker build -t sentiment-api:v1.0 ./sentiment-api
docker-compose up -d

# Or update version in docker-compose.yml
# services:
#   sentiment-api:
#     build: ./sentiment-api:v1.0
```

---

**Last Updated**: 2026-04-22
**Maintained by**: [Your Team]
**Runbook**: For operational procedures, see separate RUNBOOK.md (if available)
