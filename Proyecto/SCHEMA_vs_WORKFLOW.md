# Schema vs Workflow - Incoherence Analysis

## social_mentions Table

### Fields Defined but NOT Used by Workflow

```
SCHEMA DEFINES                    | WORKFLOW USES | STATUS
---------------------------------|---------------|--------
platform ✓                       | ✓             | OK
external_id ✓                    | ✓             | OK
text_content ✓                   | ✓             | OK
language ✓                       | ✓             | OK
created_at ✓                     | ✓             | OK
collected_at ✓                   | AUTO (NOW)    | OK
author_username ✓                | ✓             | OK
author_id ✓                      | ✓             | OK
author_verified ✓                | ✓             | OK
author_followers_count ✓         | ✓             | OK
author_description ✓             | ✓             | OK
likes_count ✓                    | ✓             | OK
shares_count ✓                   | ✓             | OK
replies_count ✓                  | ✓             | OK
views_count ✓                    | ✓             | OK
urls ✓                           | ✓             | OK
hashtags ✓                       | ✓             | OK
mentions ✓                       | ✓             | OK
has_media ✓                      | ✓             | OK
media_types ✗                    | ✗             | ❌ NEVER POPULATED
geo_location ✗                   | ✗             | ❌ NEVER POPULATED
is_reply ✓                       | ✓             | OK
is_quote ✓                       | ✓             | OK
reply_to_id ✓                    | ✓             | OK
conversation_id ✓                | ✓             | OK
raw_data ✓                       | ✓             | OK
processing_status ✓              | ✓             | OK (set to 'processed')
processing_error ✗               | ✗             | ⚠️ Never logged on failure
last_updated ✓                   | ✓             | OK
```

**Issues Found in social_mentions**:
- ❌ `media_types` is defined but never extracted from Twitter API
- ❌ `geo_location` is defined but not implemented
- ⚠️ `processing_error` never populated when workflow fails

---

## sentiment_analysis Table

### Fields Defined but NOT Used by Workflow

```
SCHEMA DEFINES                    | WORKFLOW USES | STATUS
---------------------------------|---------------|--------
mention_id ✓                     | ✓             | OK
vader_compound ✓                 | ✓             | OK
vader_pos ✓                      | ✓             | OK
vader_neu ✓                      | ✓             | OK
vader_neg ✓                      | ✓             | OK
textblob_polarity ✓              | ✓             | OK
textblob_subjectivity ✓          | ✓             | OK
bert_score ✗                     | ✗             | ⚠️ For future, never used
custom_score ✗                   | ✗             | ⚠️ For future, never used
final_sentiment_score ✓          | ✓             | OK
sentiment_label ✓                | ✓             | OK (pero nunca 'mixed')
confidence_score ✓               | ✓             | ❌ VALIDATION BUG (no clamp)
analysis_method ✓                | ✓             | OK (always 'ensemble')
analysis_version ✗               | ✗             | ⚠️ Never set
analyzed_at ✓                    | ✓ (AUTO)      | OK
contains_negation ✗              | ✗             | ⚠️ Feature not implemented
contains_intensifiers ✗          | ✗             | ⚠️ Feature not implemented
contains_emoticons ✗             | ✗             | ⚠️ Feature not implemented
emoticon_sentiment ✗             | ✗             | ⚠️ Feature not implemented
analysis_notes ✗                 | ✗             | ⚠️ Never populated
```

**Issues Found in sentiment_analysis**:
- ❌ `confidence_score` without bounds checking (can be negative!)
- ⚠️ `bert_score`, `custom_score` defined but no logic
- ⚠️ `contains_negation`, `contains_intensifiers`, `contains_emoticons` defined but not extracted
- ⚠️ `sentiment_label` allows 'mixed' but API never assigns it

---

## threat_detections Table

### Fields Defined but NOT Used by Workflow

```
SCHEMA DEFINES                    | WORKFLOW USES | STATUS
---------------------------------|---------------|--------
mention_id ✓                     | ✓             | OK
sentiment_id ✓                   | ✓             | OK
threat_type ✓                    | ✓             | OK
threat_category ✗                | ✗             | ❌ CRITICAL: Never mapped
criticality_level ✓              | ✓             | OK
confidence_score ✓               | ✓             | OK
risk_score ✓                     | ✓             | OK (raw_score)
matched_keywords ✓               | ✓             | OK
detection_rules_triggered ✗      | ✗             | ⚠️ Not mapped from rules
detection_method ✓               | ✓             | OK (always 'heuristic')
contextual_notes ✗               | ✗             | ⚠️ Manual only
related_iocs ✗                   | ✗             | ⚠️ Manual only
affected_assets ✗                | ✗             | ⚠️ Manual only
potential_impact ✗               | ✗             | ⚠️ Manual only
detected_at ✓                    | ✓ (AUTO)      | OK
review_status ✗                  | ✗             | ⚠️ Manual (defaults to 'pending')
reviewed_by ✗                    | ✗             | ⚠️ Manual only
reviewed_at ✗                    | ✗             | ⚠️ Manual only
review_notes ✗                   | ✗             | ⚠️ Manual only
actions_taken ✗                  | ✗             | ⚠️ Manual only
remediation_status ✗             | ✗             | ⚠️ Manual only
escalated ✗                      | ✗             | ⚠️ Manual only
escalated_to ✗                   | ✗             | ⚠️ Manual only
escalation_time ✗                | ✗             | ⚠️ Manual only
```

**Issues Found in threat_detections**:
- ❌ `threat_category` **CRITICAL** - Should be auto-mapped but isn't
- ⚠️ 60% of columns are for manual review, not auto-populated
- ⚠️ `detection_rules_triggered` defined but not implemented

---

## alerts Table

### Fields Defined but NOT Used by Workflow

```
SCHEMA DEFINES                    | WORKFLOW USES | STATUS
---------------------------------|---------------|--------
detection_id ✓                   | ✓             | OK
alert_uuid ✓ (AUTO)              | -             | OK
alert_title ✓                    | ✓             | OK
alert_message ✓                  | ✓             | OK
alert_severity ✓                 | ✓             | OK
alert_priority ✗                 | ✗             | ⚠️ Defaults to 3
recipients ✗                     | ✗             | ❌ MISSING: No tracking who got alert
teams_notified ✗                 | ✗             | ❌ MISSING: No team tracking
channels_sent ✓                  | ✓             | OK
slack_channel ✓                  | ✓             | OK
slack_message_ts ✗               | ✗             | ⚠️ Not captured
slack_thread_ts ✗                | ✗             | ⚠️ Not captured
email_message_id ✗               | ✗             | ⚠️ Not captured
sms_message_id ✗                 | ✗             | ⚠️ Not captured
webhook_response ✗               | ✗             | ⚠️ Not captured
created_at ✓ (AUTO)              | -             | OK
sent_at ✓                        | ✓             | OK
delivery_attempts ✗              | ✗             | ⚠️ Not tracked
last_delivery_attempt ✗          | ✗             | ⚠️ Not tracked
delivery_status ✓                | ✓             | OK
delivery_error ✗                 | ✗             | ⚠️ Not captured
acknowledged ✗                   | ✗             | ⚠️ Manual only
acknowledged_by ✗                | ✗             | ⚠️ Manual only
acknowledged_at ✗                | ✗             | ⚠️ Manual only
acknowledgment_method ✗          | ✗             | ⚠️ Manual only
follow_up_required ✗             | ✗             | ⚠️ Manual only
follow_up_notes ✗                | ✗             | ⚠️ Manual only
follow_up_due_date ✗             | ✗             | ⚠️ Manual only
suppressed ✗                     | ✗             | ⚠️ Manual only
suppressed_reason ✗              | ✗             | ⚠️ Manual only
```

**Issues Found in alerts**:
- ❌ `recipients` **CRITICAL** - No tracking of who was alerted
- ❌ `teams_notified` - No audit of teams
- ⚠️ Slack/Email message tracking not implemented

---

## execution_logs Table

```
SCHEMA DEFINES                    | WORKFLOW USES | STATUS
---------------------------------|---------------|--------
execution_uuid ✓ (AUTO)          | -             | OK
workflow_name ✓                  | ✓             | OK
workflow_version ✗               | ✗             | ⚠️ Not set
execution_id ✓                   | ✓             | OK
status ✓                         | ✓             | OK (always 'success')
mentions_collected ✓             | ✓             | ⚠️ itemMatching issue
mentions_processed ✓             | ✓             | ⚠️ itemMatching issue
mentions_failed ✗                | ✗             | ⚠️ Always 0
detections_generated ✓           | ✓             | ⚠️ itemMatching issue
alerts_generated ✓               | ✓             | ⚠️ itemMatching issue
api_calls_made ✗                 | ✗             | ⚠️ Not tracked
api_calls_failed ✗               | ✗             | ⚠️ Not tracked
api_quota_remaining ✗            | ✗             | ⚠️ Not tracked
error_count ✗                    | ✗             | ⚠️ Not tracked
error_message ✗                  | ✗             | ⚠️ Not tracked
error_stack ✗                    | ✗             | ⚠️ Not tracked
warnings ✗                       | ✗             | ⚠️ Not tracked
started_at ✓                     | ✓             | OK
completed_at ✓                   | ✓             | OK
duration_seconds ✓ (AUTO)        | -             | OK
avg_processing_time_ms ✗         | ✗             | ⚠️ Not calculated
peak_memory_mb ✗                 | ✗             | ⚠️ Not tracked
trigger_source ✓                 | ✓ (hardcoded) | ⚠️ Always 'schedule'
configuration_snapshot ✗         | ✗             | ⚠️ Not captured
executed_by ✗                    | ✗             | ⚠️ Not captured
```

**Issues Found in execution_logs**:
- ⚠️ Performance metrics (avg_processing_time_ms, peak_memory_mb) not tracked
- ⚠️ Error tracking incomplete
- ⚠️ API metrics not captured

---

## keywords_monitor Table

```
SCHEMA DEFINES                    | WORKFLOW USES | STATUS
---------------------------------|---------------|--------
keyword_id ✓                     | ✓ (READ)      | OK
keyword_text ✓                   | ✓ (READ)      | OK
keyword_type ✗                   | ✗             | ⚠️ Not used in threat scoring
keyword_category ✓               | ✓ (READ)      | OK
keyword_weight ✓                 | ✓ (READ)      | OK
is_active ✓                      | ✓ (READ)      | OK
is_regex ✗                       | ✗             | ⚠️ Regex support not implemented
case_sensitive ✗                 | ✗             | ⚠️ Case sensitivity not used
added_by ✗                       | ✗             | ⚠️ Manual audit trail
added_at ✗                       | ✗             | ⚠️ Manual audit trail
last_modified_by ✗               | ✗             | ⚠️ Manual audit trail
last_modified_at ✗               | ✗             | ⚠️ Manual audit trail
last_match_at ✓ (TRIGGER)        | -             | OK
match_count ✓ (TRIGGER)          | -             | OK
false_positive_count ✗           | ✗             | ⚠️ Never updated by workflow
true_positive_count ✗            | ✗             | ⚠️ Never updated by workflow
trigger_immediate_alert ✗        | ✗             | ⚠️ Not implemented
min_matches_for_alert ✗          | ✗             | ⚠️ Not implemented
description ✗                    | ✗             | ✓ (reference only)
notes ✗                          | ✗             | ✓ (reference only)
```

**Issues Found in keywords_monitor**:
- ⚠️ `is_regex` not implemented (always simple substring match)
- ⚠️ `false_positive_count`, `true_positive_count` never updated
- ⚠️ `trigger_immediate_alert` defined but not used

---

## Summary Statistics

### social_mentions
- **Fields defined**: 29
- **Fields used**: 27
- **Fields unused**: 2 (media_types, geo_location)
- **Coverage**: 93%

### sentiment_analysis
- **Fields defined**: 25
- **Fields used**: 11
- **Fields unused**: 14 (future features + special detections)
- **Coverage**: 44%

### threat_detections
- **Fields defined**: 28
- **Fields used**: 8
- **Fields unused**: 20 (mostly manual review)
- **Coverage**: 29%

### alerts
- **Fields defined**: 26
- **Fields used**: 8
- **Fields unused**: 18 (tracking + manual)
- **Coverage**: 31%

### execution_logs
- **Fields defined**: 20
- **Fields used**: 7
- **Fields unused**: 13 (metrics + performance)
- **Coverage**: 35%

### keywords_monitor
- **Fields defined**: 23
- **Fields used**: 5 (in workflow)
- **Fields unused**: 18 (audit + features)
- **Coverage**: 22%

---

## Overall Assessment

```
TABLA                | UTILIZACION | PROBLEMA
---------------------|--------------|----------------------------------
social_mentions      | 93%          | 🟡 Minor - 2 unused fields
sentiment_analysis   | 44%          | 🟠 Medium - Future features undefined
threat_detections    | 29%          | 🔴 CRITICAL - 60% for manual work
alerts               | 31%          | 🔴 CRITICAL - Missing recipients track
execution_logs       | 35%          | 🟠 Medium - Metrics not captured
keywords_monitor     | 22%          | 🟠 Medium - Advanced features undefined
---------------------|--------------|----------------------------------
AVERAGE UTILIZATION  | 42%          | ⚠️  Schema 2.4x overcomplicated
```

---

## Recomendaciones

### Opción A: Completar Schema (Más Trabajo)
- Implementar todos los campos faltantes
- Crear interface manual para revisión
- Agregar support para regex, custom rules
- **Pros**: Flexible, futuro-proof
- **Cons**: Mucho trabajo, complejidad

### Opción B: Simplificar Schema (Recomendado)
- Mantener solo campos auto-poblados por workflow
- Crear tabla separada `threat_reviews` para revisión manual
- Remover campos para "future" features
- **Pros**: Simple, mainteinable, claro
- **Cons**: Menos flexible

### Opción C: Híbrido (Más Realista)
- Core schema: Solo campos auto-poblados
- Extended schema: Opcionales para futuro
- Documentación clara: Qué es auto vs manual
- **Pros**: Balance entre flexibilidad y simplicity

**Recomendación**: Opción C + documentar claramente
