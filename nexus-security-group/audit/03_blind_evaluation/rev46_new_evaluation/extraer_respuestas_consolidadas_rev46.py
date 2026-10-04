"""Split the consolidated A/B blind evaluation CSV into per-evaluator CSVs.

Use this only after both evaluators have completed their answers independently
and the author has transcribed them into the consolidated file.
"""

from __future__ import annotations

import csv
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
CONSOLIDATED_CSV = BASE_DIR / "Muestra_Ciega_Evaluadores_REV46_Nueva_Consolidada_AB.csv"
EVALUATOR_A_CSV = BASE_DIR / "Respuestas_Evaluador_A_REV46_Nueva.csv"
EVALUATOR_B_CSV = BASE_DIR / "Respuestas_Evaluador_B_REV46_Nueva.csv"

OUTPUT_FIELDS = [
    "sample_id",
    "mention_id",
    "source",
    "source_url",
    "text_content",
    "evaluador",
    "pertinencia_tematica",
    "criticidad_esperada",
    "confianza_evaluador",
    "observacion",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def build_rows(rows: list[dict[str, str]], suffix: str) -> list[dict[str, str]]:
    output = []
    for row in rows:
        output.append(
            {
                "sample_id": row["sample_id"],
                "mention_id": row["mention_id"],
                "source": row["source"],
                "source_url": row["source_url"],
                "text_content": row["text_content"],
                "evaluador": row[f"evaluador_{suffix}"],
                "pertinencia_tematica": row[f"pertinencia_{suffix}"],
                "criticidad_esperada": row[f"criticidad_{suffix}"],
                "confianza_evaluador": row[f"confianza_{suffix}"],
                "observacion": row[f"observacion_{suffix}"],
            }
        )
    return output


def main() -> None:
    rows = read_csv(CONSOLIDATED_CSV)
    write_csv(EVALUATOR_A_CSV, build_rows(rows, "a"))
    write_csv(EVALUATOR_B_CSV, build_rows(rows, "b"))
    print(f"Wrote {EVALUATOR_A_CSV}")
    print(f"Wrote {EVALUATOR_B_CSV}")


if __name__ == "__main__":
    main()
