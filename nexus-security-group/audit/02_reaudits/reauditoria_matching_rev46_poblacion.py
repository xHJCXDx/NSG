"""REV46 population-level keyword matching re-audit.

This script recalculates the keyword component of the REV46 population using
word-boundary matching over the frozen full text. It preserves the original
non-keyword score contribution by subtracting the original keyword points from
the original risk score and then adding the corrected keyword points.

This isolates the impact of the substring-matching issue without inventing
missing sentiment or engagement values.

Usage:
    python3 nexus-security-group/audit/02_reaudits/reauditoria_matching_rev46_poblacion.py
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


AUDIT_DIR = Path(__file__).resolve().parents[1]
RECONCILIATION_DIR = AUDIT_DIR / "08_campaign_reconciliation"
BASE_DIR = AUDIT_DIR / "02_reaudits"

POPULATION_CSV = RECONCILIATION_DIR / "poblacion_campana_REV46.csv"
DETECTIONS_CSV = RECONCILIATION_DIR / "detecciones_campana_REV46.csv"
OUTPUT_CSV = BASE_DIR / "Matriz_Reauditoria_Matching_REV46_Poblacion.csv"
OUTPUT_JSON = BASE_DIR / "metricas_reauditoria_matching_rev46_poblacion.json"
SUMMARY_MD = BASE_DIR / "resumen_reauditoria_matching_rev46_poblacion.md"


CRITICAL_KEYWORDS = {
    "ransomware": 30,
    "data breach": 30,
    "data leak": 30,
    "filtracion masiva": 30,
    "zero-day": 30,
    "0day": 30,
    "apt": 25,
    "supply chain attack": 30,
    "rce": 25,
    "remote code execution": 30,
}

HIGH_KEYWORDS = {
    "phishing": 20,
    "malware": 20,
    "exploit": 20,
    "vulnerabilidad critica": 20,
    "critical vulnerability": 20,
    "cve-": 20,
    "privilege escalation": 20,
    "compromised": 20,
    "comprometido": 20,
    "hacked": 20,
    "hackeado": 20,
    "backdoor": 20,
    "trojan": 20,
    "sql injection": 20,
    "xss": 15,
}

MEDIUM_KEYWORDS = {
    "attack": 10,
    "ataque": 10,
    "threat": 10,
    "amenaza": 10,
    "cyberattack": 15,
    "ciberataque": 15,
    "security": 5,
    "seguridad": 5,
    "incident": 10,
    "incidente": 10,
    "vulnerability": 10,
    "brute force": 10,
    "denial of service": 10,
    "ddos": 15,
}

KEYWORD_POINTS = CRITICAL_KEYWORDS | HIGH_KEYWORDS | MEDIUM_KEYWORDS


def to_int(value: str) -> int:
    try:
        return int(float(value or 0))
    except ValueError:
        return 0


def split_keywords(value: str) -> list[str]:
    raw = (value or "").strip()
    if not raw or raw == "{}":
        return []
    if raw.startswith("{") and raw.endswith("}"):
        raw = raw[1:-1]
    separator = "|" if "|" in raw else ","
    return [part.strip().strip('"').lower() for part in raw.split(separator) if part.strip()]


def boundary_match(text: str, keyword: str) -> bool:
    return re.search(r"\b" + re.escape(keyword) + r"\b", text) is not None


def criticality_from_score(score: int) -> str:
    if score >= 60:
        return "critical"
    if score >= 40:
        return "high"
    if score >= 20:
        return "medium"
    return "low"


def keyword_score(keywords: list[str]) -> int:
    return sum(KEYWORD_POINTS.get(keyword, 0) for keyword in keywords)


def corrected_keywords(text: str) -> list[str]:
    text = (text or "").lower()
    matched: list[str] = []
    for keyword in KEYWORD_POINTS:
        if boundary_match(text, keyword):
            matched.append(keyword)
    return matched


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pct(value: int, total: int) -> str:
    return f"{value / total * 100:.1f}%" if total else "0.0%"


def main() -> None:
    with POPULATION_CSV.open(newline="", encoding="utf-8") as file:
        population = {row["mention_id"]: row for row in csv.DictReader(file)}

    with DETECTIONS_CSV.open(newline="", encoding="utf-8") as file:
        detections = list(csv.DictReader(file))

    output_rows = []
    missing_population = 0

    for row in detections:
        mention = population.get(row["mention_id"])
        if not mention:
            missing_population += 1
            mention = {}

        original_keywords = split_keywords(row.get("matched_keywords", ""))
        original_keyword_score = keyword_score(original_keywords)
        original_score = to_int(row.get("risk_score", "0"))
        # Original scores are capped to 100 by the workflow. If the original
        # keyword points alone exceed the capped score, the residual non-keyword
        # contribution cannot be inferred as a negative value. Clamp to zero so
        # this remains an isolated keyword correction instead of inventing a
        # penalty that the workflow never applied.
        non_keyword_score = max(0, original_score - original_keyword_score)

        corrected = corrected_keywords(mention.get("text_content", ""))
        corrected_keyword_score = keyword_score(corrected)
        corrected_score = max(0, min(100, non_keyword_score + corrected_keyword_score))
        corrected_criticality = criticality_from_score(corrected_score)
        original_criticality = row.get("criticality_level", "")

        output_rows.append(
            {
                "detection_id": row.get("detection_id", ""),
                "mention_id": row.get("mention_id", ""),
                "platform": row.get("platform", ""),
                "external_id": row.get("external_id", ""),
                "collected_at": row.get("collected_at", ""),
                "text_content_length": len(mention.get("text_content", "")),
                "matched_keywords_original": "|".join(original_keywords),
                "keyword_score_original": original_keyword_score,
                "risk_score_original": original_score,
                "non_keyword_score_preserved": non_keyword_score,
                "criticality_original": original_criticality,
                "matched_keywords_corrected_word_boundary": "|".join(corrected),
                "keyword_score_corrected_word_boundary": corrected_keyword_score,
                "risk_score_corrected_word_boundary": corrected_score,
                "criticality_corrected_word_boundary": corrected_criticality,
                "criticality_changed_word_boundary": "sí"
                if corrected_criticality != original_criticality
                else "no",
                "alert_band_original": "sí"
                if original_criticality in {"critical", "high"}
                else "no",
                "alert_band_corrected_word_boundary": "sí"
                if corrected_criticality in {"critical", "high"}
                else "no",
                "removed_keywords_word_boundary": "|".join(
                    keyword for keyword in original_keywords if keyword not in corrected
                ),
                "added_keywords_word_boundary": "|".join(
                    keyword for keyword in corrected if keyword not in original_keywords
                ),
                "score_delta_word_boundary": corrected_score - original_score,
                "methodological_note": (
                    "Population-level REV46 recalculation isolating keyword matching: "
                    "original non-keyword score contribution is preserved, while "
                    "keyword matches are recalculated on text_content with word boundaries."
                ),
            }
        )

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(output_rows[0].keys()))
        writer.writeheader()
        writer.writerows(output_rows)

    total = len(output_rows)
    original_distribution = Counter(row["criticality_original"] for row in output_rows)
    corrected_distribution = Counter(
        row["criticality_corrected_word_boundary"] for row in output_rows
    )
    platform_corrected_alerts = Counter(
        row["platform"]
        for row in output_rows
        if row["alert_band_corrected_word_boundary"] == "sí"
    )
    platform_original_alerts = Counter(
        row["platform"] for row in output_rows if row["alert_band_original"] == "sí"
    )
    changed = sum(row["criticality_changed_word_boundary"] == "sí" for row in output_rows)
    original_alerts = sum(row["alert_band_original"] == "sí" for row in output_rows)
    corrected_alerts = sum(
        row["alert_band_corrected_word_boundary"] == "sí" for row in output_rows
    )
    dropped_from_alert_band = sum(
        row["alert_band_original"] == "sí"
        and row["alert_band_corrected_word_boundary"] == "no"
        for row in output_rows
    )
    added_to_alert_band = sum(
        row["alert_band_original"] == "no"
        and row["alert_band_corrected_word_boundary"] == "sí"
        for row in output_rows
    )
    rce_original = sum(
        "rce" in split_keywords(row["matched_keywords_original"]) for row in output_rows
    )
    rce_corrected = sum(
        "rce" in split_keywords(row["matched_keywords_corrected_word_boundary"])
        for row in output_rows
    )

    metrics = {
        "population": total,
        "missing_population_rows": missing_population,
        "criticality_changed": changed,
        "criticality_changed_pct": round(changed / total * 100, 1),
        "original_alert_band": original_alerts,
        "corrected_alert_band": corrected_alerts,
        "dropped_from_alert_band": dropped_from_alert_band,
        "added_to_alert_band": added_to_alert_band,
        "rce_original": rce_original,
        "rce_corrected_word_boundary": rce_corrected,
        "original_distribution": dict(original_distribution),
        "corrected_distribution": dict(corrected_distribution),
        "original_alerts_by_platform": dict(platform_original_alerts),
        "corrected_alerts_by_platform": dict(platform_corrected_alerts),
        "sha256": {OUTPUT_CSV.name: sha256(OUTPUT_CSV)},
        "method": (
            "Isolated keyword-matching recalculation: preserve original non-keyword "
            "risk-score contribution and recalculate keyword points over frozen "
            "REV46 text_content using word-boundary matching."
        ),
    }
    OUTPUT_JSON.write_text(json.dumps(metrics, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    summary = f"""# Re-auditoría REV46 — Matching por límite de palabra en población completa

## Qué se recalcula

Este artefacto recalcula el componente de keywords de las **2.102 detecciones REV46** usando `text_content` completo y matching por límite de palabra. Para evitar inventar campos no congelados en la evidencia REV46, preserva el aporte no-keyword del score original:

`score_corregido = max(0, risk_score_original - puntos_keywords_originales) + puntos_keywords_corregidos`

El `max(0, ...)` evita inventar aportes negativos cuando el score original ya estaba capado a 100 y los puntos de keywords originales superaban ese valor.

Por lo tanto, el resultado mide el impacto aislado de corregir el matching por subcadena, no una nueva campaña operacional ni una nueva auditoría humana.

## Resultado cuantitativo

| Métrica | Valor |
|---|---:|
| Detecciones REV46 procesadas | {total} |
| Registros sin población asociada | {missing_population} |
| Cambios de nivel de criticidad | {changed} ({pct(changed, total)}) |
| Detecciones en banda alertable original (`high`/`critical`) | {original_alerts} ({pct(original_alerts, total)}) |
| Detecciones en banda alertable corregida (`high`/`critical`) | {corrected_alerts} ({pct(corrected_alerts, total)}) |
| Salen de banda alertable con matching corregido | {dropped_from_alert_band} |
| Entran a banda alertable con matching corregido | {added_to_alert_band} |
| Registros con `rce` original | {rce_original} |
| Registros con `rce` confirmado con límite de palabra | {rce_corrected} |

## Distribución de criticidad

| Criticidad | Original REV46 | Corregida word-boundary |
|---|---:|---:|
| Critical | {original_distribution.get('critical', 0)} | {corrected_distribution.get('critical', 0)} |
| High | {original_distribution.get('high', 0)} | {corrected_distribution.get('high', 0)} |
| Medium | {original_distribution.get('medium', 0)} | {corrected_distribution.get('medium', 0)} |
| Low | {original_distribution.get('low', 0)} | {corrected_distribution.get('low', 0)} |

## Banda alertable por fuente

| Fuente | Alertable original | Alertable corregida |
|---|---:|---:|
| github | {platform_original_alerts.get('github', 0)} | {platform_corrected_alerts.get('github', 0)} |
| hackernews | {platform_original_alerts.get('hackernews', 0)} | {platform_corrected_alerts.get('hackernews', 0)} |
| exploit-db | {platform_original_alerts.get('exploit-db', 0)} | {platform_corrected_alerts.get('exploit-db', 0)} |

## Interpretación metodológica

El recálculo muestra cuánto depende la criticidad poblacional de keywords detectadas por subcadena, especialmente `rce`. La caída de la banda alertable debe interpretarse como reducción de ruido inducido por matching laxo. No valida severidad operacional independiente y no reemplaza una campaña nueva con el workflow corregido ejecutándose de punta a punta.

## Artefactos

- Resultado fila a fila: `Matriz_Reauditoria_Matching_REV46_Poblacion.csv`.
- Métricas estructuradas: `metricas_reauditoria_matching_rev46_poblacion.json`.
- SHA-256 CSV: `{metrics['sha256'][OUTPUT_CSV.name]}`.
"""
    SUMMARY_MD.write_text(summary, encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
