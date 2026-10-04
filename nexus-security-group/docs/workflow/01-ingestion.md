# 01 — Ingesta

## Disparadores

- `Schedule Every 15 Minutes`: ejecución periódica cada 15 minutos.
- `Manual OSINT Trigger`: webhook manual para disparar la misma cadena.

Ambos disparadores alimentan las mismas tres fuentes.

## Fuentes configuradas

| Nodo | Fuente | Salida normalizada |
|------|--------|--------------------|
| `Hacker News API Search` | `https://hn.algolia.com/api/v1/search_by_date?...query=security` | historias HN con `platform = hackernews` |
| `Fetch Exploit-DB RSS` | `https://www.exploit-db.com/rss.xml` | entradas RSS con `platform = exploit-db` |
| `Fetch GitHub Security Issues` | GitHub Search API para issues con términos de seguridad | issues con `platform = github` |

## Parseo y normalización

- `Parse Items` toma `response.hits` de HN.
- `Parse RSS Items` procesa XML recibido por HTTP Request.
- `Parse GitHub Issues` toma `response.items` de GitHub.

Los parseadores preparan objetos con identificador externo, plataforma, texto, URL, fecha y metadata útil para análisis posterior.

## Merge y deduplicación

- `Merge HN + ExploitDB` une las primeras dos fuentes.
- `Merge All Sources` incorpora GitHub.
- `Deduplicate` elimina duplicados intra-ejecución por `(platform, external_id)`.
- `Prep Existing Check` construye una consulta compacta para detectar IDs ya persistidos.
- `Check Existing IDs` consulta PostgreSQL.
- `Filter Already Processed` elimina duplicados inter-ejecución.

La deduplicación definitiva también está protegida en DB por `unique_mention_per_platform` sobre `social_mentions(platform, external_id)`.

## Gate de datos nuevos

`Has New Items?` bifurca el flujo:

- Si hay items nuevos: continúa a análisis.
- Si no hay items nuevos: registra una ejecución exitosa con cero procesados mediante `Prep Log No Items` y `Log Execution (No Items)`.
