# Tiempo por mención y llegada por fuente (REV76, T-M2)

Fecha de las consultas: 13/11/2026. Datos: las ejecuciones de la corrida funcional y de los escenarios manuales de A8 (13/11/2026, 16:12–19:15 UTC), sobre el commit `b0c76dd`, cuyo código es idéntico al de la etiqueta `entrega-REV76` (`fdb5637`). Estos archivos se agregaron después de la etiqueta y no cambian código.

Las consultas son de solo lectura. Las salidas se copian sin editar.

| Consulta | Base | Salida |
|---|---|---|
| `n8n_duracion.sql` | `n8n_internal`, tabla `execution_entity` (registro propio de n8n) | `n8n_duracion_resultado.txt` |
| `registro_ejecuciones.sql` | `osint_db`, tabla `execution_logs` | `registro_ejecuciones_resultado.txt` |
| `llegada_por_fuente.sql` | `osint_db`, tabla `social_mentions` | `llegada_por_fuente_resultado.txt` |

## Tiempo por ejecución y por mención

`execution_logs.duration_seconds` no sirve: el inicio se graba al final y la duración da 0 (ver `escenarios.md`, E09). Se usa la duración que registra n8n (`stoppedAt − startedAt`), dividida por `mentions_processed` de la misma ejecución (`execution_logs.execution_id` = `execution_entity.id`).

Se excluyen 7 de las 19 ejecuciones:

| Ejecución (n8n) | Motivo |
|---|---|
| 3 y 4 | Disparo doble simultáneo (E09): comparten la ventana y el tiempo |
| 7 | Falla inyectada en las detecciones (E08) |
| 17 | Slack colgado: espera de 300 s (E11) |
| 18 | También ~300 s de espera; se supone la misma causa (el servidor de E11 seguía configurado), pero no se verificó |
| 9 y 11 | Sin menciones nuevas (6,3 s y 10,3 s): costo fijo de la ejecución, sin procesamiento |

Resultado de las 12 restantes (1, 2, 5, 6, 8, 10, 12, 13, 14, 15, 16 y 19):

| Medida | Valor |
|---|---|
| Duración por ejecución | 8,7 a 21,2 s (mediana 16,1 s) |
| Tiempo por mención | 0,108 a 0,544 s (mediana 0,349 s) |
| Total | 188,2 s para 624 menciones: 0,302 s por mención |

Es una cota superior del tiempo por mención: incluye la espera de las tres fuentes externas y el costo fijo de la ejecución. En estas 12 ejecuciones, `mentions_processed` coincide con las menciones que quedaron guardadas en la base (`llegada_por_fuente_resultado.txt`).

## Llegada por fuente

Menciones guardadas por minuto y fuente (`collected_at`), sin las filas sintéticas `rev76-*`. La primera ejecución (16:12) llena la base vacía con 50 por fuente. Después:

| Fuente | Menciones nuevas por ejecución | Intervalo entre ejecuciones |
|---|---|---|
| Exploit-DB | 0 | 3 a 30 min |
| Hacker News | 0 a 2 | 3 a 30 min |
| GitHub | 38 a 46 | 3 a 30 min |

- La fila de las 16:27 suma las ejecuciones 3 y 4 (E09); entre las dos guardaron 44.
- La ejecución 17 (18:45, E11) no guardó ninguna mención, aunque su registro informa 47: el contador sale del flujo (AD-85).
- GitHub aporta casi el tope de 50 con cualquier intervalo, de 3 a 30 minutos. La cantidad no depende del tiempo transcurrido, así que no mide la llegada: la ventana de GitHub está cerca de la saturación y su tasa de llegada real no se puede estimar con esta ventana (§8.3.1, AD-93). En Hacker News y Exploit-DB la ventana de 50 sobra.

Son observaciones de una corrida de tres horas, no mediciones operativas sostenidas.
