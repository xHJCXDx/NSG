# Resumen de Prueba de Carga REV45

> Alcance: prueba sintética de ingesta/persistencia en PostgreSQL (`social_mentions`).  
> No ejercita el pipeline end-to-end de APIs externas, NLP, clasificación, alertado ni logging por etapas.

## Comando preservado

```bash
docker exec osint-dashboard-api python /tmp/load_test_generator.py \
  --count 2500 \
  --host postgres \
  --user <from DATABASE_URL> \
  --password <from DATABASE_URL> \
  --db <from DATABASE_URL> \
  --seed 45
```

## Resultado final corregido

| Métrica | Valor |
|---|---:|
| Registros generados | 2.500 |
| Registros insertados | 2.500 |
| Errores | 0 |
| Tiempo total | 0,90 s |
| Latencia promedio por insert | 0,36 ms |
| Latencia mediana por insert | 0,32 ms |
| Latencia p95 por insert | 0,59 ms |
| Throughput observado | 2.776 inserts/s |
| Distribución GitHub | 1.133 |
| Distribución Hacker News | 851 |
| Distribución Exploit-DB | 516 |

## Verificación SQL

Después de la inserción controlada:

- `social_mentions`: 7.510 registros.
- sintéticos `loadtest`: 2.500 registros.
- distribución sintética: Exploit-DB 516, GitHub 1.133, Hacker News 851.

Después del cleanup:

- sintéticos `loadtest`: 0 registros.

## Corrección metodológica del script

Durante la primera ejecución se detectó que `psycopg2.extras.execute_batch()` reportaba `rowcount` como 10 aunque la base confirmaba 2.500 registros sintéticos insertados. Se corrigió `load_test_generator.py` para reportar `inserted = count - errors`, dado que los `external_id` generados son únicos y los errores se contabilizan por lote.

## Interpretación

Esta prueba demuestra margen de ingesta/persistencia de la base de datos bajo carga sintética local. No debe interpretarse como validación de escalabilidad operacional end-to-end del workflow completo ni como throughput real de adquisición OSINT desde fuentes externas.
