"""Generate a new blind evaluation package for REV46.

The evaluator CSV intentionally excludes system criticality, score, keywords,
previous labels, and any expected result. The internal reference CSV must not be
shared with evaluators.
"""

from __future__ import annotations

import csv
import random
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
AUDIT_DIR = BASE_DIR.parents[1]
REAUDIT_CSV = AUDIT_DIR / "02_reaudits" / "Matriz_Reauditoria_Matching_REV46_Poblacion.csv"
POPULATION_CSV = AUDIT_DIR / "08_campaign_reconciliation" / "poblacion_campana_REV46.csv"

BLIND_CSV = BASE_DIR / "Muestra_Ciega_Evaluadores_REV46_Nueva.csv"
SYSTEM_CSV = BASE_DIR / "Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv"
MANIFEST_MD = BASE_DIR / "manifest_muestra_ciega_rev46_nueva.md"

RANDOM_SEED = 46
TARGET_SAMPLE_SIZE = 100
TARGET_COUNTS = {
    "alert_band": 40,
    "medium": 35,
    "low": 25,
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        raise ValueError(f"No rows to write: {path}")
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def sample_rows(rows: list[dict[str, str]], count: int, label: str) -> list[dict[str, str]]:
    if len(rows) < count:
        raise ValueError(f"Not enough rows for {label}: need {count}, have {len(rows)}")
    return random.sample(rows, count)


def main() -> None:
    random.seed(RANDOM_SEED)

    reaudit_rows = read_csv(REAUDIT_CSV)
    population_by_mention = {row["mention_id"]: row for row in read_csv(POPULATION_CSV)}

    alert_band = [
        row
        for row in reaudit_rows
        if row["criticality_corrected_word_boundary"] in {"critical", "high"}
    ]
    medium = [
        row for row in reaudit_rows if row["criticality_corrected_word_boundary"] == "medium"
    ]
    low = [row for row in reaudit_rows if row["criticality_corrected_word_boundary"] == "low"]

    selected = []
    selected.extend(sample_rows(alert_band, TARGET_COUNTS["alert_band"], "alert band"))
    selected.extend(sample_rows(medium, TARGET_COUNTS["medium"], "medium"))
    selected.extend(sample_rows(low, TARGET_COUNTS["low"], "low"))
    selected = sorted(selected, key=lambda row: int(row["mention_id"]))

    blind_rows: list[dict[str, str]] = []
    system_rows: list[dict[str, str]] = []

    for index, row in enumerate(selected, start=1):
        mention_id = row["mention_id"]
        population = population_by_mention[mention_id]
        sample_id = f"REV46-NEW-BLIND-{index:03d}"

        blind_rows.append(
            {
                "sample_id": sample_id,
                "mention_id": mention_id,
                "source": row["platform"],
                "source_url": population.get("urls", ""),
                "text_content": population.get("text_content", ""),
                "evaluador": "",
                "pertinencia_tematica": "",
                "criticidad_esperada": "",
                "confianza_evaluador": "",
                "observacion": "",
            }
        )

        system_rows.append(
            {
                "sample_id": sample_id,
                "mention_id": mention_id,
                "detection_id": row["detection_id"],
                "source": row["platform"],
                "external_id": row["external_id"],
                "source_url": population.get("urls", ""),
                "criticality_original": row["criticality_original"],
                "risk_score_original": row["risk_score_original"],
                "matched_keywords_original": row["matched_keywords_original"],
                "criticality_corrected_word_boundary": row[
                    "criticality_corrected_word_boundary"
                ],
                "risk_score_corrected_word_boundary": row[
                    "risk_score_corrected_word_boundary"
                ],
                "matched_keywords_corrected_word_boundary": row[
                    "matched_keywords_corrected_word_boundary"
                ],
                "criticality_changed_word_boundary": row[
                    "criticality_changed_word_boundary"
                ],
                "alert_band_corrected_word_boundary": row[
                    "alert_band_corrected_word_boundary"
                ],
                "text_content": population.get("text_content", ""),
            }
        )

    write_csv(BLIND_CSV, blind_rows)
    write_csv(SYSTEM_CSV, system_rows)

    counts: dict[str, int] = {}
    for row in system_rows:
        level = row["criticality_corrected_word_boundary"]
        counts[level] = counts.get(level, 0) + 1

    manifest = f"""# Manifiesto de muestra ciega nueva REV46

## Archivos generados

- `Muestra_Ciega_Evaluadores_REV46_Nueva.csv`: archivo ciego para entregar a evaluadores.
- `Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv`: referencia interna del sistema. No entregar a evaluadores.

## Parámetros

| Parámetro | Valor |
|---|---:|
| Semilla aleatoria | {RANDOM_SEED} |
| Tamaño de muestra | {len(blind_rows)} |
| Critical corregidos | {counts.get('critical', 0)} |
| High corregidos | {counts.get('high', 0)} |
| Medium corregidos | {counts.get('medium', 0)} |
| Low corregidos | {counts.get('low', 0)} |

## Fuentes

- Re-auditoría REV46: `../02_reaudits/Matriz_Reauditoria_Matching_REV46_Poblacion.csv`.
- Población REV46: `../08_campaign_reconciliation/poblacion_campana_REV46.csv`.

## Regla metodológica

El archivo entregado a evaluadores no contiene criticidad, score, keywords ni evaluación previa del sistema. La referencia interna debe mantenerse separada hasta recibir todas las respuestas.
"""
    MANIFEST_MD.write_text(manifest, encoding="utf-8")
    print(manifest)


if __name__ == "__main__":
    main()
