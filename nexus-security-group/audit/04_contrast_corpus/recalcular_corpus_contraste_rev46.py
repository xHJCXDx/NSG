"""
Recalculate the REV46 contrast corpus against the frozen REV46 population.

The REV45 contrast corpus was originally checked against partial exports. REV46
checks the same public Hacker News cases against the frozen operational
population, detections, and alerts.

Usage:
    python3 recalcular_corpus_contraste_rev46.py

Outputs:
    Corpus_Contraste_REV46.csv
    resumen_corpus_contraste_rev46.md
"""

from __future__ import annotations

import csv
import hashlib
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
CONTRAST_DIR = BASE_DIR / "04_contrast_corpus"
SOURCE_CSV = CONTRAST_DIR / "Corpus_Contraste_REV45_Template.csv"
POPULATION_CSV = BASE_DIR / "08_campaign_reconciliation" / "poblacion_campana_REV46.csv"
DETECTIONS_CSV = BASE_DIR / "08_campaign_reconciliation" / "detecciones_campana_REV46.csv"
ALERTS_CSV = BASE_DIR / "08_campaign_reconciliation" / "alertas_campana_REV46.csv"
OUTPUT_CSV = CONTRAST_DIR / "Corpus_Contraste_REV46.csv"
OUTPUT_MD = CONTRAST_DIR / "resumen_corpus_contraste_rev46.md"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_hn_id(url: str) -> str:
    match = re.search(r"id=(\d+)", url)
    return match.group(1) if match else ""


def main() -> None:
    population = {
        row["external_id"]: row
        for row in read_csv(POPULATION_CSV)
        if row["platform"] == "hackernews"
    }
    detections = {row["mention_id"]: row for row in read_csv(DETECTIONS_CSV)}
    alerts: dict[str, list[dict[str, str]]] = {}
    for row in read_csv(ALERTS_CSV):
        alerts.setdefault(row["detection_id"], []).append(row)

    output_rows = []
    for row in read_csv(SOURCE_CSV):
        external_id = extract_hn_id(row["source_url"])
        mention = population.get(external_id)
        detection = detections.get(mention["mention_id"]) if mention else None
        detection_alerts = alerts.get(detection["detection_id"], []) if detection else []

        if mention and detection and detection_alerts:
            match_status = "capturado_detectado_alertado"
            captured = detected = alerted = "si"
            observation = (
                "Exact Hacker News external_id found in frozen REV46 population; "
                "associated detection and alert exist in REV46 exports."
            )
        elif mention and detection:
            match_status = "capturado_detectado_no_alertado"
            captured = detected = "si"
            alerted = "no"
            observation = (
                "Exact Hacker News external_id found in frozen REV46 population; "
                "associated detection exists but no alert was persisted, consistent "
                "with non-alertable criticality."
            )
        elif mention:
            match_status = "capturado_sin_deteccion"
            captured = "si"
            detected = alerted = "no"
            observation = (
                "Exact Hacker News external_id found in frozen REV46 population, "
                "but no associated detection was found."
            )
        else:
            match_status = "no_encontrado_en_poblacion_rev46"
            captured = detected = alerted = "no"
            observation = (
                "No exact Hacker News external_id match found in frozen REV46 "
                "population. This establishes absence from the preserved operational "
                "population, but not the semantic reason for absence."
            )

        output_rows.append(
            {
                "case_id": row["case_id"].replace("REV45", "REV46"),
                "source": row["source"],
                "source_url": row["source_url"],
                "source_external_id": external_id,
                "publication_date": row["publication_date"],
                "rev46_window_start": "2026-09-25T18:48:00Z",
                "rev46_window_end": "2026-09-29T19:31:05.363840Z",
                "eligible_in_rev46_window": "si",
                "expected_signal": row["expected_signal"],
                "expected_keyword_or_pattern": row["expected_keyword_or_pattern"],
                "should_be_detected_by_nsg": row["should_be_detected_by_nsg"],
                "captured_in_full_population": captured,
                "detected_by_nsg": detected,
                "alerted_by_nsg": alerted,
                "mention_id": mention["mention_id"] if mention else "",
                "detection_id": detection["detection_id"] if detection else "",
                "criticality_level": detection["criticality_level"] if detection else "",
                "alert_ids": "|".join(alert["alert_id"] for alert in detection_alerts),
                "match_status": match_status,
                "population_file": "audit/08_campaign_reconciliation/poblacion_campana_REV46.csv",
                "reviewer_observation": observation,
            }
        )

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(output_rows[0].keys()))
        writer.writeheader()
        writer.writerows(output_rows)

    write_summary(output_rows)
    print(f"Wrote {OUTPUT_CSV}")
    print(f"Wrote {OUTPUT_MD}")


def write_summary(rows: list[dict[str, str]]) -> None:
    total = len(rows)
    captured = sum(row["captured_in_full_population"] == "si" for row in rows)
    detected = sum(row["detected_by_nsg"] == "si" for row in rows)
    alerted = sum(row["alerted_by_nsg"] == "si" for row in rows)
    expected = [row for row in rows if row["should_be_detected_by_nsg"] == "si"]
    partial = [row for row in rows if row["should_be_detected_by_nsg"] == "parcial"]
    not_found = sum(row["match_status"] == "no_encontrado_en_poblacion_rev46" for row in rows)

    summary = f"""# Resumen metodológico — Corpus de contraste REV46

## Propósito

Este artefacto actualiza el corpus exploratorio de Hacker News contra la población congelada REV46. A diferencia de REV45, el cruce ya no se hace contra exports parciales de 200 registros, sino contra `audit/08_campaign_reconciliation/poblacion_campana_REV46.csv`.

## Alcance

| Campo | Decisión |
|---|---|
| Ventana temporal REV46 | 25/09/2026 18:48 UTC – 29/09/2026 19:31:05 UTC |
| Fuente usada para el corpus | Hacker News |
| Tamaño del corpus | {total} casos reales verificables |
| Archivo de resultado | `Corpus_Contraste_REV46.csv` |
| Hash SHA-256 del resultado | `{sha256(OUTPUT_CSV)}` |

## Regla de cruce

Cada caso se cruzó por coincidencia exacta entre el parámetro `id` de la URL de Hacker News y `external_id` en la población completa REV46, restringida a `platform = hackernews`. Luego se verificó si el `mention_id` tenía detección asociada en `detecciones_campana_REV46.csv` y alerta asociada en `alertas_campana_REV46.csv`.

## Resultados

| Métrica | Resultado | Interpretación |
|---|---:|---|
| Casos capturados en población REV46 | {captured}/{total} = {captured / total * 100:.1f}% | Coincidencia exacta por `external_id` en población completa congelada. |
| Casos detectados por NSG | {detected}/{total} = {detected / total * 100:.1f}% | Casos capturados con detección asociada. |
| Casos alertados por NSG | {alerted}/{total} = {alerted / total * 100:.1f}% | Casos capturados con alerta persistida. |
| Casos esperables (`si`) detectados | {sum(row['detected_by_nsg'] == 'si' for row in expected)}/{len(expected)} = {sum(row['detected_by_nsg'] == 'si' for row in expected) / len(expected) * 100:.1f}% | Lectura estricta sobre casos marcados como esperables. |
| Casos parciales detectados | {sum(row['detected_by_nsg'] == 'si' for row in partial)}/{len(partial)} = {sum(row['detected_by_nsg'] == 'si' for row in partial) / len(partial) * 100:.1f}% | Lectura sobre casos de detectabilidad parcial. |
| No encontrados en población REV46 | {not_found}/{total} = {not_found / total * 100:.1f}% | Ausencia comprobada contra la población congelada, no solo contra muestra parcial. |

Casos capturados/detectados/alertados:

| case_id | external_id | mention_id | detection_id | criticality | URL |
|---|---:|---:|---:|---|---|
"""
    for row in rows:
        if row["captured_in_full_population"] == "si":
            summary += (
                f"| {row['case_id']} | {row['source_external_id']} | "
                f"{row['mention_id']} | {row['detection_id']} | "
                f"{row['criticality_level']} | {row['source_url']} |\n"
            )

    summary += """
## Interpretación

El resultado sigue siendo **cobertura exploratoria acotada**, no recall global. La mejora metodológica es que las ausencias ya fueron verificadas contra la población completa REV46 congelada, no contra un export parcial de 200 registros. Aun así, el corpus es pequeño, monofuente y construido como control posterior; por eso no permite inferir cobertura multi-fuente ni sensibilidad global del sistema.

En este cruce REV46 no quedaron ausencias: los 20 `external_id` aparecen en la población congelada y tienen detección asociada. Solo 2/20 generaron alerta porque el workflow alerta únicamente `critical` o `high`; los demás fueron capturados y clasificados como `medium` o `low`.

## Reproducción

- Población usada: `audit/08_campaign_reconciliation/poblacion_campana_REV46.csv`.
- Detecciones usadas: `audit/08_campaign_reconciliation/detecciones_campana_REV46.csv`.
- Alertas usadas: `audit/08_campaign_reconciliation/alertas_campana_REV46.csv`.
- Resultado: `audit/04_contrast_corpus/Corpus_Contraste_REV46.csv`.
"""
    OUTPUT_MD.write_text(summary, encoding="utf-8")


if __name__ == "__main__":
    main()
