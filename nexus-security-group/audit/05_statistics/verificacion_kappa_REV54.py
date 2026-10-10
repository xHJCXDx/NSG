"""
Verificación independiente de Cohen's κ y métricas de auditoría REV46.

Recalcula desde los CSV fuente todas las métricas inter-evaluador reclamadas
en la tesis y compara contra los valores declarados.

Uso:
    python3 verificacion_kappa_REV54.py
"""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

AUDIT_DIR = Path(__file__).resolve().parents[4] / "NSG" / "nexus-security-group" / "audit"
HISTORICAL_CSV = AUDIT_DIR / "01_historical_audit" / "Matriz_Auditoria_Fase2_REV37.csv"
BLIND_REV46_CSV = AUDIT_DIR / "03_blind_evaluation" / "rev46_new_evaluation" / "Resultados_Nueva_Evaluacion_Ciega_REV46.csv"
METRICS_JSON = AUDIT_DIR / "05_statistics" / "metricas_auditoria_REV46.json"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def cohen_kappa(
    a_values: list[str], b_values: list[str]
) -> dict[str, object]:
    """Calculate Cohen's kappa with full contingency table."""
    n = len(a_values)
    assert n == len(b_values), f"Length mismatch: {n} vs {len(b_values)}"

    labels = sorted(set(a_values) | set(b_values))

    # Build contingency table
    table: dict[str, dict[str, int]] = {a: {b: 0 for b in labels} for a in labels}
    for a, b in zip(a_values, b_values):
        table[a][b] += 1

    # Marginals
    row_totals = {a: sum(table[a].values()) for a in labels}
    col_totals = {b: sum(table[a][b] for a in labels) for b in labels}

    # Observed agreement
    agree = sum(table[l][l] for l in labels)
    p_o = agree / n

    # Expected agreement
    p_e_terms = {}
    p_e = 0.0
    for l in labels:
        term = (row_totals[l] / n) * (col_totals[l] / n)
        p_e_terms[l] = term
        p_e += term

    # Kappa
    if p_e == 1.0:
        kappa = 0.0
    else:
        kappa = (p_o - p_e) / (1 - p_e)

    return {
        "n": n,
        "labels": labels,
        "table": table,
        "row_totals": row_totals,
        "col_totals": col_totals,
        "agree": agree,
        "p_o": p_o,
        "p_e": p_e,
        "p_e_terms": p_e_terms,
        "kappa": kappa,
    }


def print_contingency(result: dict, title: str) -> None:
    labels = result["labels"]
    table = result["table"]
    row_totals = result["row_totals"]
    col_totals = result["col_totals"]
    n = result["n"]

    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")

    # Header
    col_width = max(len(l) for l in labels) + 2
    header = f"{'A \\ B':<{col_width}}" + "".join(f"{l:>{col_width}}" for l in labels) + f"{'Total':>{col_width}}"
    print(header)
    print("-" * len(header))

    for a in labels:
        row = f"{a:<{col_width}}"
        for b in labels:
            row += f"{table[a][b]:>{col_width}}"
        row += f"{row_totals[a]:>{col_width}}"
        print(row)

    # Totals row
    totals_row = f"{'Total':<{col_width}}"
    for b in labels:
        totals_row += f"{col_totals[b]:>{col_width}}"
    totals_row += f"{n:>{col_width}}"
    print("-" * len(header))
    print(totals_row)

    print(f"\nAgreement cells (diagonal): {result['agree']}/{n}")
    print(f"p_o = {result['agree']}/{n} = {result['p_o']:.6f}")
    print(f"\np_e calculation:")
    for l in labels:
        term = result["p_e_terms"][l]
        print(f"  P(A={l}) x P(B={l}) = ({row_totals[l]}/{n}) x ({col_totals[l]}/{n}) = {term:.6f}")
    print(f"  p_e = {result['p_e']:.6f}")
    print(f"\nκ = (p_o - p_e) / (1 - p_e) = ({result['p_o']:.6f} - {result['p_e']:.6f}) / (1 - {result['p_e']:.6f})")
    print(f"κ = {result['p_o'] - result['p_e']:.6f} / {1 - result['p_e']:.6f}")
    print(f"κ = {result['kappa']:.6f}")


def verify_claim(label: str, claimed: float, calculated: float, tolerance: float = 0.005) -> None:
    match = abs(claimed - calculated) <= tolerance
    status = "MATCH" if match else "MISMATCH"
    symbol = "✓" if match else "✗"
    print(f"\n  {symbol} {label}: claimed={claimed:.4f}, calculated={calculated:.6f}  [{status}]")
    if not match:
        print(f"    DIFFERENCE: {calculated - claimed:+.6f}")


def main() -> None:
    print("=" * 70)
    print("  INDEPENDENT VERIFICATION OF COHEN'S κ AND AUDIT METRICS")
    print("  Source: REV54 verification script")
    print("=" * 70)

    # ── 1. Historical matrix (non-blind) ──
    hist = read_csv(HISTORICAL_CSV)
    n_hist = len(hist)
    unique_ids = len(set(r["detection_id"] for r in hist))
    print(f"\n[1] Historical matrix: {HISTORICAL_CSV.name}")
    print(f"    Rows parsed: {n_hist}")
    print(f"    Unique detection_id: {unique_ids}")
    verify_claim("n (unique records)", 200, n_hist)

    # ── 1a. Classification κ (non-blind) ──
    a_clasif = [r["evaluador_a_clasificacion"] for r in hist]
    b_clasif = [r["evaluador_b_clasificacion"] for r in hist]
    result_clasif = cohen_kappa(a_clasif, b_clasif)
    print_contingency(result_clasif, "NON-BLIND: Classification (evaluador_a vs evaluador_b)")
    verify_claim("κ classification (non-blind)", 0.54, result_clasif["kappa"], tolerance=0.005)

    # ── 1b. Criticality κ (non-blind) ──
    a_crit = [r["evaluador_a_criticidad"] for r in hist]
    b_crit = [r["evaluador_b_criticidad"] for r in hist]
    result_crit = cohen_kappa(a_crit, b_crit)
    print_contingency(result_crit, "NON-BLIND: Criticality (evaluador_a vs evaluador_b)")
    verify_claim("κ criticality (non-blind)", 0.87, result_crit["kappa"], tolerance=0.005)

    # ── 1c. Relevance 190/200 ──
    correct_count = sum(1 for r in hist if r["consenso_final"] == "correcto")
    print(f"\n  Relevance: consenso_final == 'correcto': {correct_count}/{n_hist} = {correct_count/n_hist:.4f}")
    verify_claim("strict relevance rate", 0.95, correct_count / n_hist)

    # ── 1d. False positives by consensus ──
    fp_consensus = sum(1 for r in hist if "falso_positivo" in r["consenso_final"])
    print(f"\n  False positives by consensus: {fp_consensus}/{n_hist}")
    verify_claim("FP consensus rate", 0.0, fp_consensus / n_hist)

    # ── 1e. Criticality consistency ──
    # From JSON: 191/195 correcta_plena among evaluable
    no_aplica = sum(1 for r in hist if r["evaluador_a_criticidad"] == "no_aplica" and r["evaluador_b_criticidad"] == "no_aplica")
    evaluable = n_hist - no_aplica
    # "correcta_plena" = both evaluators say "si"
    correcta_plena = sum(1 for r in hist if r["evaluador_a_criticidad"] == "si" and r["evaluador_b_criticidad"] == "si")
    print(f"\n  Criticality consistency (conservative):")
    print(f"    no_aplica (both): {no_aplica}")
    print(f"    evaluable: {evaluable}")
    print(f"    correcta_plena (both 'si'): {correcta_plena}")
    print(f"    rate: {correcta_plena}/{evaluable} = {correcta_plena/evaluable:.4f}")
    verify_claim("criticality consistency rate", 0.979, correcta_plena / evaluable, tolerance=0.005)
    # The claim is 191/195 = 97.9%, but let me check exact numbers
    print(f"    Claimed: 191/195 = {191/195:.4f}")
    print(f"    Calculated: {correcta_plena}/{evaluable} = {correcta_plena/evaluable:.4f}")

    # ── 2. Blind evaluation REV46 ──
    blind = read_csv(BLIND_REV46_CSV)
    n_blind = len(blind)
    unique_blind = len(set(r["sample_id"] for r in blind))
    evaluators = sorted(set(r["evaluador"] for r in blind))
    print(f"\n\n{'=' * 70}")
    print(f"[2] Blind evaluation REV46: {BLIND_REV46_CSV.name}")
    print(f"    Total rows: {n_blind}")
    print(f"    Unique sample_ids: {unique_blind}")
    print(f"    Evaluators: {evaluators}")
    print(f"    Each evaluator rated {unique_blind} cases -> {n_blind} total rows")

    # ── 2a. Strict blind relevance 143/200 ──
    strict_relevant = sum(1 for r in blind if r["pertinencia_evaluador"] == "si")
    print(f"\n  Strict relevance (pertinencia == 'si'): {strict_relevant}/{n_blind}")
    verify_claim("strict blind relevance", 143 / 200, strict_relevant / n_blind)

    # ── 2b. Broad blind relevance 183/200 ──
    broad_relevant = sum(1 for r in blind if r["pertinencia_evaluador"] in {"si", "parcial"})
    print(f"  Broad relevance (pertinencia in {{'si','parcial'}}): {broad_relevant}/{n_blind}")
    verify_claim("broad blind relevance", 183 / 200, broad_relevant / n_blind)

    # ── 2c. Inter-evaluator κ (blind) ──
    # Split by evaluator
    by_evaluator: dict[str, dict[str, dict[str, str]]] = {}
    for r in blind:
        ev = r["evaluador"]
        sid = r["sample_id"]
        if ev not in by_evaluator:
            by_evaluator[ev] = {}
        by_evaluator[ev][sid] = r

    ev_names = sorted(by_evaluator.keys())
    assert len(ev_names) == 2, f"Expected 2 evaluators, got {ev_names}"
    left_name, right_name = ev_names[0], ev_names[1]
    left_data, right_data = by_evaluator[left_name], by_evaluator[right_name]
    shared_ids = sorted(set(left_data) & set(right_data))
    print(f"\n  Shared cases between {left_name} and {right_name}: {len(shared_ids)}")

    # Pertinence κ
    left_pert = [left_data[sid]["pertinencia_evaluador"] for sid in shared_ids]
    right_pert = [right_data[sid]["pertinencia_evaluador"] for sid in shared_ids]
    result_pert = cohen_kappa(left_pert, right_pert)
    print_contingency(result_pert, f"BLIND REV46: Pertinence ({left_name} vs {right_name})")
    verify_claim("κ pertinence (blind REV46)", -0.078, result_pert["kappa"], tolerance=0.005)

    # Criticality κ
    left_crit_blind = [left_data[sid]["criticidad_evaluador"] for sid in shared_ids]
    right_crit_blind = [right_data[sid]["criticidad_evaluador"] for sid in shared_ids]
    result_crit_blind = cohen_kappa(left_crit_blind, right_crit_blind)
    print_contingency(result_crit_blind, f"BLIND REV46: Criticality ({left_name} vs {right_name})")
    verify_claim("κ criticality (blind REV46)", 0.027, result_crit_blind["kappa"], tolerance=0.005)

    # ── Summary ──
    print(f"\n\n{'=' * 70}")
    print("  VERIFICATION SUMMARY")
    print(f"{'=' * 70}")

    claims = [
        ("n = 200 unique records", 200, n_hist),
        ("κ = 0.54 (classification, non-blind)", 0.54, round(result_clasif["kappa"], 4)),
        ("κ = 0.87 (criticality, non-blind)", 0.87, round(result_crit["kappa"], 4)),
        ("190/200 = 95.0% relevance (non-blind)", 0.95, correct_count / n_hist),
        ("0/200 = 0% FP by consensus", 0.0, fp_consensus / n_hist),
        (f"{correcta_plena}/{evaluable} criticality consistency", 191 / 195, correcta_plena / evaluable),
        ("143/200 = 71.5% strict blind relevance", 143 / 200, strict_relevant / n_blind),
        ("183/200 = 91.5% broad blind relevance", 183 / 200, broad_relevant / n_blind),
        ("κ = -0.078 (pertinence, blind REV46)", -0.078, round(result_pert["kappa"], 3)),
        ("κ = 0.027 (criticality, blind REV46)", 0.027, round(result_crit_blind["kappa"], 3)),
    ]

    all_match = True
    for label, claimed, calculated in claims:
        match = abs(claimed - calculated) <= 0.005
        symbol = "✓" if match else "✗"
        if not match:
            all_match = False
        print(f"  {symbol} {label}")
        print(f"    claimed: {claimed}  |  calculated: {calculated}")

    print(f"\n{'=' * 70}")
    if all_match:
        print("  ALL CLAIMS VERIFIED SUCCESSFULLY")
    else:
        print("  SOME CLAIMS DO NOT MATCH — SEE DETAILS ABOVE")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
