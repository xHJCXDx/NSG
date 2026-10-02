"""
Análisis de Sensibilidad del Componente de Sentimiento — Tabla 9

Fuente: Matriz_Auditoria_Fase2_REV37.csv (n=200)
Referencia: §9.6.9, Tabla 9 de la tesis

Simula el efecto de reemplazar el ensemble (VADER+TextBlob) por cada
componente individual sobre los mismos 200 registros auditados.

Factor 2 del scoring: sentiment_label == "negative" → +15 puntos (§8.1.1).
Umbrales de criticidad: critical ≥ 60, high ≥ 40, medium ≥ 20, low < 20.

Uso:
    python3 ablacion_sentimiento.py
"""

import csv
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, "Matriz_Auditoria_Fase2_REV37.csv")

with open(csv_path) as f:
    rows = list(csv.DictReader(f))

n = len(rows)
print(f"Registros cargados: {n}")
print()


# --- Conteos de sentiment negative por método ---

ens_neg = sum(1 for r in rows if r["sentiment_label"] == "negative")
vader_neg = sum(1 for r in rows if float(r["vader_compound"]) < 0)
tb_neg = sum(1 for r in rows if float(r["textblob_polarity"]) < 0)

print("=== Menciones clasificadas como negative ===")
print(f"  Ensemble (sentiment_label del sistema): {ens_neg}/{n} ({ens_neg/n*100:.1f}%)")
print(f"  VADER solo (compound < 0):              {vader_neg}/{n} ({vader_neg/n*100:.1f}%)")
print(f"  TextBlob solo (polarity < 0):           {tb_neg}/{n} ({tb_neg/n*100:.1f}%)")
print()


# --- Label changes: ensemble vs cada componente ---

def is_negative_binary(label):
    return label == "negative"

change_vader = 0
change_tb = 0

for r in rows:
    ens_is_neg = is_negative_binary(r["sentiment_label"])
    vad_is_neg = float(r["vader_compound"]) < 0
    tb_is_neg = float(r["textblob_polarity"]) < 0

    if ens_is_neg != vad_is_neg:
        change_vader += 1
    if ens_is_neg != tb_is_neg:
        change_tb += 1

print("=== Registros que cambian label de sentimiento ===")
print(f"  Ensemble → VADER solo:    {change_vader}/{n} ({change_vader/n*100:.1f}%)")
print(f"  Ensemble → TextBlob solo: {change_tb}/{n} ({change_tb/n*100:.1f}%)")
print()


# --- Criticality threshold crossings ---

def criticality_level(score):
    if score >= 60:
        return "critical"
    if score >= 40:
        return "high"
    if score >= 20:
        return "medium"
    return "low"


cross_vader = 0
cross_tb = 0
details_vader = []
details_tb = []

for r in rows:
    risk = int(r["risk_score"])
    ens_is_neg = is_negative_binary(r["sentiment_label"])
    vad_is_neg = float(r["vader_compound"]) < 0
    tb_is_neg = float(r["textblob_polarity"]) < 0

    ens_bonus = 15 if ens_is_neg else 0
    base = risk - ens_bonus

    vad_risk = base + (15 if vad_is_neg else 0)
    tb_risk = base + (15 if tb_is_neg else 0)

    ens_crit = criticality_level(risk)
    vad_crit = criticality_level(vad_risk)
    tb_crit = criticality_level(tb_risk)

    if ens_crit != vad_crit:
        cross_vader += 1
        details_vader.append(
            f"  ID {r['detection_id']}: {ens_crit}→{vad_crit} "
            f"(risk {risk}→{vad_risk})"
        )
    if ens_crit != tb_crit:
        cross_tb += 1
        details_tb.append(
            f"  ID {r['detection_id']}: {ens_crit}→{tb_crit} "
            f"(risk {risk}→{tb_risk})"
        )

print("=== Registros que cruzan umbral de criticidad ===")
print(f"  VADER solo:    {cross_vader}/{n}")
print(f"  TextBlob solo: {cross_tb}/{n}")
print()

print(f"=== Impacto máximo en precisión ===")
print(f"  VADER solo:    ≤ {change_vader/n*100:.1f} pp")
print(f"  TextBlob solo: ≤ {change_tb/n*100:.1f} pp")
print()


# --- Score ranges ---

vaders = [float(r["vader_compound"]) for r in rows]
tbs = [float(r["textblob_polarity"]) for r in rows]
fss = [float(r["final_sentiment_score"]) for r in rows]

print("=== Rangos de scores ===")
print(f"  VADER compound:    [{min(vaders):.2f}, {max(vaders):.2f}]")
print(f"  TextBlob polarity: [{min(tbs):.2f}, {max(tbs):.2f}]")
print(f"  Ensemble (fss):    [{min(fss):.2f}, {max(fss):.2f}]")
print()


# --- Detalle de crossings ---

if details_vader:
    print(f"=== Detalle crossings VADER ({len(details_vader)} registros) ===")
    for d in details_vader:
        print(d)
    print()

if details_tb:
    print(f"=== Detalle crossings TextBlob (primeros 10 de {len(details_tb)}) ===")
    for d in details_tb[:10]:
        print(d)
    print(f"  ... ({len(details_tb)} total)")
