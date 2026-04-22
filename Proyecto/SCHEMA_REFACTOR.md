# NSG Schema Refactor Proposal

## Problem

The current schema defines 150+ columns across 6 tables, but the workflow only populates ~60 (~40% utilization).

**Ghost columns** fall into two categories:
1. **Dead code**: Future features never implemented
2. **Manual workflow**: Fields expecting manual UI/dashboard input

## Analysis by Table

### social_mentions (29 fields, 93% utilized)

✅ **KEEP ALL** - Well designed, fully used
- 2 unused: `media_types`, `geo_location` (now populated by Fix #4)

---

### sentiment_analysis (25 fields, 44% utilized)

**Currently used (11 fields)**:
- mention_id, vader_compound, vader_pos, vader_neu, vader_neg
- textblob_polarity, textblob_subjectivity
- final_sentiment_score, sentiment_label, confidence_score
- analysis_method

**Dead code (14 fields)** - Never populated:
- `bert_score` — BERT model not integrated
- `custom_score` — Custom model not defined
- `analysis_version` — Not tracked
- `contains_negation` — Feature detection not implemented
- `contains_intensifiers` — Feature detection not implemented
- `contains_emoticons` — Feature detection not implemented
- `emoticon_sentiment` — Feature detection not implemented
- `analysis_notes` — Never set by workflow

**Decision**: Remove dead code fields. BERT/custom scores can be added back later.

---

### threat_detections (28 fields, 29% utilized)

**Currently used (8 fields)**:
- mention_id, sentiment_id, threat_type, threat_category (now populated by Fix #5)
- criticality_level, confidence_score, matched_keywords
- detection_method, risk_score

**Manual workflow (20 fields)** - Designed for manual review system:
- `detection_rules_triggered` — Rules engine not implemented
- `contextual_notes`, `related_iocs`, `affected_assets` — Manual annotation
- `potential_impact` — Manual assessment
- `review_status`, `reviewed_by`, `reviewed_at`, `review_notes` — Manual review
- `actions_taken`, `remediation_status`, `resolution_time` — Incident tracking
- `escalated`, `escalated_to`, `escalation_time` — Escalation workflow

**Decision**: Keep all manual fields (required for incident management). Document that they need manual population.

---

### alerts (26 fields, 31% utilized)

**Currently used (8 fields)**:
- detection_id, alert_uuid
- alert_title, alert_message, alert_severity
- channels_sent, slack_channel, sent_at, delivery_status
- recipients, teams_notified (now populated by Fix #6)

**Unused tracking (18 fields)**:
- `alert_priority` — Not used in routing
- `slack_message_ts`, `slack_thread_ts` — IDs not captured
- `email_message_id`, `sms_message_id`, `webhook_response` — Not tracked
- `delivery_attempts`, `last_delivery_attempt`, `delivery_error` — Not tracked
- `acknowledged`, `acknowledged_by`, `acknowledged_at`, `acknowledgment_method` — Manual
- `follow_up_required`, `follow_up_notes`, `follow_up_due_date` — Manual
- `suppressed`, `suppressed_reason` — Not implemented
- `alert_version` — Not versioned

**Decision**: 
- **Remove**: Delivery tracking fields (can implement later if needed)
- **Keep**: Manual acknowledgment/follow-up fields (useful for SOC)
- **Remove**: Suppression (not critical)

---

### execution_logs (20 fields, 35% utilized)

**Currently used (7 fields)**:
- log_id, execution_uuid
- workflow_name, execution_id
- status, started_at, completed_at
- mentions_collected, mentions_processed, detections_generated, alerts_generated (tracked but with issues)

**Unused metrics (13 fields)**:
- `workflow_version` — Not tracked
- `mentions_failed` — Always 0
- `api_calls_made`, `api_calls_failed`, `api_quota_remaining` — Not tracked
- `error_count`, `error_message`, `error_stack`, `warnings` — Not captured
- `duration_seconds` — AUTO CALCULATED (trigger)
- `avg_processing_time_ms`, `peak_memory_mb` — Not measured
- `trigger_source` — Hardcoded to 'schedule'
- `configuration_snapshot` — Not captured
- `executed_by` — Not tracked

**Decision**: Remove unused fields. Metrics can be added back in next iteration with proper instrumentation.

---

### keywords_monitor (23 fields, 22% utilized)

**Currently used (5 fields)**:
- keyword_id, keyword_text
- keyword_weight, keyword_category, is_active

**Advanced features (18 fields)** - Not implemented:
- `keyword_type` — Not used in classification
- `is_regex`, `case_sensitive` — Regex not implemented
- `last_modified_by`, `last_modified_at` — Audit not implemented
- `false_positive_count`, `true_positive_count` — Never updated
- `trigger_immediate_alert`, `min_matches_for_alert` — Not implemented
- `description`, `notes` — Reference only

**Decision**: Keep fields for future features (low cost). Document that they're not active yet.

---

## Refactor Options

### Option A: Aggressive Cleanup (Recommended for simplicity)

Remove all unused fields NOW. Add back features when needed.

**Tables affected**:
- `sentiment_analysis`: Remove 8 dead code fields (BERT, custom, features)
- `alerts`: Remove 9 delivery tracking fields
- `execution_logs`: Remove 7 unused metric fields

**Cost**: ~5 column removals, data loss risk: NONE (fields are empty)

**Benefit**: Cleaner schema (30% reduction), easier to understand

---

### Option B: Conservative (Current state)

Keep everything. Document what's used vs unused. Add instrumentation when needed.

**Cost**: Maintain 150+ columns, potential confusion

**Benefit**: No breaking changes, can add features without schema migration

---

### Option C: Hybrid (Recommended for production)

**Keep**:
- Manual workflow fields (review_status, escalation, follow-up)
- Future feature placeholders (bert_score, is_regex, feature detection)
- Audit trail fields (added_by, last_modified_at)

**Remove**:
- Dead code with no path to implementation (analysis_notes, trigger_immediate_alert)
- Duplicate tracking (currently broken - Fix #9 incomplete)
- Hardcoded fields (trigger_source always 'schedule')

**Expected reduction**: 40% fewer columns, 0% data loss

---

## Implementation (Option C)

### Step 1: Create backup
```sql
-- Before making changes
pg_dump -U osint_user -d osint_db > schema_backup.sql
```

### Step 2: Remove dead code

```sql
-- sentiment_analysis: Remove unused features
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS bert_score;
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS custom_score;
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS analysis_version;
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS contains_negation;
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS contains_intensifiers;
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS contains_emoticons;
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS emoticon_sentiment;
ALTER TABLE sentiment_analysis DROP COLUMN IF EXISTS analysis_notes;

-- alerts: Remove unused delivery tracking
ALTER TABLE alerts DROP COLUMN IF EXISTS slack_message_ts;
ALTER TABLE alerts DROP COLUMN IF EXISTS slack_thread_ts;
ALTER TABLE alerts DROP COLUMN IF EXISTS email_message_id;
ALTER TABLE alerts DROP COLUMN IF EXISTS sms_message_id;
ALTER TABLE alerts DROP COLUMN IF EXISTS webhook_response;
ALTER TABLE alerts DROP COLUMN IF EXISTS delivery_attempts;
ALTER TABLE alerts DROP COLUMN IF EXISTS last_delivery_attempt;
ALTER TABLE alerts DROP COLUMN IF EXISTS delivery_error;
ALTER TABLE alerts DROP COLUMN IF EXISTS suppressed;
ALTER TABLE alerts DROP COLUMN IF EXISTS suppressed_reason;

-- execution_logs: Remove unused metrics
ALTER TABLE execution_logs DROP COLUMN IF EXISTS workflow_version;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS mentions_failed;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS api_calls_made;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS api_calls_failed;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS api_quota_remaining;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS error_count;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS error_message;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS error_stack;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS warnings;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS avg_processing_time_ms;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS peak_memory_mb;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS trigger_source;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS configuration_snapshot;
ALTER TABLE execution_logs DROP COLUMN IF EXISTS executed_by;
```

### Step 3: Update init.sql

Remove the corresponding column definitions from `init.sql` before next fresh deployment.

### Step 4: Update materialized views (if affected)

The materialized view queries may reference dropped columns. Update accordingly.

---

## Risk Assessment

**Data Loss**: NONE (columns are always NULL)
**Compatibility**: All removed fields are never populated by workflow
**Rollback**: Schema backup available

---

## Recommendation

**Implement Option C - Hybrid**:
- ✅ Removes ~25 dead code fields
- ✅ Keeps manual workflow capability
- ✅ Keeps future feature placeholders
- ✅ Zero data loss risk
- ✅ Schema becomes 20% smaller, 30% easier to understand

**Timeline**: After Fix #3 (Reddit) completes, before production deployment.

---

**Next Step**: Run `pg_dump` for backup, then apply SQL changes above.
