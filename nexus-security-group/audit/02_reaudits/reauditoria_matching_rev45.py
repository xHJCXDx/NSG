"""REV45 complementary re-audit for keyword matching.

This script compares the historical audited matrix against the current
word-boundary keyword matching logic. It intentionally works only with the
preserved text excerpt available in Matriz_Auditoria_Fase2_REV37.csv, so the
result must be reported as a partial/conservative re-audit, not as a full
reproduction of the original pipeline.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
AUDIT_DIR = BASE_DIR.parent
INPUT_CSV = AUDIT_DIR / "01_historical_audit" / "Matriz_Auditoria_Fase2_REV37.csv"
OUTPUT_CSV = BASE_DIR / "Matriz_Reauditoria_Matching_REV45.csv"
SUMMARY_MD = BASE_DIR / "resumen_reauditoria_matching_rev45.md"


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


def boundary_match(text: str, keyword: str) -> bool:
    """Match the current workflow behavior: new RegExp('\\b' + kw + '\\b')."""

    return re.search(r"\b" + re.escape(keyword) + r"\b", text) is not None


def criticality_from_score(score: int) -> str:
    if score >= 60:
        return "critical"
    if score >= 40:
        return "high"
    if score >= 20:
        return "medium"
    return "low"


def recalculate_from_excerpt(row: dict[str, str]) -> tuple[list[str], int, str]:
    text = (row.get("text_excerpt") or "").lower()
    score = 0
    matched: list[str] = []

    for keywords in (CRITICAL_KEYWORDS, HIGH_KEYWORDS, MEDIUM_KEYWORDS):
        for keyword, points in keywords.items():
            if boundary_match(text, keyword):
                score += points
                matched.append(keyword)

    if (row.get("sentiment_label") or "").lower() == "negative":
        score += 15

    if row.get("source_url"):
        score += 5

    score = min(100, max(0, round(score)))
    return matched, score, criticality_from_score(score)


def split_keywords(value: str) -> list[str]:
    return [part.strip().lower() for part in (value or "").split("|") if part.strip()]


def main() -> None:
    with INPUT_CSV.open(newline="", encoding="utf-8-sig") as input_file:
        rows = list(csv.DictReader(input_file))

    output_rows = []
    for row in rows:
        original_keywords = split_keywords(row.get("matched_keywords", ""))
        corrected_keywords, corrected_score, corrected_criticality = recalculate_from_excerpt(row)
        removed_keywords = [kw for kw in original_keywords if kw not in corrected_keywords]
        added_keywords = [kw for kw in corrected_keywords if kw not in original_keywords]
        original_criticality = row.get("criticality_level", "")
        original_score = int(float(row.get("risk_score") or 0))

        output_rows.append(
            {
                "detection_id": row.get("detection_id", ""),
                "mention_id": row.get("mention_id", ""),
                "source": row.get("source", ""),
                "source_url": row.get("source_url", ""),
                "text_excerpt": row.get("text_excerpt", ""),
                "matched_keywords_original": "|".join(original_keywords),
                "risk_score_original": original_score,
                "criticality_original": original_criticality,
                "matched_keywords_corrected_excerpt": "|".join(corrected_keywords),
                "risk_score_corrected_excerpt": corrected_score,
                "criticality_corrected_excerpt": corrected_criticality,
                "criticality_changed_excerpt": "sí"
                if corrected_criticality != original_criticality
                else "no",
                "removed_keywords_in_excerpt": "|".join(removed_keywords),
                "added_keywords_in_excerpt": "|".join(added_keywords),
                "score_delta_excerpt": corrected_score - original_score,
                "consenso_final": row.get("consenso_final", ""),
                "consenso_criticidad": row.get("consenso_criticidad", ""),
                "methodological_note": (
                    "Partial conservative recalculation over preserved 200-character excerpt; "
                    "not a full reproduction of the original pipeline."
                ),
            }
        )

    fieldnames = list(output_rows[0].keys()) if output_rows else []
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    total = len(output_rows)
    changed = sum(1 for row in output_rows if row["criticality_changed_excerpt"] == "sí")
    original_alerts = sum(
        1 for row in output_rows if row["criticality_original"] in {"high", "critical"}
    )
    corrected_alerts = sum(
        1
        for row in output_rows
        if row["criticality_corrected_excerpt"] in {"high", "critical"}
    )
    rce_original = sum(
        1
        for row in output_rows
        if "rce" in split_keywords(row["matched_keywords_original"])
    )
    rce_corrected = sum(
        1
        for row in output_rows
        if "rce" in split_keywords(row["matched_keywords_corrected_excerpt"])
    )

    summary = f"""# Resumen de Re-auditoría Complementaria REV45 — Matching por Límite de Palabra

> Fuente: `../01_historical_audit/01_historical_audit/Matriz_Auditoria_Fase2_REV37.csv`  
> Salida: `Matriz_Reauditoria_Matching_REV45.csv`  
> Alcance: recálculo parcial/conservador sobre `text_excerpt` preservado.

## Resultado cuantitativo

| Métrica | Valor |
|---|---:|
| Registros procesados | {total} |
| Cambios de criticidad sobre extracto preservado | {changed} |
| Alertas high/critical originales | {original_alerts} |
| Alertas high/critical recalculadas sobre extracto | {corrected_alerts} |
| Registros con `rce` original | {rce_original} |
| Registros con `rce` confirmado en extracto preservado | {rce_corrected} |

## Interpretación metodológica

Esta re-auditoría no reproduce completamente el pipeline original porque la matriz preserva `text_excerpt` truncado, no el campo completo `social_mentions.text_content`. Por lo tanto, los resultados deben describirse como una estimación parcial y conservadora del impacto del matching corregido.

El valor académico está en mostrar trazabilidad: la matriz histórica se conserva, el problema de matching por subcadena se reconoce, y se agrega una medición complementaria reproducible sobre la evidencia preservada.
"""
    SUMMARY_MD.write_text(summary, encoding="utf-8")

    print(summary)


if __name__ == "__main__":
    main()
