#!/usr/bin/env python3
"""
NSG Load Test Generator — §9.3
==============================

Generates synthetic OSINT mentions and injects them into the ``social_mentions``
table to measure pipeline ingestion throughput and latency.

Default configuration (§9.3):
  - 2 500 synthetic records
  - Source distribution: GitHub 45 %, HackerNews 35 %, Exploit-DB 20 %
  - Realistic cybersecurity content (titles, keywords, engagement metrics)
  - Timestamps spread across a configurable look-back window (default: 30 days)

Usage
-----
  # Basic run (2 500 mentions, localhost, default creds)
  python load_test_generator.py

  # Custom count and database
  python load_test_generator.py --count 5000 --host db.example.com --db osint_db

  # Remove synthetic data after the test
  python load_test_generator.py --cleanup

  # Dry-run: generate and print stats without touching the database
  python load_test_generator.py --dry-run

Environment variables (override CLI defaults):
  PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

Dependencies: stdlib + psycopg2 (pip install psycopg2-binary)
"""

from __future__ import annotations

import argparse
import os
import random
import statistics
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print(
        "ERROR: psycopg2 is required.\n"
        "Install it with:  pip install psycopg2-binary",
        file=sys.stderr,
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Synthetic content corpora
# ---------------------------------------------------------------------------

_TITLES_GITHUB: list[str] = [
    "PoC exploit released for CVE-2024-{n} — critical RCE in OpenSSL",
    "New ransomware decryptor tool published (LockBit 3.0)",
    "Automated phishing kit targeting OAuth2 flows",
    "CVE-2024-{n}: heap overflow in libpng 1.6.x — CVSS 9.8",
    "Cobalt Strike beacon configuration extractor",
    "BlueTeamLabs: YARA rules for detecting IcedID loader",
    "Proof-of-concept for privilege escalation in Linux kernel 6.x",
    "Mass exploitation of CVE-2024-{n} observed in the wild",
    "Malware analysis: AsyncRAT variant with persistence via registry",
    "SSRF-to-RCE chain in popular SaaS middleware",
    "Subdomain takeover automation tool — HackerOne bounty ready",
    "Shellcode loader evading Windows Defender — detailed writeup",
    "New Python-based C2 framework using Telegram as transport",
    "CVE-{n}: SQL injection in widely-used ORM library",
    "Reverse engineered: QakBot loader dropper mechanism",
    "XSS chain leading to account takeover in fortune-500 app",
    "Lateral movement via DCOM — living-off-the-land technique",
    "Leaked credentials dump scanner (credential stuffing ready)",
    "Active directory certificate services (ADCS) ESC8 exploit",
    "Web application firewall bypass techniques — 2024 edition",
]

_TITLES_HACKERNEWS: list[str] = [
    "Ask HN: How to protect against the latest phishing campaigns?",
    "Show HN: Open-source honeypot for detecting CVE-2024-{n} scans",
    "Major data breach at cloud provider — 50M records exposed",
    "Zero-day in popular VPN client actively exploited by APT group",
    "Why your password manager might be leaking your master key",
    "The state of ransomware in 2024: payments hit record $1.1B",
    "Researchers discover supply-chain attack in npm ecosystem",
    "Bypassing 2FA with reverse proxy phishing kits",
    "New OSINT technique reveals attacker infrastructure before attack",
    "Post-mortem: how attackers exfiltrated 1TB before detection",
    "Practical guide to threat hunting with Sigma rules",
    "BGP hijacking used to intercept cryptocurrency transactions",
    "Darknet market shutdown exposes 300k user records",
    "CVE-2024-{n}: patch Tuesday brings critical fixes for Windows",
    "How LLMs are being used to generate more convincing phishing",
    "Insider threat: ex-employee accessed production database for 6 months",
    "Critical vulnerability in industrial SCADA system — no patch yet",
    "Supply chain attack via compromised open-source dependency",
    "Attackers targeting cloud metadata API to steal IAM credentials",
    "New technique: exfiltrating data via DNS over HTTPS",
]

_TITLES_EXPLOITDB: list[str] = [
    "Apache HTTP Server 2.4.{n} - Remote Code Execution",
    "WordPress Plugin 'ContactForm7' {n}.x - SQL Injection",
    "OpenSSH 9.{n} - Username Enumeration (CVE-2024-{n})",
    "Microsoft Exchange Server - SSRF to RCE (CVE-2024-{n})",
    "Cisco IOS XE {n}.x - Unauthenticated Remote Code Execution",
    "Fortinet FortiGate SSL VPN - Authentication Bypass",
    "Ivanti Connect Secure - Stack-Based Buffer Overflow",
    "VMware vCenter Server 8.{n} - Arbitrary File Upload",
    "GitLab CE/EE {n}.0 - Remote Code Execution via YAML deserialization",
    "Confluence Server 8.{n} - OGNL Injection (Unauthenticated RCE)",
    "F5 BIG-IP iControl REST - Unauthenticated RCE (CVE-2024-{n})",
    "Palo Alto PAN-OS {n}.x - OS Command Injection",
    "Juniper Junos OS {n}.x - Authentication Bypass via J-Web",
    "SolarWinds Platform {n}.x - Deserialization of Untrusted Data",
    "Progress MOVEit Transfer - SQL Injection (CVE-2024-{n})",
    "Citrix ADC and Gateway - Out-of-Bounds Memory Read",
    "Barracuda ESG {n}.x - Arbitrary Command Injection",
    "ManageEngine ServiceDesk Plus {n}.x - XXE Injection",
    "Zoho ManageEngine ADAudit Plus {n}.x - Unauthenticated RCE",
    "Atlassian Bamboo {n}.x - Remote Code Execution",
]

_DESCRIPTIONS_GITHUB: list[str] = [
    "This repository contains a fully working proof-of-concept exploit for {kw} "
    "affecting systems running the vulnerable version. Tested on Ubuntu 22.04 LTS.",
    "Automated scanner for {kw} detection. Supports mass-scanning mode and "
    "exports results to JSON/CSV for further analysis.",
    "Comprehensive analysis of {kw} including IOCs, YARA rules, and "
    "Sigma detections for SIEM integration.",
    "Research into recent {kw} campaigns: infrastructure mapping, TTP breakdown, "
    "and defensive recommendations with code samples.",
    "Tools for threat hunters: {kw} detection scripts, memory forensics helpers, "
    "and automated triage pipeline.",
]

_DESCRIPTIONS_HACKERNEWS: list[str] = [
    "Security researchers have identified a critical {kw} vulnerability that could "
    "affect millions of devices worldwide. The patch is expected within 72 hours.",
    "A large-scale {kw} campaign was observed targeting financial institutions. "
    "Indicators of compromise have been shared with CISA.",
    "Discussion thread on the latest {kw} techniques being used by threat actors "
    "and how blue teams can detect and respond.",
    "Interesting read on how modern {kw} attacks chain multiple vulnerabilities "
    "to achieve full system compromise with minimal detection footprint.",
    "The researchers' analysis of {kw} reveals a sophisticated attacker leveraging "
    "legitimate cloud services to blend in with normal traffic.",
]

_DESCRIPTIONS_EXPLOITDB: list[str] = [
    "A {kw} vulnerability exists in the affected software version. An unauthenticated "
    "attacker can exploit this to execute arbitrary code on the target system.",
    "The {kw} flaw allows a remote attacker to bypass authentication and gain "
    "administrative access. No user interaction is required.",
    "Exploiting this {kw} vulnerability requires only network access to the "
    "management interface. CVSS v3 base score: 9.8 (Critical).",
    "This {kw} issue stems from improper input validation in the web interface. "
    "Attackers can inject malicious payloads leading to server-side code execution.",
    "A {kw} condition in the API endpoint allows an attacker to craft a request "
    "that triggers memory corruption and results in arbitrary code execution.",
]

_KEYWORDS: list[str] = [
    "ransomware",
    "CVE",
    "exploit",
    "phishing",
    "malware",
    "zero-day",
    "data breach",
    "vulnerability",
    "RCE",
    "SQL injection",
    "XSS",
    "SSRF",
    "privilege escalation",
    "supply chain attack",
    "APT",
    "Cobalt Strike",
    "credential stuffing",
    "OSINT",
    "threat intelligence",
    "lateral movement",
]

_AUTHOR_PREFIXES: list[str] = [
    "sec", "cyber", "infosec", "hacker", "researcher",
    "threat", "blue", "red", "osint", "vuln", "exploit",
]

_AUTHOR_SUFFIXES: list[str] = [
    "hunter", "analyst", "watch", "labs", "intel",
    "team", "ops", "ninja", "hawk", "tracker",
]

# Platform → (platform_name, author_prefix, external_id_prefix)
_PLATFORM_CONFIG: dict[str, dict[str, Any]] = {
    "github": {
        "platform": "github",
        "titles": _TITLES_GITHUB,
        "descriptions": _DESCRIPTIONS_GITHUB,
        "ext_prefix": "gh",
        "weight": 0.45,
        "verified_rate": 0.3,
        "follower_range": (50, 15_000),
        "likes_range": (0, 500),
        "shares_range": (0, 200),
        "replies_range": (0, 100),
    },
    "hackernews": {
        "platform": "hackernews",
        "titles": _TITLES_HACKERNEWS,
        "descriptions": _DESCRIPTIONS_HACKERNEWS,
        "ext_prefix": "hn",
        "weight": 0.35,
        "verified_rate": 0.1,
        "follower_range": (0, 5_000),
        "likes_range": (0, 2_000),
        "shares_range": (0, 50),
        "replies_range": (0, 300),
    },
    "exploit-db": {
        "platform": "exploit-db",
        "titles": _TITLES_EXPLOITDB,
        "descriptions": _DESCRIPTIONS_EXPLOITDB,
        "ext_prefix": "edb",
        "weight": 0.20,
        "verified_rate": 0.5,
        "follower_range": (0, 1_000),
        "likes_range": (0, 100),
        "shares_range": (0, 50),
        "replies_range": (0, 20),
    },
}

_PLATFORMS_ORDERED = list(_PLATFORM_CONFIG.keys())
_PLATFORM_WEIGHTS = [_PLATFORM_CONFIG[p]["weight"] for p in _PLATFORMS_ORDERED]

# Tag used in external_id to identify synthetic records for cleanup
_LOAD_TEST_TAG = "loadtest"


# ---------------------------------------------------------------------------
# Mention generation
# ---------------------------------------------------------------------------

def _rand_author() -> str:
    prefix = random.choice(_AUTHOR_PREFIXES)
    suffix = random.choice(_AUTHOR_SUFFIXES)
    num = random.randint(0, 9999)
    return f"{prefix}_{suffix}{num}"


def _rand_cve_n() -> int:
    return random.randint(10000, 59999)


def _build_text(cfg: dict[str, Any], keyword: str) -> str:
    title_template = random.choice(cfg["titles"])
    desc_template = random.choice(cfg["descriptions"])
    n = _rand_cve_n()
    title = title_template.format(n=n, kw=keyword)
    desc = desc_template.format(kw=keyword)
    return f"{title}\n\n{desc}"


def generate_mention(
    platform_key: str,
    window_start: datetime,
    window_end: datetime,
) -> dict[str, Any]:
    """Return a dict with all columns for ``social_mentions``."""
    cfg = _PLATFORM_CONFIG[platform_key]
    keyword = random.choice(_KEYWORDS)
    text = _build_text(cfg, keyword)

    # Spread created_at randomly within the window
    total_seconds = int((window_end - window_start).total_seconds())
    offset_seconds = random.randint(0, max(total_seconds - 1, 0))
    created_at = window_start + timedelta(seconds=offset_seconds)
    collected_at = created_at + timedelta(seconds=random.randint(5, 300))

    # Unique external_id using the load-test tag so cleanup is reliable
    ext_id = f"{cfg['ext_prefix']}_{_LOAD_TEST_TAG}_{uuid.uuid4().hex[:16]}"

    author = _rand_author()
    verified = random.random() < cfg["verified_rate"]
    followers = random.randint(*cfg["follower_range"])

    likes = random.randint(*cfg["likes_range"])
    shares = random.randint(*cfg["shares_range"])
    replies = random.randint(*cfg["replies_range"])

    # 30 % chance of having a URL
    urls: list[str] = []
    if random.random() < 0.3:
        domain = random.choice(["github.com", "exploit-db.com", "news.ycombinator.com"])
        urls.append(f"https://{domain}/{uuid.uuid4().hex[:8]}")

    # 50 % chance of hashtags (cybersec flavour)
    hashtags: list[str] = []
    if random.random() < 0.5:
        hashtags = random.sample(
            ["#cybersecurity", "#infosec", "#CVE", "#malware", "#ransomware",
             "#threatintel", "#osint", "#zeroday", "#exploit", "#phishing"],
            k=random.randint(1, 3),
        )

    return {
        "platform": cfg["platform"],
        "external_id": ext_id,
        "text_content": text,
        "language": "en",
        "created_at": created_at,
        "collected_at": collected_at,
        "author_username": author,
        "author_id": f"{cfg['ext_prefix']}_{uuid.uuid4().hex[:12]}",
        "author_verified": verified,
        "author_followers_count": followers,
        "author_description": f"Security researcher focused on {keyword}",
        "likes_count": likes,
        "shares_count": shares,
        "replies_count": replies,
        "views_count": random.randint(0, likes * 10 + 1),
        "urls": urls,
        "hashtags": hashtags,
        "mentions": [],
        "has_media": random.random() < 0.05,
        "is_reply": False,
        "is_quote": False,
        "raw_data": None,
        "processing_status": "pending",
    }


def generate_batch(
    count: int,
    window_days: int = 30,
) -> list[dict[str, Any]]:
    """Generate ``count`` mentions using the configured platform distribution."""
    now = datetime.now(tz=timezone.utc)
    window_start = now - timedelta(days=window_days)

    platforms = random.choices(_PLATFORMS_ORDERED, weights=_PLATFORM_WEIGHTS, k=count)
    return [generate_mention(p, window_start, now) for p in platforms]


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

_INSERT_SQL = """
INSERT INTO social_mentions (
    platform, external_id, text_content, language,
    created_at, collected_at,
    author_username, author_id, author_verified, author_followers_count,
    author_description,
    likes_count, shares_count, replies_count, views_count,
    urls, hashtags, mentions,
    has_media, is_reply, is_quote,
    raw_data, processing_status
) VALUES (
    %(platform)s, %(external_id)s, %(text_content)s, %(language)s,
    %(created_at)s, %(collected_at)s,
    %(author_username)s, %(author_id)s, %(author_verified)s, %(author_followers_count)s,
    %(author_description)s,
    %(likes_count)s, %(shares_count)s, %(replies_count)s, %(views_count)s,
    %(urls)s, %(hashtags)s, %(mentions)s,
    %(has_media)s, %(is_reply)s, %(is_quote)s,
    %(raw_data)s, %(processing_status)s
)
ON CONFLICT (platform, external_id) DO NOTHING
"""

_CLEANUP_SQL = """
DELETE FROM social_mentions
WHERE external_id LIKE %s
"""


def connect(host: str, port: int, user: str, password: str, dbname: str):
    """Open and return a psycopg2 connection."""
    return psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname=dbname,
    )


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_report(
    count: int,
    inserted: int,
    errors: int,
    latencies_ms: list[float],
    total_elapsed_s: float,
    platform_counts: dict[str, int],
) -> None:
    avg_ms = statistics.mean(latencies_ms) if latencies_ms else 0.0
    median_ms = statistics.median(latencies_ms) if latencies_ms else 0.0
    p95_ms = (
        sorted(latencies_ms)[int(len(latencies_ms) * 0.95)]
        if len(latencies_ms) >= 20
        else max(latencies_ms, default=0.0)
    )
    throughput = inserted / total_elapsed_s if total_elapsed_s > 0 else 0.0
    daily_extrapolation = int(throughput * 86_400)

    print("\n" + "=" * 60)
    print("  NSG LOAD TEST — RESULTS")
    print("=" * 60)
    print(f"  Generated      : {count:>8,} mentions")
    print(f"  Inserted       : {inserted:>8,}")
    print(f"  Errors         : {errors:>8,}")
    print()
    print("  Platform distribution:")
    for platform, n in sorted(platform_counts.items()):
        pct = n / count * 100 if count else 0
        print(f"    {platform:<15}: {n:>6,}  ({pct:5.1f} %)")
    print()
    print("  Timing (per insert):")
    print(f"    Average latency: {avg_ms:>8.2f} ms")
    print(f"    Median latency : {median_ms:>8.2f} ms")
    print(f"    p95 latency    : {p95_ms:>8.2f} ms")
    print()
    print("  Throughput:")
    print(f"    Total time     : {total_elapsed_s:>8.2f} s")
    print(f"    Inserts/second : {throughput:>8.1f}")
    print(f"    Projected/day  : {daily_extrapolation:>8,} mentions/day")
    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="NSG load test — inject synthetic OSINT mentions into social_mentions",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--count", type=int, default=2500, help="Number of mentions to generate")
    p.add_argument("--window-days", type=int, default=30,
                   help="Spread created_at timestamps over this many past days")
    p.add_argument("--batch-size", type=int, default=250,
                   help="Rows per executemany call (tune for memory vs speed)")
    p.add_argument("--host", default=os.getenv("PGHOST", "localhost"),
                   help="PostgreSQL host")
    p.add_argument("--port", type=int, default=int(os.getenv("PGPORT", "5432")),
                   help="PostgreSQL port")
    p.add_argument("--user", default=os.getenv("PGUSER", "postgres"),
                   help="PostgreSQL user")
    p.add_argument("--password", default=os.getenv("PGPASSWORD", ""),
                   help="PostgreSQL password")
    p.add_argument("--db", default=os.getenv("PGDATABASE", "osint_db"),
                   help="Database name")
    p.add_argument("--cleanup", action="store_true",
                   help="Delete all synthetic records inserted by this tool and exit")
    p.add_argument("--dry-run", action="store_true",
                   help="Generate data and print stats, skip database insertion")
    p.add_argument("--seed", type=int, default=None,
                   help="Random seed for reproducible test runs")
    return p


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_cleanup(conn, args: argparse.Namespace) -> None:
    pattern = f"%{_LOAD_TEST_TAG}%"
    with conn.cursor() as cur:
        cur.execute(_CLEANUP_SQL, (pattern,))
        deleted = cur.rowcount
    conn.commit()
    print(f"Cleanup complete — {deleted:,} synthetic mentions removed.")


def run_load_test(conn, args: argparse.Namespace) -> None:
    count: int = args.count
    batch_size: int = args.batch_size
    window_days: int = args.window_days

    print(f"Generating {count:,} synthetic mentions (window: {window_days} days)…")
    gen_start = time.perf_counter()
    mentions = generate_batch(count, window_days)
    gen_elapsed = time.perf_counter() - gen_start
    print(f"Generation done in {gen_elapsed:.2f} s — starting insertion…\n")

    # Count per platform for reporting
    platform_counts: dict[str, int] = {}
    for m in mentions:
        platform_counts[m["platform"]] = platform_counts.get(m["platform"], 0) + 1

    inserted = 0
    errors = 0
    latencies_ms: list[float] = []

    total_start = time.perf_counter()

    with conn.cursor() as cur:
        for batch_start in range(0, count, batch_size):
            batch = mentions[batch_start : batch_start + batch_size]
            t0 = time.perf_counter()
            try:
                psycopg2.extras.execute_batch(cur, _INSERT_SQL, batch, page_size=batch_size)
                conn.commit()
                elapsed_ms = (time.perf_counter() - t0) * 1000
                per_row_ms = elapsed_ms / len(batch)
                latencies_ms.extend([per_row_ms] * len(batch))
                inserted += cur.rowcount if cur.rowcount >= 0 else len(batch)
            except Exception as exc:  # noqa: BLE001
                conn.rollback()
                errors += len(batch)
                print(f"  [ERROR] batch {batch_start}–{batch_start + len(batch)}: {exc}",
                      file=sys.stderr)

            done = min(batch_start + batch_size, count)
            pct = done / count * 100
            print(f"  Progress: {done:>6,}/{count:,} ({pct:5.1f} %)  "
                  f"errors={errors}", end="\r")

    total_elapsed = time.perf_counter() - total_start
    print()  # newline after \r progress

    # psycopg2 execute_batch rowcount is not always reliable across PG versions;
    # use count - errors as a safe lower bound.
    if inserted == 0 or inserted > count:
        inserted = count - errors

    print_report(count, inserted, errors, latencies_ms, total_elapsed, platform_counts)


def dry_run(args: argparse.Namespace) -> None:
    count: int = args.count
    window_days: int = args.window_days

    print(f"DRY RUN — generating {count:,} mentions (no DB writes)…")
    t0 = time.perf_counter()
    mentions = generate_batch(count, window_days)
    elapsed = time.perf_counter() - t0

    platform_counts: dict[str, int] = {}
    for m in mentions:
        platform_counts[m["platform"]] = platform_counts.get(m["platform"], 0) + 1

    print(f"\nGenerated {count:,} mentions in {elapsed:.2f} s")
    print("\nPlatform distribution:")
    for platform, n in sorted(platform_counts.items()):
        pct = n / count * 100
        print(f"  {platform:<15}: {n:>6,}  ({pct:5.1f} %)")
    print("\n[DRY RUN] No records written to the database.")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    if args.dry_run:
        dry_run(args)
        return

    print(f"Connecting to {args.user}@{args.host}:{args.port}/{args.db}…")
    try:
        conn = connect(args.host, args.port, args.user, args.password, args.db)
    except psycopg2.OperationalError as exc:
        print(f"ERROR: Could not connect to PostgreSQL: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        if args.cleanup:
            run_cleanup(conn, args)
        else:
            run_load_test(conn, args)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
