# Resumen de Prueba Controlada REV45 — Fallo de Entrega de Alerta Slack

> Escenario: bloqueo temporal de `hooks.slack.com` dentro del contenedor `osint-n8n` mediante `/etc/hosts`.  
> Objetivo: verificar si la falla de un canal de notificación impide completar el workflow o persistir alertas en base de datos.

## Procedimiento

1. Se preservaron conteos SQL iniciales y estado de contenedores.
2. Se identificó el hostname de Slack sin exponer el webhook completo: `hooks.slack.com`.
3. Se modificó temporalmente `/etc/hosts` dentro de `osint-n8n` para resolver `hooks.slack.com` a `127.0.0.1`.
4. Se disparó manualmente el webhook `POST http://localhost:5678/webhook/osint-trigger`.
5. Se restauró `/etc/hosts`.
6. Se preservaron logs de n8n y consultas SQL posteriores.
7. Se verificó adicionalmente con `node:dns.lookup()` que, bajo el bloqueo, `hooks.slack.com` resolvía a `127.0.0.1`.

## Evidencia preservada

| Archivo | Contenido |
|---|---|
| `docker_before.txt` | Estado de contenedores antes de la prueba. |
| `sql_before.txt` | Conteos SQL previos. |
| `slack_hostname.txt` | Hostname de Slack identificado sin exponer secreto. |
| `trigger_with_slack_blocked.log` | Primera ejecución con Slack bloqueado. |
| `trigger_with_slack_blocked_verified.log` | Ejecución verificada con Slack bloqueado. |
| `slack_dns_block_verification.log` | Prueba de resolución `hooks.slack.com -> 127.0.0.1`. |
| `sql_after_verified.txt` | Ejecución registrada y conteos posteriores. |
| `n8n_logs_since_verified_test.txt` | Logs de n8n capturados durante la prueba. |

## Resultado cuantitativo principal

| Métrica | Valor |
|---|---:|
| Ejecución registrada | `execution_id = 133` |
| Estado registrado | `success` |
| Menciones recolectadas | 100 |
| Menciones nuevas procesadas | 27 |
| Detecciones generadas | 27 |
| Alertas generadas/candidatas | 1 |
| Alerts total antes de ejecución verificada | 2.762 |
| Alerts total después de ejecución verificada | 2.763 |

## Interpretación metodológica

La prueba muestra que, con Slack bloqueado a nivel de resolución local del contenedor, el workflow completó la ejecución, procesó menciones, generó detecciones y persistió una alerta en la base de datos. Esto respalda tolerancia ante falla de un canal de notificación, porque la persistencia interna no dependió del éxito de entrega por Slack.

Limitación: n8n no imprimió en logs un error explícito del nodo Slack durante la corrida capturada. Por eso, la afirmación debe limitarse a: bloqueo controlado del hostname de Slack, continuidad del workflow y persistencia de alerta en base de datos. No se afirma entrega fallida observada por Slack ni tolerancia universal de todos los canales de alertado.
