# NSG Load Test — §9.3

Injects synthetic OSINT mentions into `social_mentions` to benchmark pipeline
ingestion throughput and per-record latency, as described in thesis §9.3.

## Requirements

```bash
pip install psycopg2-binary
```

## Usage

```bash
# Default: 2 500 mentions against localhost:5432/osint_db
python load_test_generator.py

# Custom count and host
python load_test_generator.py --count 5000 --host localhost --db osint_db

# Override credentials (or set PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE env vars)
python load_test_generator.py --user postgres --password secret

# Dry run: generate data, print distribution, skip DB writes
python load_test_generator.py --dry-run

# Remove all synthetic records created by this tool
python load_test_generator.py --cleanup

# Reproducible run (fixed random seed)
python load_test_generator.py --seed 42
```

## Source distribution

| Platform    | Weight |
|-------------|--------|
| GitHub      | 45 %   |
| HackerNews  | 35 %   |
| Exploit-DB  | 20 %   |

## Metrics reported

| Metric               | Description                                      |
|----------------------|--------------------------------------------------|
| Total time           | Wall-clock time for all inserts                  |
| Average latency      | Mean per-row insert time (ms)                    |
| Median latency       | p50 per-row insert time (ms)                     |
| p95 latency          | 95th-percentile per-row insert time (ms)         |
| Inserts/second       | Observed throughput                              |
| Projected/day        | `throughput × 86 400` (extrapolated capacity)    |

## Cleanup

Synthetic records are identified by the `loadtest` tag embedded in their
`external_id` column. Running `--cleanup` issues a single `DELETE … WHERE
external_id LIKE '%loadtest%'`, which is safe to run multiple times.
