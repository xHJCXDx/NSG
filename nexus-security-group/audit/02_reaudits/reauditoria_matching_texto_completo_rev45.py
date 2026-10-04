"""REV45 full-text complementary re-audit for keyword matching.

This script joins the historical audit matrix with a PostgreSQL export of the
full social_mentions fields and recalculates threat score using the current
word-boundary matching behavior from workflow.json.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path
from urllib.parse import urlparse


BASE_DIR = Path(__file__).resolve().parent
AUDIT_DIR = BASE_DIR.parent
MATRIX_CSV = AUDIT_DIR / "01_historical_audit" / "Matriz_Auditoria_Fase2_REV37.csv"
FEATURES_CSV = BASE_DIR / "social_mentions_full_features_REV45.csv"
OUTPUT_CSV = BASE_DIR / "Matriz_Reauditoria_Matching_REV45_Texto_Completo.csv"
SUMMARY_MD = BASE_DIR / "resumen_reauditoria_matching_rev45_texto_completo.md"


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


def to_int(value: str) -> int:
    try:
        return int(float(value or 0))
    except ValueError:
        return 0


def to_bool(value: str) -> bool:
    return str(value or "").strip().lower() in {"true", "t", "1", "yes", "y"}


def split_keywords(value: str) -> list[str]:
    return [part.strip().lower() for part in (value or "").split("|") if part.strip()]


def parse_pg_text_array(value: str) -> list[str]:
    raw = (value or "").strip()
    if not raw or raw == "{}":
        return []
    if raw.startswith("{") and raw.endswith("}"):
        raw = raw[1:-1]
    # URLs in this export are simple enough for comma splitting; strip PG quotes.
    return [part.strip().strip('"') for part in raw.split(",") if part.strip()]


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


def classify(row: dict[str, str], features: dict[str, str]) -> tuple[list[str], int, str]:
    text = (features.get("text_content") or "").lower()
    score = 0
    matched: list[str] = []

    for keywords in (CRITICAL_KEYWORDS, HIGH_KEYWORDS, MEDIUM_KEYWORDS):
        for keyword, points in keywords.items():
            if boundary_match(text, keyword):
                score += points
                matched.append(keyword)

    if (row.get("sentiment_label") or "").lower() == "negative":
        score += 15

    total_engagement = (
        to_int(features.get("likes_count", "0"))
        + to_int(features.get("shares_count", "0"))
        + to_int(features.get("replies_count", "0")) * 2
    )
    if total_engagement > 1000:
        score += 20
    elif total_engagement > 100:
        score += 10
    elif total_engagement > 10:
        score += 5

    if to_bool(features.get("author_verified", "")):
        score += 10

    followers = to_int(features.get("author_followers_count", "0"))
    if followers > 100000:
        score += 15
    elif followers > 10000:
        score += 10
    elif followers > 1000:
        score += 5

    urls = parse_pg_text_array(features.get("urls", ""))
    if urls:
        score += 5
        suspicious_tlds = (".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top")
        for url in urls:
            hostname = urlparse(url).hostname or ""
            if hostname.lower().endswith(suspicious_tlds):
                score += 15
                break

    score = min(100, max(0, round(score)))
    return matched, score, criticality_from_score(score)


def main() -> None:
    with MATRIX_CSV.open(newline="", encoding="utf-8-sig") as matrix_file:
        matrix_rows = list(csv.DictReader(matrix_file))

    with FEATURES_CSV.open(newline="", encoding="utf-8") as features_file:
        features_by_mention = {
            row["mention_id"]: row for row in csv.DictReader(features_file)
        }

    output_rows = []
    missing_features = 0
    for row in matrix_rows:
        mention_id = row.get("mention_id", "")
        features = features_by_mention.get(mention_id)
        if not features:
            missing_features += 1
            features = {}

        original_keywords = split_keywords(row.get("matched_keywords", ""))
        corrected_keywords, corrected_score, corrected_criticality = classify(row, features)
        original_criticality = row.get("criticality_level", "")
        original_score = to_int(row.get("risk_score", "0"))
        removed_keywords = [kw for kw in original_keywords if kw not in corrected_keywords]
        added_keywords = [kw for kw in corrected_keywords if kw not in original_keywords]

        output_rows.append(
            {
                "detection_id": row.get("detection_id", ""),
                "mention_id": mention_id,
                "source": row.get("source", ""),
                "source_url": row.get("source_url", ""),
                "text_excerpt": row.get("text_excerpt", ""),
                "text_content_length": len(features.get("text_content", "")),
                "matched_keywords_original": "|".join(original_keywords),
                "risk_score_original": original_score,
                "criticality_original": original_criticality,
                "matched_keywords_corrected_full_text": "|".join(corrected_keywords),
                "risk_score_corrected_full_text": corrected_score,
                "criticality_corrected_full_text": corrected_criticality,
                "criticality_changed_full_text": "sí"
                if corrected_criticality != original_criticality
                else "no",
                "removed_keywords_full_text": "|".join(removed_keywords),
                "added_keywords_full_text": "|".join(added_keywords),
                "score_delta_full_text": corrected_score - original_score,
                "consenso_final": row.get("consenso_final", ""),
                "consenso_criticidad": row.get("consenso_criticidad", ""),
                "methodological_note": (
                    "Full-text recalculation using exported social_mentions fields "
                    "and current word-boundary keyword matching."
                ),
            }
        )

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=list(output_rows[0].keys()))
        writer.writeheader()
        writer.writerows(output_rows)

    total = len(output_rows)
    changed = sum(1 for row in output_rows if row["criticality_changed_full_text"] == "sí")
    original_alerts = sum(
        1 for row in output_rows if row["criticality_original"] in {"high", "critical"}
    )
    corrected_alerts = sum(
        1
        for row in output_rows
        if row["criticality_corrected_full_text"] in {"high", "critical"}
    )
    rce_original = sum(
        1
        for row in output_rows
        if "rce" in split_keywords(row["matched_keywords_original"])
    )
    rce_corrected = sum(
        1
        for row in output_rows
        if "rce" in split_keywords(row["matched_keywords_corrected_full_text"])
    )

    summary = f"""# Resumen de Re-auditoría Complementaria REV45 — Texto Completo

> Fuente histórica: `../01_historical_audit/01_historical_audit/Matriz_Auditoria_Fase2_REV37.csv`  
> Fuente textual completa: `social_mentions_full_features_REV45.csv`  
> Salida: `Matriz_Reauditoria_Matching_REV45_Texto_Completo.csv`  
> Alcance: recálculo complementario usando texto completo exportado desde PostgreSQL y matching por límite de palabra.

## Resultado cuantitativo

| Métrica | Valor |
|---|---:|
| Registros procesados | {total} |
| Registros sin features exportadas | {missing_features} |
| Cambios de criticidad con texto completo | {changed} |
| Alertas high/critical originales | {original_alerts} |
| Alertas high/critical recalculadas con texto completo | {corrected_alerts} |
| Registros con `rce` original | {rce_original} |
| Registros con `rce` confirmado con matching corregido | {rce_corrected} |

## Interpretación metodológica

Esta re-auditoría conserva la matriz histórica como evidencia original y agrega una medición complementaria sobre texto completo exportado desde PostgreSQL. El objetivo no es ocultar la sensibilidad del método anterior, sino medir el impacto de aplicar la lógica actual de matching por límite de palabra sobre los mismos registros auditados.

Estos resultados son más fuertes que la re-auditoría basada solo en `text_excerpt`, porque usan `social_mentions.text_content` y los campos operativos necesarios para recalcular boosts de engagement, autor y URL.
"""
    SUMMARY_MD.write_text(summary, encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
