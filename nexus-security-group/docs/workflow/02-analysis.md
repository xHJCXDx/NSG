# 02 — Análisis

## Análisis de sentimiento

`Sentiment Analysis` envía cada item nuevo por POST a `http://sentiment-api:5000/analyze`.

La respuesta esperada alimenta `sentiment_analysis` con:

- `vader_compound`, `vader_pos`, `vader_neu`, `vader_neg`.
- `textblob_polarity`, `textblob_subjectivity`.
- `final_sentiment_score` entre -1 y 1.
- `sentiment_label`: `positive`, `neutral` o `negative`.
- `confidence_score` y `analysis_method`.

## Clasificación de amenazas

`Classify Threat` combina el item original con el sentimiento y calcula campos para `threat_detections`:

- `threat_type` y `threat_category`.
- `criticality_level`: `low`, `medium`, `high`, `critical`.
- `confidence_score`.
- `risk_score` entre 0 y 100.
- `matched_keywords` y `detection_rules_triggered`.
- `contextual_notes`.

## Reglas observables desde el esquema

`init.sql` confirma las restricciones principales:

- Cada amenaza pertenece a una mención (`mention_id`).
- Solo puede existir una detección por mención (`unique_detection_per_mention`).
- La severidad está restringida por check constraint.
- `review_status` arranca en `pending` y admite `pending`, `reviewing`, `confirmed`, `false_positive`, `investigating`, `resolved`.

## Métricas derivadas

Los campos `matched_keywords`, `confidence_score`, `criticality_level` y `detected_at` alimentan la vista materializada `top_keywords_stats`, consumida por `/api/metrics/top-keywords`.
