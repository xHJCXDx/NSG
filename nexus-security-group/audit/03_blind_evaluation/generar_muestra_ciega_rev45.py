"""Generate blind evaluator and system-reference CSVs for REV45.

Sampling strategy:
- Include every record that remains high/critical after full-text corrected matching.
- Fill the sample up to 60 records with deterministic random samples from medium and low.

The blind CSV intentionally excludes system score, criticality, keywords and previous audit labels.
"""

from __future__ import annotations

import csv
import random
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
AUDIT_DIR = BASE_DIR.parent
REAUDIT_CSV = AUDIT_DIR / "02_reaudits" / "Matriz_Reauditoria_Matching_REV45_Texto_Completo.csv"
FEATURES_CSV = AUDIT_DIR / "02_reaudits" / "social_mentions_full_features_REV45.csv"
BLIND_CSV = BASE_DIR / "Muestra_Ciega_Evaluadores_REV45.csv"
SYSTEM_CSV = BASE_DIR / "Muestra_Ciega_Referencia_Sistema_REV45.csv"
README_MD = BASE_DIR / "instrucciones_evaluacion_ciega_rev45.md"

RANDOM_SEED = 45
TARGET_SAMPLE_SIZE = 60


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    random.seed(RANDOM_SEED)
    reaudit_rows = read_csv(REAUDIT_CSV)
    features_by_mention = {row["mention_id"]: row for row in read_csv(FEATURES_CSV)}

    high_critical = [
        row
        for row in reaudit_rows
        if row["criticality_corrected_full_text"] in {"high", "critical"}
    ]
    medium = [row for row in reaudit_rows if row["criticality_corrected_full_text"] == "medium"]
    low = [row for row in reaudit_rows if row["criticality_corrected_full_text"] == "low"]

    remaining = TARGET_SAMPLE_SIZE - len(high_critical)
    medium_take = min(len(medium), round(remaining * 2 / 3))
    low_take = min(len(low), remaining - medium_take)

    selected = list(high_critical)
    selected.extend(random.sample(medium, medium_take))
    selected.extend(random.sample(low, low_take))
    selected = sorted(selected, key=lambda row: int(row["mention_id"]))

    blind_rows: list[dict[str, str]] = []
    system_rows: list[dict[str, str]] = []

    for index, row in enumerate(selected, start=1):
        mention_id = row["mention_id"]
        features = features_by_mention[mention_id]
        sample_id = f"REV45-BLIND-{index:03d}"
        blind_rows.append(
            {
                "sample_id": sample_id,
                "mention_id": mention_id,
                "source": row["source"],
                "source_url": row["source_url"],
                "text_content": features.get("text_content", ""),
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
                "source": row["source"],
                "source_url": row["source_url"],
                "criticality_original": row["criticality_original"],
                "risk_score_original": row["risk_score_original"],
                "matched_keywords_original": row["matched_keywords_original"],
                "criticality_corrected_full_text": row["criticality_corrected_full_text"],
                "risk_score_corrected_full_text": row["risk_score_corrected_full_text"],
                "matched_keywords_corrected_full_text": row[
                    "matched_keywords_corrected_full_text"
                ],
                "criticality_changed_full_text": row["criticality_changed_full_text"],
                "consenso_final_previo": row["consenso_final"],
                "consenso_criticidad_previo": row["consenso_criticidad"],
                "text_content": features.get("text_content", ""),
            }
        )

    write_csv(BLIND_CSV, blind_rows)
    write_csv(SYSTEM_CSV, system_rows)

    counts: dict[str, int] = {}
    for row in system_rows:
        level = row["criticality_corrected_full_text"]
        counts[level] = counts.get(level, 0) + 1

    readme = f"""# Instrucciones para Evaluación Ciega Parcial REV45

## Archivos

- `Muestra_Ciega_Evaluadores_REV45.csv`: archivo para entregar a evaluadores.
- `Muestra_Ciega_Referencia_Sistema_REV45.csv`: archivo de referencia interna del sistema. No entregar a evaluadores.

## Tamaño y composición

La muestra contiene {len(blind_rows)} registros.

Distribución según criticidad corregida del sistema —oculta para evaluadores—:

| Criticidad corregida | Cantidad |
|---|---:|
| critical | {counts.get('critical', 0)} |
| high | {counts.get('high', 0)} |
| medium | {counts.get('medium', 0)} |
| low | {counts.get('low', 0)} |

## Instrucciones para evaluadores

Completar las columnas vacías:

- `evaluador`: nombre o código del evaluador.
- `pertinencia_tematica`: `si`, `parcial` o `no`.
- `criticidad_esperada`: `critical`, `high`, `medium`, `low` o `no_aplica`.
- `confianza_evaluador`: `alta`, `media` o `baja`.
- `observacion`: justificación breve, especialmente si la pertinencia es parcial/no o si la criticidad no aplica.

## Regla metodológica

Los evaluadores no deben ver la criticidad, score, keywords ni evaluación previa del sistema antes de completar su revisión.
"""
    README_MD.write_text(readme, encoding="utf-8")
    print(readme)


if __name__ == "__main__":
    main()
