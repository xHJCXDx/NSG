# NSG Project - Quick Issues Summary

## Overview

**Total Issues Found**: 20  
**Status**: ⚠️ REQUIRES FIXES BEFORE PRODUCTION

---

## Critical Issues (Must Fix Immediately)

| # | Problema | Ubicación | Impacto | Solución |
|---|----------|-----------|---------|----------|
| 1 | `media_types` no se captura | workflow.json: Parse Tweets | Perdida de datos de tipos de media | Agregar extracción en Parse Tweets + INSERT update |
| 2 | `threat_category` no se inserta | workflow.json: Insert Threat Detection | Campo NULL siempre | Mapear threat_type → threat_category en Classify Threat |
| 3 | Credential ID duplicada (Twitter = Reddit) | workflow.json: Nodos | Reddit usa creds de Twitter | Obtener ID correcto de Reddit en n8n UI |
| 4 | `confidence_score` sin validación | sentiment_api.py:52 | Valores negativos posibles → INSERT falla | Agregar `max(0, min(1.0, ...))` |
| 5 | Prefijo `=` en INSERT alerts | workflow.json: Log Alert in DB | Query malformed | Remover `=` del inicio |

---

## High Priority Issues (This Week)

| # | Problema | Ubicación | Impacto | Severidad |
|---|----------|-----------|---------|-----------|
| 6 | Sin recipients tracking en alerts | workflow.json: Log Alert in DB | No auditoría de destinatarios | 🟠 Data Loss Risk |
| 7 | Sin retry logic en API calls | workflow.json: Sentiment Analysis | Silent failures si API cae | 🟠 Reliability |
| 8 | Gunicorn sin config explícita | sentiment-api/Dockerfile | Baja performance, timeouts | 🟠 Performance |
| 9 | itemMatching inconsistente (algunos try/catch, otros no) | workflow.json: Log Execution | Execution logs incorrectos | 🟠 Metrics |
| 10 | Reddit integration broken (creds duplicadas) | workflow.json: Reddit nodes | Reddit data no se recopila | 🟠 Functionality |
| 11 | Materialized views nunca se refrescan | init.sql + workflow | Dashboards con datos stale | 🟠 Reporting |
| 12 | Schema overcomplicated vs workflow usage | init.sql (150+ columnas) | Confusión, mantenimiento difícil | 🟠 Maintainability |

---

## Medium Priority Issues (Next Sprint)

| # | Problema | Ubicación |
|---|----------|-----------|
| 13 | Unicode/encoding fragility | Multiple nodes (string escaping) |
| 14 | Hardcoded ports y host | sentiment_api.py |
| 15 | NO authentication en /analyze | sentiment_api.py |
| 16 | Zero logging en API | sentiment_api.py |
| 17 | Trigger redundant en social_mentions | init.sql + workflow.json |
| 18 | 'mixed' label nunca se asigna | sentiment_api.py |

---

## Low Priority Issues

| # | Problema | Ubicación |
|---|----------|-----------|
| 19 | Processed status no se actualiza a 'failed' | workflow.json: Insert Social Mention |
| 20 | No deployment documentation | (Missing file) |

---

## Corrección Rápida (Orden de Prioridad)

### Hoy (30 min - 1h)
```
1. ✏️ QUICK FIX sentiment_api.py línea 52:
   confidence = max(0.0, min(1.0, 1.0 - (score_diff / 2)))

2. ✏️ QUICK FIX workflow.json - Remove "=" prefix:
   "query": "INSERT INTO alerts ..." (sin =)

3. ✏️ QUICK FIX workflow.json - Reddit credentials:
   Obtener ID correcto y actualizar
```

### Esta Semana (1-2 días)
```
4. 🔧 Agregar media_types en Parse Tweets
5. 🔧 Mapear threat_category en Classify Threat  
6. 🔧 Agregar recipients tracking en alerts
7. 🔧 Configurar Gunicorn con workers/timeout
8. 🔧 Agregar logging en sentiment_api.py
9. 🔧 Implementar retry logic en Sentiment Analysis node
10. 🔧 Refrescar materialized views en workflow
```

### Próximas 2 Sprints
```
11. Agregar authentication en /analyze
12. Environment variables en sentiment_api.py
13. Documentación de deployment
14. Simplificar schema (remover ghost columns)
15. Mejorar Reddit integration
```

---

## Quick Health Check

```
✅ = Funciona correctamente
⚠️ = Funciona pero con issues
❌ = Roto o crítico

COMPONENTE           | STATUS | NOTAS
---------------------|--------|-----------------------------------
Python API           | ⚠️     | Sin logging, confidence sin clamp
n8n Workflow         | ⚠️     | Missing fields, duplicate creds
PostgreSQL Schema    | ⚠️     | Overcomplicated, ghost columns
Twitter Integration  | ✅     | Funciona bien
Reddit Integration   | ❌     | Creds duplicadas, incomplete
Alerts               | ⚠️     | Missing recipients tracking
Sentiment Analysis   | ✅     | Lógica bien, pero API needs fixes
```

---

## Recomendaciones

1. **NO HACER DEPLOY A PRODUCCIÓN** hasta arreglar al menos los 5 CRÍTICOS
2. **Testing**: Agregar tests para confidence_score y exception handling
3. **Monitoring**: Implementar alerting para workflow failures
4. **Documentation**: Crear runbooks para troubleshooting común
5. **Review**: Code review antes de siguiente release

---

## Estimated Effort

| Fase | Duración | Effort | Prioridad |
|------|----------|--------|-----------|
| Críticos | 1-2h | ⚡ Bajo | 🔴 |
| Altos | 1-2 días | 🔧 Medio | 🟠 |
| Moderados | 1-2 sprints | 📋 Alto | 🟡 |
| Documentación | 3-4h | 📝 Bajo | 🔵 |
| **TOTAL** | **~1 semana** | - | - |

---

**Generado**: 2026-04-22  
**Revisor**: Audit Report  
**Siguiente**: Implementar correcciones Fase 1
