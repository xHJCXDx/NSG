# Tabla de Contingencia y Cálculo de Cohen's κ

**Fuente de datos:** `Matriz_Auditoria_Fase2_REV37.csv` (n=200)
**Evaluador A:** Tomás Morales (estudiante de Ingeniería en Sistemas de Información, UTN FRM)
**Evaluador B:** Camila Alaggia (estudiante de Ingeniería en Sistemas de Información, UTN FRM)
**Fecha de generación:** Septiembre 2026

---

## 1. Tabla de Contingencia — Clasificación (4 categorías)

|  | **B: ambiguo** | **B: correcto** | **B: sev_incorrecta** | **Total A** |
|---|---:|---:|---:|---:|
| **A: ambiguo** | 2 | 0 | 0 | **2** |
| **A: correcto** | 1 | 190 | 1 | **192** |
| **A: falso_positivo** | 5 | 0 | 0 | **5** |
| **A: sev_incorrecta** | 1 | 0 | 0 | **1** |
| **Total B** | **9** | **190** | **1** | **200** |

### Cálculo de κ (clasificación)

- **Acuerdo observado (p_o):** (2 + 190 + 0) / 200 = 192/200 = **0,9600**
- **Acuerdo esperado por azar (p_e):**
  - P(A=ambiguo) × P(B=ambiguo) = (2/200) × (9/200) = 0,0005
  - P(A=correcto) × P(B=correcto) = (192/200) × (190/200) = 0,9120
  - P(A=falso_positivo) × P(B=falso_positivo) = (5/200) × (0/200) = 0,0000
  - P(A=sev_incorrecta) × P(B=sev_incorrecta) = (1/200) × (1/200) = 0,0000
  - **p_e = 0,9125**
- **κ = (p_o − p_e) / (1 − p_e) = (0,9600 − 0,9125) / (1 − 0,9125) = 0,0475 / 0,0875 = 0,5429**

**Interpretación:** κ = 0,54 corresponde a acuerdo moderado (Landis y Koch, 1977). La alta concentración en la categoría "correcto" (190/200) comprime el rango teórico de κ: con estas distribuciones marginales, el κ máximo alcanzable es ~0,78. El valor observado de 0,54 refleja que las discrepancias se concentran en los 10 registros no clasificados como "correcto" por ambos evaluadores.

---

## 2. Tabla de Contingencia — Criticidad (binaria: sí/no/no_aplica)

|  | **B: no** | **B: no_aplica** | **B: parcial** | **B: si** | **Total A** |
|---|---:|---:|---:|---:|---:|
| **A: no** | 0 | 0 | 0 | 1 | **1** |
| **A: no_aplica** | 0 | 5 | 0 | 0 | **5** |
| **A: parcial** | 0 | 0 | 2 | 0 | **2** |
| **A: si** | 1 | 0 | 0 | 191 | **192** |
| **Total B** | **1** | **5** | **2** | **192** | **200** |

### Cálculo de κ (criticidad)

- **Acuerdo observado (p_o):** (0 + 5 + 2 + 191) / 200 = 198/200 = **0,9900**
- **Acuerdo esperado por azar (p_e):**
  - P(A=no) × P(B=no) = (1/200) × (1/200) = 0,0000
  - P(A=no_aplica) × P(B=no_aplica) = (5/200) × (5/200) = 0,0006
  - P(A=parcial) × P(B=parcial) = (2/200) × (2/200) = 0,0001
  - P(A=si) × P(B=si) = (192/200) × (192/200) = 0,9216
  - **p_e = 0,9224**
- **κ = (p_o − p_e) / (1 − p_e) = (0,9900 − 0,9224) / (1 − 0,9224) = 0,0676 / 0,0776 = 0,8712**

**Interpretación:** κ = 0,87 corresponde a acuerdo casi perfecto (Landis y Koch, 1977). Los evaluadores concuerdan en la evaluación de criticidad de 198 de 200 registros.

---

## 3. Resumen

| Variable | Acuerdo simple | κ | Interpretación (Landis & Koch) |
|----------|---:|---:|---|
| Clasificación (4 cat.) | 96,0% | 0,54 | Moderado |
| Criticidad | 99,0% | 0,87 | Casi perfecto |

**Nota metodológica:** El κ = 0,54 para clasificación es estadísticamente explicable por la distribución concentrada (95% en una categoría), pero es insuficiente como control de sesgo de aquiescencia sin evaluación ciega. Ambos evaluadores son externos al proyecto (no el autor del sistema), lo que reduce el conflicto de interés directo (ver §9.6.10 de la tesis).

---

## 4. Script de verificación

```python
import csv
from collections import Counter

with open('Matriz_Auditoria_Fase2_REV37.csv') as f:
    rows = list(csv.DictReader(f))

n = len(rows)

# Clasificación
a = [r['evaluador_a_clasificacion'] for r in rows]
b = [r['evaluador_b_clasificacion'] for r in rows]
labels = sorted(set(a + b))
po = sum(1 for x, y in zip(a, b) if x == y) / n
ac, bc = Counter(a), Counter(b)
pe = sum((ac[l]/n) * (bc[l]/n) for l in labels)
kappa = (po - pe) / (1 - pe)
print(f"Clasificación: po={po:.4f}, pe={pe:.4f}, κ={kappa:.4f}")

# Criticidad
a2 = [r['evaluador_a_criticidad'] for r in rows]
b2 = [r['evaluador_b_criticidad'] for r in rows]
labels2 = sorted(set(a2 + b2))
po2 = sum(1 for x, y in zip(a2, b2) if x == y) / n
ac2, bc2 = Counter(a2), Counter(b2)
pe2 = sum((ac2[l]/n) * (bc2[l]/n) for l in labels2)
kappa2 = (po2 - pe2) / (1 - pe2)
print(f"Criticidad: po={po2:.4f}, pe={pe2:.4f}, κ={kappa2:.4f}")
```
