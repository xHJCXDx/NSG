"""
REV46 audit metrics.

This script recalculates the main audit metrics after campaign reconciliation.
It uses the frozen REV46 population export as the population frame and the
historical 200-case audit matrix as the reviewed sample.

Usage:
    python3 metricas_auditoria_REV46.py

Outputs:
    metricas_auditoria_REV46.json
    metricas_auditoria_REV46.md
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import random
from collections import Counter, defaultdict
from pathlib import Path
from statistics import NormalDist


RANDOM_SEED = 42
BOOTSTRAP_ITERATIONS = 10_000
CONFIDENCE_LEVEL = 0.95

BASE_DIR = Path(__file__).resolve().parents[1]
HISTORICAL_MATRIX = BASE_DIR / "01_historical_audit" / "Matriz_Auditoria_Fase2_REV37.csv"
POPULATION_REV46 = BASE_DIR / "08_campaign_reconciliation" / "poblacion_campana_REV46.csv"
DETECTIONS_REV46 = BASE_DIR / "08_campaign_reconciliation" / "detecciones_campana_REV46.csv"
ALERTS_REV46 = BASE_DIR / "08_campaign_reconciliation" / "alertas_campana_REV46.csv"
OUTPUT_JSON = Path(__file__).with_name("metricas_auditoria_REV46.json")
OUTPUT_MD = Path(__file__).with_name("metricas_auditoria_REV46.md")


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pct(value: float) -> float:
    return round(value * 100, 4)


def wilson_interval(successes: int, n: int, confidence: float = CONFIDENCE_LEVEL) -> dict[str, float]:
    if n == 0:
        return {"lower": 0.0, "upper": 0.0}

    z = NormalDist().inv_cdf(1 - (1 - confidence) / 2)
    phat = successes / n
    denominator = 1 + z**2 / n
    center = (phat + z**2 / (2 * n)) / denominator
    margin = z * math.sqrt((phat * (1 - phat) + z**2 / (4 * n)) / n) / denominator
    return {"lower": center - margin, "upper": center + margin}


def percentile_interval(values: list[float], confidence: float = CONFIDENCE_LEVEL) -> dict[str, float]:
    ordered = sorted(values)
    lower_index = int((1 - confidence) / 2 * len(ordered))
    upper_index = int((1 + confidence) / 2 * len(ordered))
    upper_index = min(upper_index, len(ordered) - 1)
    return {"lower": ordered[lower_index], "upper": ordered[upper_index]}


def conservative_criticality(row: dict[str, str]) -> str:
    a = row["evaluador_a_criticidad"]
    b = row["evaluador_b_criticidad"]

    if a == "si" and b == "si":
        return "correcta_plena"
    if a == "parcial" and b == "parcial":
        return "parcial"
    if a == "no_aplica" and b == "no_aplica":
        return "no_aplica"
    if "no" in {a, b} and "no_aplica" not in {a, b}:
        return "incorrecta"
    return "requiere_resolucion"


def is_dependency_dashboard(row: dict[str, str]) -> bool:
    return "Dependency Dashboard" in row["text_excerpt"]


def relevance_by_source(rows: list[dict[str, str]], population_counts: Counter[str]) -> dict[str, dict[str, float | int]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["source"]].append(row)

    result = {}
    for source in sorted(population_counts):
        sample_rows = grouped[source]
        sample_n = len(sample_rows)
        correct = sum(1 for row in sample_rows if row["consenso_final"] == "correcto")
        result[source] = {
            "population_n": population_counts[source],
            "sample_n": sample_n,
            "correct": correct,
            "sample_relevance": correct / sample_n if sample_n else 0.0,
        }
    return result


def weighted_relevance(by_source: dict[str, dict[str, float | int]], population_n: int) -> float:
    total = 0.0
    for values in by_source.values():
        weight = int(values["population_n"]) / population_n
        total += weight * float(values["sample_relevance"])
    return total


def stratified_bootstrap_ci(
    rows: list[dict[str, str]], population_counts: Counter[str], iterations: int = BOOTSTRAP_ITERATIONS
) -> dict[str, float]:
    rng = random.Random(RANDOM_SEED)
    grouped: dict[str, list[int]] = defaultdict(list)
    for row in rows:
        grouped[row["source"]].append(1 if row["consenso_final"] == "correcto" else 0)

    population_n = sum(population_counts.values())
    estimates = []
    for _ in range(iterations):
        estimate = 0.0
        for source, population_count in population_counts.items():
            stratum_values = grouped[source]
            if not stratum_values:
                continue
            sample = [rng.choice(stratum_values) for _ in range(len(stratum_values))]
            estimate += (population_count / population_n) * (sum(sample) / len(sample))
        estimates.append(estimate)

    return percentile_interval(estimates)


def main() -> None:
    historical_rows = read_csv(HISTORICAL_MATRIX)
    population_rows = read_csv(POPULATION_REV46)
    detection_rows = read_csv(DETECTIONS_REV46)
    alert_rows = read_csv(ALERTS_REV46)

    n = len(historical_rows)
    population_n = len(population_rows)
    population_counts = Counter(row["platform"] for row in population_rows)
    sample_counts = Counter(row["source"] for row in historical_rows)

    strict_correct = sum(1 for row in historical_rows if row["consenso_final"] == "correcto")
    partial = sum(1 for row in historical_rows if row["consenso_final"] == "parcial")
    ambiguous = sum(1 for row in historical_rows if row["consenso_final"] == "ambiguo")
    severity_incorrect = sum(1 for row in historical_rows if row["consenso_final"] == "severidad_incorrecta")
    consensus_fp = sum(1 for row in historical_rows if "falso_positivo" in row["consenso_final"])
    evaluator_a_fp = sum(1 for row in historical_rows if "falso_positivo" in row["evaluador_a_clasificacion"])

    by_source = relevance_by_source(historical_rows, population_counts)
    weighted = weighted_relevance(by_source, population_n)
    weighted_ci = stratified_bootstrap_ci(historical_rows, population_counts)
    strict_wilson = wilson_interval(strict_correct, n)

    non_renovate_rows = [row for row in historical_rows if not is_dependency_dashboard(row)]
    renovate_rows = [row for row in historical_rows if is_dependency_dashboard(row)]
    non_renovate_correct = sum(1 for row in non_renovate_rows if row["consenso_final"] == "correcto")
    renovate_correct = sum(1 for row in renovate_rows if row["consenso_final"] == "correcto")

    conservative_counts = Counter(conservative_criticality(row) for row in historical_rows)
    conservative_evaluable = n - conservative_counts["no_aplica"]
    conservative_full = conservative_counts["correcta_plena"]

    detection_criticality = Counter(row["criticality_level"] for row in detection_rows)
    alert_severity = Counter(row["alert_severity"] for row in alert_rows)

    sample_fraction = n / population_n
    high_critical_population = detection_criticality["critical"] + detection_criticality["high"]

    result = {
        "metadata": {
            "confidence_level": CONFIDENCE_LEVEL,
            "bootstrap_iterations": BOOTSTRAP_ITERATIONS,
            "random_seed": RANDOM_SEED,
            "population_frame": "REV46 extended campaign",
            "population_inclusion_criterion": "social_mentions.collected_at between 2026-09-25 18:48:00+00 and 2026-09-29 19:31:05.363840+00",
            "sample_source": "REV37/REV45 historical audit matrix",
        },
        "input_hashes": {
            str(HISTORICAL_MATRIX.relative_to(BASE_DIR)): sha256(HISTORICAL_MATRIX),
            str(POPULATION_REV46.relative_to(BASE_DIR)): sha256(POPULATION_REV46),
            str(DETECTIONS_REV46.relative_to(BASE_DIR)): sha256(DETECTIONS_REV46),
            str(ALERTS_REV46.relative_to(BASE_DIR)): sha256(ALERTS_REV46),
        },
        "population": {
            "n": population_n,
            "counts_by_source": dict(sorted(population_counts.items())),
            "detections_by_criticality": dict(sorted(detection_criticality.items())),
            "alerts_by_severity": dict(sorted(alert_severity.items())),
            "high_or_critical_detections": high_critical_population,
            "high_or_critical_detection_rate": high_critical_population / population_n,
        },
        "sample": {
            "n": n,
            "sample_fraction": sample_fraction,
            "counts_by_source": dict(sorted(sample_counts.items())),
        },
        "relevance": {
            "strict_correct": strict_correct,
            "partial": partial,
            "ambiguous": ambiguous,
            "severity_incorrect": severity_incorrect,
            "strict_sample_relevance": strict_correct / n,
            "strict_wilson_ci95": strict_wilson,
            "weighted_relevance_by_population_source": weighted,
            "weighted_stratified_bootstrap_ci95": weighted_ci,
            "by_source": by_source,
            "without_dependency_dashboard": {
                "n": len(non_renovate_rows),
                "correct": non_renovate_correct,
                "strict_relevance": non_renovate_correct / len(non_renovate_rows),
                "high_or_critical_sample_alerts": sum(
                    1 for row in non_renovate_rows if row["criticality_level"] in {"critical", "high"}
                ),
                "wilson_ci95": wilson_interval(non_renovate_correct, len(non_renovate_rows)),
            },
            "dependency_dashboard_only": {
                "n": len(renovate_rows),
                "correct": renovate_correct,
                "strict_relevance": renovate_correct / len(renovate_rows),
                "high_or_critical_sample_alerts": sum(
                    1 for row in renovate_rows if row["criticality_level"] in {"critical", "high"}
                ),
                "wilson_ci95": wilson_interval(renovate_correct, len(renovate_rows)),
            },
        },
        "false_positive_reporting": {
            "consensus_fp": consensus_fp,
            "consensus_fp_rate": consensus_fp / n,
            "evaluator_a_fp": evaluator_a_fp,
            "evaluator_a_fp_rate": evaluator_a_fp / n,
            "recommended_text": "0/200 by consensus; 5/200 = 2.5% according to evaluator A before consensus.",
        },
        "criticality_conservative": {
            "counts": dict(sorted(conservative_counts.items())),
            "evaluable_n": conservative_evaluable,
            "correcta_plena": conservative_full,
            "correcta_plena_rate_evaluable": conservative_full / conservative_evaluable,
            "wilson_ci95": wilson_interval(conservative_full, conservative_evaluable),
            "interpretation": "Consistency with the audited artifact among evaluable cases; not an independent validation of severity.",
        },
    }

    OUTPUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUTPUT_MD.write_text(render_markdown(result), encoding="utf-8")

    print(f"Wrote {OUTPUT_JSON}")
    print(f"Wrote {OUTPUT_MD}")


def render_ci(ci: dict[str, float]) -> str:
    return f"{pct(ci['lower']):.1f}%–{pct(ci['upper']):.1f}%"


def render_markdown(result: dict) -> str:
    population = result["population"]
    sample = result["sample"]
    relevance = result["relevance"]
    fp = result["false_positive_reporting"]
    crit = result["criticality_conservative"]

    lines = [
        "# Métricas de auditoría REV46",
        "",
        "Este informe recalcula métricas principales usando la población congelada REV46 y la matriz histórica auditada de 200 casos.",
        "",
        "## Marco poblacional",
        "",
        f"- Población REV46: **{population['n']} menciones**.",
        f"- Muestra auditada: **{sample['n']} casos** ({pct(sample['sample_fraction']):.1f}% de la población REV46).",
        f"- Detecciones high/critical en población REV46: **{population['high_or_critical_detections']}** ({pct(population['high_or_critical_detection_rate']):.1f}%).",
        "",
        "### Población y muestra por fuente",
        "",
        "| Fuente | Población REV46 | Muestra | Correctos | Pertinencia muestral |",
        "|---|---:|---:|---:|---:|",
    ]

    for source, values in sorted(relevance["by_source"].items()):
        lines.append(
            f"| {source} | {values['population_n']} | {values['sample_n']} | "
            f"{values['correct']} | {pct(values['sample_relevance']):.1f}% |"
        )

    lines.extend(
        [
            "",
            "## Pertinencia",
            "",
            f"- Pertinencia estricta de la muestra: **{relevance['strict_correct']}/{sample['n']} = {pct(relevance['strict_sample_relevance']):.1f}%** "
            f"(Wilson IC95%: {render_ci(relevance['strict_wilson_ci95'])}).",
            f"- Estimador ponderado por fuente sobre población REV46: **{pct(relevance['weighted_relevance_by_population_source']):.1f}%** "
            f"(bootstrap estratificado IC95%: {render_ci(relevance['weighted_stratified_bootstrap_ci95'])}).",
            f"- Sin Dependency Dashboard: **{relevance['without_dependency_dashboard']['correct']}/{relevance['without_dependency_dashboard']['n']} = {pct(relevance['without_dependency_dashboard']['strict_relevance']):.1f}%** "
            f"(Wilson IC95%: {render_ci(relevance['without_dependency_dashboard']['wilson_ci95'])}).",
            f"- Solo Dependency Dashboard: **{relevance['dependency_dashboard_only']['correct']}/{relevance['dependency_dashboard_only']['n']} = {pct(relevance['dependency_dashboard_only']['strict_relevance']):.1f}%** "
            f"(Wilson IC95%: {render_ci(relevance['dependency_dashboard_only']['wilson_ci95'])}).",
            "",
            "## Falsos positivos",
            "",
            f"- Consenso: **{fp['consensus_fp']}/{sample['n']} = {pct(fp['consensus_fp_rate']):.1f}%**.",
            f"- Evaluador A antes del consenso: **{fp['evaluator_a_fp']}/{sample['n']} = {pct(fp['evaluator_a_fp_rate']):.1f}%**.",
            "- Redacción recomendada: `0/200 por consenso; 5/200 = 2,5% según el evaluador A antes del consenso`.",
            "",
            "## Criticidad conservadora",
            "",
            f"- Correcta plena: **{crit['correcta_plena']}/{crit['evaluable_n']} = {pct(crit['correcta_plena_rate_evaluable']):.1f}%** "
            f"(Wilson IC95%: {render_ci(crit['wilson_ci95'])}).",
            f"- Conteos conservadores: `{crit['counts']}`.",
            "- Interpretación: consistencia con el artefacto auditado entre casos evaluables; no validación independiente de severidad.",
            "",
            "## Reproducción",
            "",
            f"- Iteraciones bootstrap: {result['metadata']['bootstrap_iterations']}.",
            f"- Semilla: {result['metadata']['random_seed']}.",
            "- Salida estructurada: `metricas_auditoria_REV46.json`.",
        ]
    )

    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    main()
