# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nexus Security Group (NSG)** is an OSINT sentiment analysis platform that monitors cybersecurity threats from social media. It collects posts from Twitter/X and Reddit, analyzes sentiment using an ensemble of VADER and TextBlob, classifies threat severity, and sends alerts via Slack and Email.

## Architecture

### Three-Service Model (Docker Compose)

1. **PostgreSQL (osint-postgres)**: Relational database storing collected data and analysis results
   - Schema defined in `init.sql`
   - Stores: social_mentions, sentiment_analysis, threat_detections, keywords_monitor, alerts, execution_logs
   - Extensions: uuid-ossp, pg_trgm (trigram search), btree_gin

2. **n8n (osint-n8n)**: Workflow orchestration engine
   - Workflows defined in `workflow.json`
   - Auto-imports workflows via `n8n-entrypoint.sh`
   - Handles: data collection (Twitter/Reddit APIs), deduplication, sentiment analysis calls, threat classification, alert routing
   - Execution runs every 15 minutes on schedule

3. **Sentiment API (osint-sentiment-api)**: Flask application
   - Located in `sentiment-api/sentiment_api.py`
   - Endpoint: `POST /analyze` — analyzes text sentiment using VADER + TextBlob ensemble
   - Returns: vader scores, textblob scores, ensemble_score, sentiment_label (positive/negative/neutral), confidence_score
   - Built into Docker image via `sentiment-api/Dockerfile`

### Data Flow

```
Schedule → Rate Limit Check → Twitter/Reddit APIs → Parse → Deduplicate 
→ POST /analyze (Sentiment API) → Classify Threat → Insert Social Mention 
→ Insert Sentiment Analysis → Insert Threat Detection → IF Critical/High 
→ Build Alert → Slack/Email → Log Alert/Execution
```

## Configuration

### Environment Variables (.env)

Required:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — PostgreSQL credentials
- `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD` — n8n UI auth
- `N8N_ENCRYPTION_KEY` — n8n encryption (must be set, complex string)
- Twitter OAuth2 credentials (configured in n8n UI)
- Slack & Email credentials (configured in n8n UI)

All services bind to localhost (127.0.0.1) on their exposed ports:
- PostgreSQL: 5432
- n8n UI: 5678
- Sentiment API: 5000

## Common Development Tasks

### Starting the System

```bash
cd nexus-security-group
docker-compose up -d
```

Wait ~10 seconds for all services to be ready. Check status:

```bash
docker-compose ps
```

### Monitoring

**View logs for Sentiment API:**
```bash
docker-compose logs -f sentiment-api
```

**View logs for n8n (workflow execution):**
```bash
docker-compose logs -f n8n
```

**View PostgreSQL logs:**
```bash
docker-compose logs -f postgres
```

### Stopping

```bash
docker-compose down
```

To remove volumes (wipe all data):
```bash
docker-compose down -v
```

## Development Conventions

### Sentiment API (Python/Flask)

- **Endpoint**: `POST http://sentiment-api:5000/analyze`
- **Input**: JSON with `text` field (string) OR entire tweet object with `text_content` field
- **Output**: Same object with added `sentiment` key containing:
  - `vader`: {compound, pos, neu, neg}
  - `textblob`: {polarity, subjectivity}
  - `ensemble_score`: (vader.compound + textblob.polarity) / 2
  - `sentiment_label`: 'positive' | 'neutral' | 'negative' (thresholds: ±0.05)
  - `confidence_score`: 1 - (|vader.compound - textblob.polarity| / 2)

- **Legacy fallback**: If no tweet object is provided, returns only the sentiment dict
- **Health check**: `GET http://sentiment-api:5000/health` → `{status: healthy}`

### Special Character Handling in SQL

The workflow currently escapes special characters in SQL using string manipulation:
```javascript
.replace(/'/g, "''").replace(/[\r\n]+/g, ' ')
```

This handles single quotes and newlines, but **not**:
- Unicode characters (emojis, accents)
- NULL bytes
- Other control characters

**Current status**: Generally safe for Spanish text with standard special characters. However, edge cases (rare emojis, malformed Unicode) might cause INSERT failures.

**To improve**: Migrate to parameterized queries in n8n (use bind parameters instead of string interpolation). This is the safest approach but requires workflow redesign.

**Short term**: Add broader character sanitization:
```javascript
.replace(/[^\x20-\x7E\xA0-\xFF]/g, '')  // Keep printable + extended ASCII
```

### Processing Status Lifecycle

The `processing_status` field in `social_mentions` has three states:

- **pending**: Mention inserted, awaiting sentiment analysis
- **processed**: All analyses (sentiment, threat detection) completed successfully
- **failed**: Sentiment analysis or threat classification failed

**Current behavior**: Status is set to 'processed' in the INSERT. If sentiment analysis fails downstream, status remains 'processed' (incorrect).

**To improve**: Add error handling in the workflow:
1. Catch errors in "Sentiment Analysis" node
2. On error, update mention status: `UPDATE social_mentions SET processing_status = 'failed', processing_error = '...' WHERE mention_id = ...`
3. Log the failure in execution_logs

This requires workflow reconfiguration in n8n UI (no code change needed).

### n8n Workflow Changes

The workflow is defined in `workflow.json`. When modifying the workflow:

1. **Make changes in the n8n UI** (localhost:5678)
2. **Export the updated workflow** from n8n
3. **Replace `workflow.json`** with the exported version
4. **Restart the container** for changes to persist:
   ```bash
   docker-compose restart n8n
   ```

**Important**: Do NOT edit `workflow.json` by hand for logic changes — use the n8n UI. Hand-edits for configuration only.

Key workflow nodes:
- **Schedule Every 15 Minutes**: Cron trigger
- **Fetch Config**: Pulls active keywords from `keywords_monitor` table
- **Rate Limit Check**: Tracks Twitter API quota
- **Twitter API Search**: Queries recent tweets matching security keywords (24h window)
- **Parse Tweets**: Extracts text, author, metrics, URLs, hashtags, mentions
- **Deduplicate**: Filters out tweets already processed (skips on `#FORCE` tag for testing)
- **Sentiment Analysis**: POST to sentiment API
- **Classify Threat**: Applies keyword matching + sentiment + author metrics to assign threat level
- **Insert Social Mention**: Upserts into `social_mentions` table
- **Insert Sentiment Analysis**: Stores sentiment scores + analysis metadata
- **Insert Threat Detection**: Logs threat classification + risk score
- **IF Critical or High**: Routes high-severity threats to alerts
- **Build Alert Content**: Formats Slack blocks and HTML email
- **Send Slack Alert**: Posts to #general (configured in n8n)
- **Send Email Alert**: Sends to configured recipients
- **Log Alert in DB**: Records alert dispatch
- **Log Execution**: Records workflow execution summary

### Database Schema Conventions

**social_mentions**: Store collected posts
- Unique constraint: `(platform, external_id)` — upserts on conflict
- Status: 'pending' | 'processed' | 'failed'
- Use `#FORCE` tag in tweet text to bypass deduplication (testing)

**sentiment_analysis**: Store VADER + TextBlob results
- One record per mention (unique constraint on `mention_id`)
- Label: 'positive' | 'neutral' | 'negative' | 'mixed'
- Confidence: 0–1 range

**threat_detections**: Store threat classification
- Criticality levels: 'critical' (score ≥ 50) | 'high' (≥ 30) | 'medium' (≥ 15) | 'low'
- Threat types: 'critical_security_incident' | 'high_threat' | 'general'
- Score calculated from: keyword weights + sentiment impact + author authority

**keywords_monitor**: Define searchable threat keywords
- Fields: `keyword_text`, `keyword_weight` (points), `keyword_category` ('critical'|'high'|'medium'|'low'), `is_active`
- Weights cascade: critical (30 pts) > high (20 pts) > medium (15 pts) > low (default)
- Negative sentiment + high author followers add bonus points

**alerts**: Record alert dispatch
- Fields: detection_id, alert_title, alert_message, alert_severity, channels_sent (array), slack_channel, sent_at, delivery_status

**execution_logs**: Record workflow execution summaries
- Tracks: mentions_collected, mentions_processed, detections_generated, alerts_generated per run

### SQL Templating in n8n

Workflow uses n8n's `{{ }}` syntax for dynamic SQL:
- `'{{ $json.field }}'` for string values
- `{{ $json.count }}` for numeric values
- String escaping: `.replace(/'/g, "''")` for single quotes
- Arrays: `ARRAY[${items.map(...).join(',')}]`
- JSONB: `.replace(/'/g, "''")` + `::jsonb` cast
- Multi-line: `.replace(/[\r\n]+/g, ' ')` to collapse newlines

Example (from Insert Social Mention):
```sql
INSERT INTO social_mentions (text_content, likes_count, raw_data)
VALUES (
  {{ $json.text_content ? `'${$json.text_content.replace(/'/g, "''")}'` : "'[Texto no disponible]'" }},
  {{ $json.likes_count || 0 }},
  '{{ JSON.stringify($json.raw_data || {}).replace(/'/g, "''") }}'::jsonb
)
```

### Writing Reports (Conventions)

When writing reports in markdown files:
- Write in **3rd person, professional tone** (as a systems engineer)
- Cite code sections when needed for clarity
- Assume reader lacks domain knowledge but explain technical terms
- Do **NOT overwrite** existing content — make **additive changes** only

Example style (from GEMINI.md):
> "El flujo de trabajo se encuentra en `workflow.json`. Cualquier cambio en el flujo dentro de la interfaz de n8n debe ser exportado a este archivo para persistir en el repositorio."

## Testing the Sentiment API Manually

```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "phishing attack detected on our network"}'
```

Expected response:
```json
{
  "sentiment": {
    "vader": {"compound": -0.85, "pos": 0.0, "neu": 0.64, "neg": 0.36},
    "textblob": {"polarity": -0.7, "subjectivity": 0.6},
    "ensemble_score": -0.775,
    "sentiment_label": "negative",
    "confidence_score": 0.925
  }
}
```

## Current Issues & Notes

- Workflow is currently **inactive** (`"active": false` in workflow.json) — activate in n8n UI to schedule execution
- Reddit integration is defined but credentials may need setup in n8n
- Alerts route to #general Slack channel and configured email — verify credentials before running
- Database `init.sql` has 28KB of schema; any structural changes must be coordinated with workflow node logic (especially the INSERT statements)
- Rate limiting is handled in-memory per execution; resets every 15 minutes with 300 quota remaining

## Repository Structure

```
nexus-security-group/
├── docker-compose.yml         # Service orchestration
├── .env                       # Environment variables (secrets, not committed)
├── init.sql                   # PostgreSQL schema (28KB, 800+ lines)
├── workflow.json              # n8n workflow definition (auto-imported on startup)
├── n8n-entrypoint.sh          # Custom n8n startup script (imports workflow + runs n8n)
├── GEMINI.md                  # Project overview (Spanish)
├── Nexus Security Group.md    # Detailed documentation (Spanish, 390KB)
└── sentiment-api/
    ├── Dockerfile             # Python 3.9 + Flask + VADER + TextBlob
    └── sentiment_api.py       # Flask API (3 endpoints: /health, /analyze)
```

## Key Files to Understand

| File | Purpose | Edit When |
|------|---------|-----------|
| `docker-compose.yml` | Service config, ports, environment | Adding/changing services or ports |
| `init.sql` | Database schema, tables, indexes | Adding new tables or workflow data fields |
| `workflow.json` | n8n workflow orchestration | Use n8n UI, then export (don't hand-edit logic) |
| `sentiment-api/sentiment_api.py` | Sentiment analysis logic | Changing VADER/TextBlob thresholds or confidence calculation |
| `n8n-entrypoint.sh` | n8n startup procedure | Changing how workflows are auto-imported |
| `GEMINI.md` | Spanish overview & conventions | Adding development guidelines |

## Schema Simplification (Fix #12)

The schema has been refactored to remove ~25 dead code and unused tracking fields:

**Removed from sentiment_analysis**:
- `bert_score`, `custom_score` (BERT model not integrated)
- `analysis_version`, `contains_negation`, `contains_intensifiers`, `contains_emoticons`, `emoticon_sentiment`, `analysis_notes`

**Removed from alerts**:
- Delivery tracking: `slack_message_ts`, `slack_thread_ts`, `email_message_id`, `sms_message_id`, `webhook_response`, `delivery_attempts`, `last_delivery_attempt`, `delivery_error`
- Alert suppression: `suppressed`, `suppressed_reason` (not implemented)

**Removed from execution_logs**:
- Unused metrics: `workflow_version`, `mentions_failed`, `api_calls_made`, `api_calls_failed`, `api_quota_remaining`, `error_count`, `error_message`, `error_stack`, `warnings`, `avg_processing_time_ms`, `peak_memory_mb`, `trigger_source`, `configuration_snapshot`, `executed_by`

**Kept**:
- Manual workflow fields (review_status, escalation, follow-up, remediation)
- Future placeholders (is_regex, case_sensitive, trigger_immediate_alert)
- Core functionality fields

**Result**: Schema reduced by ~20%, easier to understand, zero data loss (removed fields were always NULL).

For detailed refactor plan, see `SCHEMA_REFACTOR.md`.

## Implementation Notes

### last_updated Column Synchronization

The `last_updated` column is updated in **two places**:
1. **Workflow**: INSERT/UPDATE queries explicitly set `last_updated = NOW()`
2. **Database trigger**: `update_last_updated_column()` trigger fires BEFORE UPDATE

This is intentionally redundant—the trigger acts as a safety net if the workflow forgets to update `last_updated`. While slightly inefficient, it ensures data consistency.

To optimize: remove the trigger from `init.sql` lines 455-458 if you trust the workflow to always update timestamps correctly.

## API Resilience

### Sentiment Analysis Retry Logic

The "Sentiment Analysis" node currently has `continueOnFail: true` but **no retry mechanism**. If the API is temporarily unavailable, tweets lose sentiment scores.

**To add retry logic in n8n**:
1. Open the "Sentiment Analysis" node settings
2. Enable "Retry on Fail" in the node's Advanced settings
3. Set: Retry Count = 3, Delay between retries = 5 seconds, Exponential backoff = ON
4. Alternatively, wrap the HTTP request in a "Retry" node

This prevents silent data loss when the API is temporarily down.

## Database Maintenance

### Refreshing Materialized Views

Materialized views (`daily_mention_stats`, `top_keywords_stats`, `workflow_performance_stats`) provide denormalized data for reporting dashboards. They must be refreshed regularly to stay current.

**Manual refresh** (run in PostgreSQL):
```sql
SELECT refresh_all_materialized_views();
```

**Scheduled refresh**: Add a database maintenance job (cron) to refresh every hour:
```bash
0 * * * * psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT refresh_all_materialized_views();"
```

---

**Last updated**: 2026-04-22 | **Branch**: v1.03-hotfix
