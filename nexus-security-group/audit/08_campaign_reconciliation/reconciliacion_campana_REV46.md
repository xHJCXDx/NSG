# Reconciliación de campaña REV46

**Fecha de generación:** 2026-10-04T17:03:09.922607+00:00  
**Criterio temporal:** `social_mentions.collected_at` entre `2026-09-25 18:48:00+00` y `2026-09-29 19:31:05.363840+00`.  
**Corte original REV45:** `2026-09-29 15:01:09.653599+00`.

## Decisión metodológica

Se adopta la ruta de **ampliar la ventana operacional** hasta cubrir la última recolección presente en la muestra histórica auditada y el log de ejecución que la contiene. Esta ruta conserva los 200 casos evaluados y evita modificar timestamps o reemplazar casos ya auditados.

## Resultado principal

| Marco | Menciones | Detecciones | Alertas asociadas | Ejecuciones |
|---|---:|---:|---:|---:|
| Corte original REV45 | 1.339 | 1.339 | no recalculado en este artefacto | 29 |
| Ventana ampliada REV46 | 2102 | 2102 | 1429 | 47 |

La muestra histórica contiene 200 casos. De ellos, 11 quedan fuera del corte original, pero los 200 quedan incluidos en la ventana ampliada REV46.

## Archivos congelados

| Archivo | Filas | SHA-256 |
|---|---:|---|
| `alertas_campana_REV46.csv` | 1429 | `0ce5bc8d652217c45625a49fdbf71db290412baead465edeb9e6a8c4737bf40a` |
| `consultas_reconciliacion_REV46.sql` | — | `3a98a7aa43582974387b05cac3db7e8668c648c287fd098fd9c889c5c18dcb10` |
| `detecciones_campana_REV46.csv` | 2102 | `e21be91dbae9da1e275748e18bd0eed8b0e18b3d5a35f9637b5ceafffb613e36` |
| `execution_logs_campana_REV46.csv` | 47 | `b541674d1b9b9d539aafb7785abfebaa28a85502297465893960ac8ff27ef545` |
| `incidencias_muestra_REV46.csv` | 200 | `882d13288a123010fee2f77deb7e845f7f2f2e1277e71ff3a9e22a93cff775a7` |
| `poblacion_campana_REV46.csv` | 2102 | `15c602da381012a841ce03ecdd9e788eac49b0557c8ca91e4fd4199d273bfe43` |
| `reconciliacion_campana_REV46.md` | — | `0dd9e865a6481bf65fb23d21f910a62c356cfa31f30a534569c3562b8ec64aa5` |

## Implicancias para la tesis

- No debe seguir presentándose `1.339 menciones` y `29 ejecuciones` como población final si se adopta REV46 ampliada.
- Las métricas poblacionales, porcentajes por fuente, alertas y fracciones de muestreo deben recalcularse con los nuevos denominadores.
- Los resultados históricos REV37/REV45 se preservan como evidencia previa, pero las conclusiones finales deben indicar el marco REV46 usado.
- El corpus de contraste debe cruzarse contra `poblacion_campana_REV46.csv`; no contra exports parciales de 200 casos.

## Reproducción

Las consultas usadas para contar y exportar la evidencia quedan documentadas en `consultas_reconciliacion_REV46.sql`. Los CSV y hashes de este directorio son el paquete congelado de evidencia REV46.

## Limitación

Estos exports fueron generados desde la base PostgreSQL actualmente disponible. A partir de este punto, los archivos y hashes de este directorio deben tratarse como el paquete congelado de evidencia REV46.
