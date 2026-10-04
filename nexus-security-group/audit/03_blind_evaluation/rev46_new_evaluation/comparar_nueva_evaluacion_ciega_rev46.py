"""Compare completed REV46 blind evaluation CSVs against the internal reference.

Usage:
    python comparar_nueva_evaluacion_ciega_rev46.py evaluator_a.csv evaluator_b.csv [evaluator_c.csv]

The script expects evaluator CSVs with the same schema as
`Muestra_Ciega_Evaluadores_REV46_Nueva.csv`, completed by each evaluator.
"""

from __future__ import annotations

import csv
import sys
from itertools import combinations
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
REFERENCE_CSV = BASE_DIR / "Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv"
OUTPUT_CSV = BASE_DIR / "Resultados_Nueva_Evaluacion_Ciega_REV46.csv"
SUMMARY_MD = BASE_DIR / "resumen_nueva_evaluacion_ciega_rev46.md"

LEVELS = {"low": 1, "medium": 2, "high": 3, "critical": 4}


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


def normalize(value: str) -> str:
    return value.strip().lower()


def alert_band(value: str) -> str:
    value = normalize(value)
    if value in {"critical", "high"}:
        return "alertable"
    if value in {"medium", "low", "no_aplica"}:
        return "non_alertable"
    return "invalid"


def level_delta(evaluator_value: str, system_value: str) -> str:
    evaluator_value = normalize(evaluator_value)
    system_value = normalize(system_value)
    if evaluator_value not in LEVELS or system_value not in LEVELS:
        return ""
    return str(LEVELS[evaluator_value] - LEVELS[system_value])


def proportion(count: int, total: int) -> str:
    if total == 0:
        return "0/0 = n/a"
    return f"{count}/{total} = {count / total:.1%}"


def cohen_kappa(left_values: list[str], right_values: list[str]) -> tuple[float, float, float]:
    total = len(left_values)
    if total == 0:
        return 0.0, 0.0, 0.0

    observed = sum(
        left == right for left, right in zip(left_values, right_values, strict=True)
    ) / total
    left_counts = {value: left_values.count(value) for value in set(left_values)}
    right_counts = {value: right_values.count(value) for value in set(right_values)}
    labels = set(left_counts) | set(right_counts)
    expected = sum(
        (left_counts.get(label, 0) / total) * (right_counts.get(label, 0) / total)
        for label in labels
    )
    if expected == 1:
        return observed, expected, 0.0
    return observed, expected, (observed - expected) / (1 - expected)


def main(paths: list[str]) -> None:
    if len(paths) < 2:
        raise SystemExit(
            "Provide at least two completed evaluator CSVs to estimate blind inter-evaluator agreement."
        )

    reference = {row["sample_id"]: row for row in read_csv(REFERENCE_CSV)}
    evaluator_rows_by_name: dict[str, dict[str, dict[str, str]]] = {}
    output_rows: list[dict[str, str]] = []

    for path_string in paths:
        path = Path(path_string)
        rows = read_csv(path)
        if not rows:
            raise ValueError(f"Empty evaluator file: {path}")
        evaluator_name = rows[0].get("evaluador", "").strip() or path.stem
        by_sample = {row["sample_id"]: row for row in rows}
        evaluator_rows_by_name[evaluator_name] = by_sample

        for sample_id, row in by_sample.items():
            ref = reference[sample_id]
            evaluator_criticality = normalize(row.get("criticidad_esperada", ""))
            system_criticality = normalize(ref["criticality_corrected_word_boundary"])
            output_rows.append(
                {
                    "sample_id": sample_id,
                    "mention_id": row.get("mention_id", ""),
                    "source": row.get("source", ""),
                    "evaluador": evaluator_name,
                    "pertinencia_evaluador": normalize(row.get("pertinencia_tematica", "")),
                    "criticidad_evaluador": evaluator_criticality,
                    "confianza_evaluador": normalize(row.get("confianza_evaluador", "")),
                    "criticidad_sistema_corregida": system_criticality,
                    "risk_score_sistema_corregido": ref[
                        "risk_score_corrected_word_boundary"
                    ],
                    "keywords_sistema_corregidas": ref[
                        "matched_keywords_corrected_word_boundary"
                    ],
                    "criticidad_original": ref["criticality_original"],
                    "acuerdo_criticidad_exacta": str(
                        evaluator_criticality == system_criticality
                    ).lower(),
                    "acuerdo_banda_alerta": str(
                        alert_band(evaluator_criticality) == alert_band(system_criticality)
                    ).lower(),
                    "diferencia_nivel_evaluador_menos_sistema": level_delta(
                        evaluator_criticality, system_criticality
                    ),
                    "observacion_evaluador": row.get("observacion", ""),
                }
            )

    write_csv(OUTPUT_CSV, sorted(output_rows, key=lambda row: (row["sample_id"], row["evaluador"])))

    total_evaluations = len(output_rows)
    strict_relevance = sum(1 for row in output_rows if row["pertinencia_evaluador"] == "si")
    broad_relevance = sum(
        1 for row in output_rows if row["pertinencia_evaluador"] in {"si", "parcial"}
    )
    exact_system_agreement = sum(
        1 for row in output_rows if row["acuerdo_criticidad_exacta"] == "true"
    )
    band_system_agreement = sum(
        1 for row in output_rows if row["acuerdo_banda_alerta"] == "true"
    )

    pairwise_lines = []
    kappa_lines = []
    for left, right in combinations(evaluator_rows_by_name.keys(), 2):
        left_rows = evaluator_rows_by_name[left]
        right_rows = evaluator_rows_by_name[right]
        shared_ids = sorted(set(left_rows) & set(right_rows))
        pertinence_agreement = sum(
            1
            for sample_id in shared_ids
            if normalize(left_rows[sample_id].get("pertinencia_tematica", ""))
            == normalize(right_rows[sample_id].get("pertinencia_tematica", ""))
        )
        exact_criticality_agreement = sum(
            1
            for sample_id in shared_ids
            if normalize(left_rows[sample_id].get("criticidad_esperada", ""))
            == normalize(right_rows[sample_id].get("criticidad_esperada", ""))
        )
        band_agreement = sum(
            1
            for sample_id in shared_ids
            if alert_band(left_rows[sample_id].get("criticidad_esperada", ""))
            == alert_band(right_rows[sample_id].get("criticidad_esperada", ""))
        )
        pairwise_lines.append(
            f"| {left} vs {right} | {len(shared_ids)} | "
            f"{proportion(pertinence_agreement, len(shared_ids))} | "
            f"{proportion(exact_criticality_agreement, len(shared_ids))} | "
            f"{proportion(band_agreement, len(shared_ids))} |"
        )

        left_pertinence = [
            normalize(left_rows[sample_id].get("pertinencia_tematica", ""))
            for sample_id in shared_ids
        ]
        right_pertinence = [
            normalize(right_rows[sample_id].get("pertinencia_tematica", ""))
            for sample_id in shared_ids
        ]
        left_criticality = [
            normalize(left_rows[sample_id].get("criticidad_esperada", ""))
            for sample_id in shared_ids
        ]
        right_criticality = [
            normalize(right_rows[sample_id].get("criticidad_esperada", ""))
            for sample_id in shared_ids
        ]
        left_band = [alert_band(value) for value in left_criticality]
        right_band = [alert_band(value) for value in right_criticality]

        _, _, pertinence_kappa = cohen_kappa(left_pertinence, right_pertinence)
        _, _, criticality_kappa = cohen_kappa(left_criticality, right_criticality)
        _, _, band_kappa = cohen_kappa(left_band, right_band)
        kappa_lines.append(
            f"| {left} vs {right} | {pertinence_kappa:.3f} | "
            f"{criticality_kappa:.3f} | {band_kappa:.3f} |"
        )

    summary = f"""# Resumen — Nueva Evaluación Ciega REV46

## Archivos

- Comparación agregada: `Resultados_Nueva_Evaluacion_Ciega_REV46.csv`.
- Referencia interna: `Muestra_Ciega_Referencia_Sistema_REV46_Nueva.csv`.

## Métricas agregadas contra referencia interna

| Métrica | Resultado |
|---|---:|
| Evaluaciones informadas | {total_evaluations} |
| Pertinencia temática estricta (`si`) | {proportion(strict_relevance, total_evaluations)} |
| Pertinencia temática amplia (`si` + `parcial`) | {proportion(broad_relevance, total_evaluations)} |
| Acuerdo exacto de criticidad contra sistema corregido | {proportion(exact_system_agreement, total_evaluations)} |
| Acuerdo por banda de alerta contra sistema corregido | {proportion(band_system_agreement, total_evaluations)} |

## Acuerdo inter-evaluador ciego

| Par | Casos compartidos | Pertinencia exacta | Criticidad exacta | Banda de alerta |
|---|---:|---:|---:|---:|
{chr(10).join(pairwise_lines)}

## κ de Cohen inter-evaluador

| Par | Pertinencia | Criticidad exacta | Banda de alerta |
|---|---:|---:|---:|
{chr(10).join(kappa_lines)}

## Interpretación

Esta evidencia debe presentarse como evaluación ciega complementaria. Puede fortalecer una lectura de pertinencia temática amplia, pero el bajo acuerdo inter-evaluador refuerza la cautela sobre criticidad y no constituye recall global ni validación operacional completa de severidad.
"""
    SUMMARY_MD.write_text(summary, encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main(sys.argv[1:])
