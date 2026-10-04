# Resumen de Prueba Controlada REV45 — Falla Parcial de Fuente Hacker News

> Escenario: bloqueo temporal de `hn.algolia.com` dentro del contenedor `osint-n8n` mediante `/etc/hosts`.  
> Objetivo: verificar si la indisponibilidad de una fuente externa impide que el workflow procese datos de fuentes restantes.

## Procedimiento

1. Se preservaron conteos SQL iniciales y estado de contenedores.
2. Se reemplazó temporalmente la resolución de `hn.algolia.com` por `127.0.0.1` dentro de `osint-n8n`.
3. Se disparó manualmente el webhook `POST http://localhost:5678/webhook/osint-trigger`.
4. Se restauró `/etc/hosts`.
5. Se preservaron logs de n8n, consultas SQL posteriores y análisis de la ventana de falla.

## Evidencia preservada

| Archivo | Contenido |
|---|---|
| `docker_before.txt` | Estado de contenedores antes de la prueba. |
| `sql_before.txt` | Conteos SQL previos. |
| `trigger_with_hn_blocked.log` | Bloqueo temporal de Hacker News y disparo del workflow. |
| `sql_after.txt` | Ejecución registrada y conteos posteriores. |
| `sql_fault_window_analysis.txt` | Distribución por plataforma de registros insertados durante la ventana. |
| `n8n_logs_since_test.txt` | Logs de n8n durante el escenario. |

## Resultado cuantitativo

| Métrica | Valor |
|---|---:|
| Ejecución registrada | `execution_id = 134` |
| Estado registrado | `success` |
| Menciones recolectadas | 100 |
| Menciones nuevas procesadas | 28 |
| Detecciones generadas | 28 |
| Alertas generadas/candidatas | 0 |
| Registros insertados en ventana analizada | 28 |
| Plataformas observadas en ventana | GitHub: 28 |

## Interpretación metodológica

La prueba muestra que, con Hacker News bloqueado a nivel de resolución local del contenedor, el workflow completó la ejecución y procesó registros de una fuente restante. En la ventana analizada se insertaron 28 registros, todos de GitHub, lo que indica continuidad parcial del pipeline pese a la indisponibilidad simulada de una fuente externa.

Limitación: n8n no imprimió en logs un error explícito del nodo Hacker News durante la corrida capturada. Por eso, la afirmación debe limitarse a: bloqueo controlado del hostname de Hacker News, ejecución exitosa del workflow y procesamiento de registros provenientes de fuentes restantes. No demuestra tolerancia general ante fallas simultáneas de múltiples fuentes ni cobertura completa bajo degradación.
