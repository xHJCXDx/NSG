# Resumen de Prueba Controlada REV45 — Caída de Sentiment API

> Escenario: indisponibilidad temporal de `osint-sentiment-api` durante una ejecución manual del workflow n8n.  
> Objetivo: verificar si el pipeline continúa procesando menciones con fallback neutral y registra la ejecución sin detenerse.

## Procedimiento

1. Se preservaron conteos SQL iniciales y estado de contenedores.
2. Se detuvo temporalmente `osint-sentiment-api`.
3. Se disparó manualmente el webhook `POST http://localhost:5678/webhook/osint-trigger`.
4. Se esperó la ejecución del workflow con la API de sentimiento caída.
5. Se reinició `osint-sentiment-api`.
6. Se preservaron logs de n8n, logs del servicio de sentimiento y consultas SQL posteriores.

## Evidencia preservada

| Archivo | Contenido |
|---|---|
| `docker_before.txt` | Estado de contenedores antes de la prueba. |
| `sql_before.txt` | Conteos SQL antes de la prueba. |
| `trigger_with_sentiment_down.log` | Detención de Sentiment API y disparo del webhook. |
| `sentiment_restart.log` | Reinicio del servicio de sentimiento. |
| `docker_after_restart.txt` | Estado de contenedores después del reinicio. |
| `sql_after.txt` | Últimas ejecuciones y conteos generales posteriores. |
| `sql_fault_window_analysis.txt` | Análisis SQL de los registros insertados durante la ventana de falla. |
| `n8n_logs_since_test.txt` | Logs de n8n con warnings del fallback. |
| `sentiment_logs_since_test.txt` | Logs del servicio de sentimiento. |

## Resultado cuantitativo

| Métrica | Valor |
|---|---:|
| Ejecución registrada | `execution_id = 130` |
| Estado registrado | `success` |
| Menciones recolectadas | 100 |
| Menciones nuevas procesadas | 37 |
| Detecciones generadas | 37 |
| Alertas candidatas/generadas | 2 |
| Registros en ventana de falla | 37 |
| Sentimientos fallback neutral | 37/37 |
| `final_sentiment_score` fallback | 0.0000 |
| `confidence_score` fallback | 0.500 |
| Distribución de criticidad | high: 2, medium: 23, low: 12 |

## Evidencia de fallback

Los logs de n8n registran advertencias `Classify Threat: Sentiment API failed...` para los 37 ítems procesados durante la falla. La base confirma que los 37 registros insertados en la ventana de falla quedaron con `sentiment_label = neutral`, `final_sentiment_score = 0.0000` y `confidence_score = 0.500`.

## Interpretación metodológica

La prueba demuestra tolerancia controlada ante caída temporal del servicio de sentimiento: el workflow no se detuvo, continuó con valores neutrales por defecto, generó detecciones y registró la ejecución como exitosa.

Esta evidencia no demuestra tolerancia general ante cualquier falla ni garantiza ausencia de pérdida de datos en todos los escenarios. Su alcance se limita al escenario probado: indisponibilidad temporal del componente Sentiment API durante una ejecución manual.
