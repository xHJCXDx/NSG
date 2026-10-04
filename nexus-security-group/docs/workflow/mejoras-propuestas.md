# Mejoras propuestas para el workflow OSINT

## 1. Parametrizar fuentes y queries

**Problema:** URLs y queries están hardcodeadas en `workflow.json`.

**Propuesta:** mover términos, límites y URLs base a variables de entorno n8n o credenciales/config centralizada.

**Beneficio:** permite ajustar cobertura sin editar el workflow.

## 2. Endurecer alertas reales

**Problema:** Slack depende de `SLACK_WEBHOOK_URL` y Gmail de credenciales n8n, pero la operación queda implícita.

**Propuesta:** documentar setup de credenciales, canal destino, remitente, pruebas de entrega y fallback si un canal falla.

**Beneficio:** menos sorpresas en demo/producción.

## 3. Autenticar GitHub API

**Problema:** GitHub Search sin token queda expuesto a límites bajos y throttling.

**Propuesta:** usar token de solo lectura mediante credencial n8n y agregar headers de autenticación.

**Beneficio:** mayor estabilidad y capacidad de búsqueda.

## 4. Retry con backoff para Sentiment API

**Problema:** `Sentiment Analysis` es dependencia interna crítica; un fallo transitorio corta análisis.

**Propuesta:** agregar retry con backoff exponencial y registrar errores por item cuando se agoten reintentos.

**Beneficio:** reduce falsos negativos operativos sin esconder fallos reales.

## 5. Refresco explícito de vistas materializadas

**Problema:** los gráficos dependen de `top_keywords_stats` y `workflow_performance_stats`.

**Propuesta:** ejecutar `refresh_all_materialized_views()` al final del workflow o programar job de mantenimiento.

**Beneficio:** dashboards consistentes después de cada corrida.

## 6. Métricas por fuente

**Problema:** `execution_logs` guarda totales globales, no desglose por fuente.

**Propuesta:** agregar contadores por `hackernews`, `exploit-db` y `github` en `activity_data` o en una tabla nueva de métricas por fuente.

**Beneficio:** permite detectar qué fuente falla o se queda sin datos.

## 7. Fuentes futuras

Prioridad sugerida:

1. NVD/CVE API para vulnerabilidades oficiales.
2. CISA KEV para explotación activa.
3. VirusTotal para IoCs.
4. Shodan como integración avanzada, cuidando costos y rate limits.
