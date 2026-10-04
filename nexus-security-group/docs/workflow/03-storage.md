# 03 — Persistencia

## Patrón Prep → Insert → Enrich

El workflow usa un patrón repetido para mantener datos del item original aunque los nodos PostgreSQL consoliden respuestas:

1. **Prep**: un nodo JavaScript arma parámetros/SQL y conserva contexto.
2. **Insert**: un nodo PostgreSQL persiste.
3. **Enrich**: un nodo JavaScript recompone el contexto para la siguiente etapa.

## Menciones sociales

- `Prep Mention Insert` arma la inserción en `social_mentions`.
- `Insert Social Mention` ejecuta el SQL.
- La tabla tiene unique constraint `unique_mention_per_platform(platform, external_id)`.

Campos clave: `platform`, `external_id`, `text_content`, `created_at`, `author_*`, `urls`, `hashtags`, `raw_data`, `processing_status`.

## Sentimiento

- `Enrich Mention + Prep Sentiment` usa el resultado de menciones para preparar sentimiento.
- `Insert Sentiment Analysis` inserta en `sentiment_analysis`.
- La tabla tiene `unique_sentiment_per_mention(mention_id)`.

## Detecciones

- `Enrich Sentiment + Prep Threat` prepara la amenaza.
- `Insert Threat Detection` persiste en `threat_detections`.
- La tabla tiene `unique_detection_per_mention(mention_id)`.

## Alertas

- `Prep Alert Insert` prepara el registro de alerta para detecciones `high` o `critical`.
- `Log Alert in DB` inserta en `alerts`.
- `idx_alerts_detection_id` es único: una alerta por detección.

## Decisión de diseño

El workflow evita depender de la salida agregada de PostgreSQL para contar items. Los nodos `Enrich ...` son passthrough y sirven como fuente confiable para métricas de ejecución.
