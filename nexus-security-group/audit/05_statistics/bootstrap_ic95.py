"""
Bootstrap IC95% — Cálculo de intervalos de confianza para métricas de auditoría.

Fuente: Matriz_Auditoria_Fase2_REV37.csv (n=200)
Método: Bootstrap con reemplazo, 10.000 iteraciones
Referencia: §9.1.3, §9.6.9 de la tesis

Uso:
    python3 bootstrap_ic95.py

Salida:
    Precisión operacional, proporción FP, criticidad correcta — cada una con IC95%.
"""

import csv
import random
import os

random.seed(42)  # Reproducibilidad
N_ITERATIONS = 10_000

# Leer la matriz
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, "..", "01_historical_audit", "Matriz_Auditoria_Fase2_REV37.csv")

with open(csv_path) as f:
    rows = list(csv.DictReader(f))

n = len(rows)
print(f"Registros cargados: {n}")
print(f"Iteraciones bootstrap: {N_ITERATIONS}")
print()

# ============================================================
# Métricas observadas
# ============================================================

# Precisión operacional: consenso_final == "correcto"
correctos = [1 if r["consenso_final"] == "correcto" else 0 for r in rows]
precision_obs = sum(correctos) / n

# Proporción de FP: consenso_final contiene "falso_positivo"
fp = [1 if "falso_positivo" in r["consenso_final"] else 0 for r in rows]
fp_obs = sum(fp) / n

# Criticidad correcta: consenso_criticidad == "si" (entre evaluables)
evaluables_crit = [(r, 1 if r["consenso_criticidad"] == "si" else 0)
                   for r in rows if r["consenso_criticidad"] != "no_aplica"]
crit_correctas = [x[1] for x in evaluables_crit]
n_evaluables = len(crit_correctas)
crit_obs = sum(crit_correctas) / n_evaluables if n_evaluables > 0 else 0

print(f"=== Métricas observadas ===")
print(f"Precisión operacional: {sum(correctos)}/{n} = {precision_obs:.1%}")
print(f"Proporción FP (consenso): {sum(fp)}/{n} = {fp_obs:.1%}")
print(f"Criticidad correcta: {sum(crit_correctas)}/{n_evaluables} = {crit_obs:.1%}")
print()

# ============================================================
# Bootstrap
# ============================================================

def bootstrap_ci(data, n_iter=N_ITERATIONS, ci=0.95):
    """Calcula IC por percentiles bootstrap."""
    estimates = []
    n = len(data)
    for _ in range(n_iter):
        sample = random.choices(data, k=n)
        estimates.append(sum(sample) / n)
    estimates.sort()
    lower_idx = int((1 - ci) / 2 * n_iter)
    upper_idx = int((1 + ci) / 2 * n_iter)
    return estimates[lower_idx], estimates[upper_idx]


# Precisión
prec_lo, prec_hi = bootstrap_ci(correctos)
print(f"=== Bootstrap IC95% (10.000 iteraciones) ===")
print(f"Precisión operacional: {precision_obs:.1%} [{prec_lo:.1%} – {prec_hi:.1%}]")

# FP
fp_lo, fp_hi = bootstrap_ci(fp)
print(f"Proporción FP: {fp_obs:.1%} [{fp_lo:.1%} – {fp_hi:.1%}]")

# Criticidad
crit_lo, crit_hi = bootstrap_ci(crit_correctas)
print(f"Criticidad correcta: {crit_obs:.1%} [{crit_lo:.1%} – {crit_hi:.1%}]")

print()

# ============================================================
# Test de proporción unilateral (§9.6.9)
# H0: p <= 0.80, H1: p > 0.80
# ============================================================

import math

p0 = 0.80
p_hat = precision_obs
se = math.sqrt(p0 * (1 - p0) / n)
z = (p_hat - p0) / se
# p-value para test unilateral
# Aproximación normal
from statistics import NormalDist
p_value = 1 - NormalDist().cdf(z)

print(f"=== Test de proporción unilateral ===")
print(f"H0: p ≤ {p0:.0%}, H1: p > {p0:.0%}")
print(f"p_hat = {p_hat:.4f}, z = {z:.4f}, p-value = {p_value:.6f}")
print(f"Resultado: {'Rechaza H0' if p_value < 0.05 else 'No rechaza H0'} (α=0.05)")
print(f"LI del IC95% ({prec_lo:.1%}) {'>' if prec_lo > p0 else '<='} {p0:.0%}")
