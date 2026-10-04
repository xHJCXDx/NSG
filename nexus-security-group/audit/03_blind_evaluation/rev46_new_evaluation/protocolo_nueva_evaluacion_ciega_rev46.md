# Protocolo para Nueva Evaluación Ciega Multi-evaluador REV46

Este protocolo define cómo ejecutar una nueva evaluación ciega para observar pertinencia temática, criticidad esperada y variabilidad humana sin exponer salidas del sistema. El objetivo es corregir la principal limitación de la evaluación ciega parcial previa: haber contado con una sola evaluadora y no permitir estimar acuerdo inter-evaluador ciego.

## Resultado esperado

La nueva evaluación debe producir evidencia trazable sobre:

1. pertinencia temática de las menciones seleccionadas;
2. criticidad esperada según juicio humano ciego respecto de la salida del sistema;
3. acuerdo inter-evaluador ciego;
4. comparación posterior contra la referencia interna del sistema corregido.

No debe presentarse como validación operacional completa de severidad ni como recall global.

## Requisitos mínimos

| Requisito | Mínimo aceptable | Recomendado |
|---|---:|---:|
| Evaluadores | 2 personas | 3 personas |
| Relación con el proyecto | No autoras del sistema | Sin participación previa en auditoría/baseline |
| Muestra | 60 registros | 100 registros |
| Campos ocultos | Score, criticidad, keywords, evaluación previa | También ocultar cualquier referencia al resultado esperado |
| Revisión | Individual y sin discusión previa | Individual, con rúbrica entregada por escrito |
| Evidencia | CSV individual por evaluador | CSV individual + constancia firmada en papel |

Si no se consiguen evaluadores completamente nuevos, debe declararse explícitamente la familiaridad previa como limitación.

## Roles

| Rol | Responsabilidad |
|---|---|
| Autor | Preparar paquete ciego, preservar referencia interna separada y consolidar resultados. No debe orientar respuestas. |
| Evaluadores | Completar la plantilla individualmente, sin ver score, criticidad, keywords ni evaluación previa. |
| Dirección/tribunal | Puede validar que el procedimiento sea suficiente para el alcance académico. |

## Materiales necesarios

- CSV ciego para evaluadores, sin columnas del sistema.
- CSV de referencia interna, reservado para comparación posterior.
- Instrucciones para evaluadores.
- Plantilla de respuestas individual.
- Constancias físicas firmadas en papel, entregadas fuera del repositorio.

## Selección de muestra

La muestra debe derivarse del marco REV46 ya aceptado:

- población reconciliada: 2.102 menciones;
- detecciones asociadas: 2.102;
- ventana: 25/09/2026 18:48 UTC – 29/09/2026 19:31 UTC;
- fuente de evidencia: `audit/08_campaign_reconciliation/`;
- re-auditoría de criticidad corregida: `audit/02_reaudits/`.

Composición recomendada para n=100:

| Estrato | Cantidad recomendada | Motivo |
|---|---:|---|
| `critical/high` corregidos | 40 | Evaluar la zona de alertado operacional. |
| `medium` | 35 | Evaluar casos intermedios donde la criticidad suele ser discutible. |
| `low` | 25 | Controlar si el sistema conserva pertinencia temática sin sobreelevar severidad. |

Si se usa n=60, mantener la misma lógica proporcional: 24 `critical/high`, 21 `medium`, 15 `low`.

## Campos que ve el evaluador

El archivo entregado al evaluador debe contener solo:

| Campo | Descripción |
|---|---|
| `sample_id` | Identificador anónimo del registro. |
| `mention_id` | Identificador interno para trazabilidad posterior. |
| `source` | Fuente pública: GitHub, Hacker News o Exploit-DB. |
| `source_url` | URL pública si existe. |
| `text_content` | Texto a evaluar. |
| `evaluador` | Nombre o código del evaluador. |
| `pertinencia_tematica` | `si`, `parcial` o `no`. |
| `criticidad_esperada` | `critical`, `high`, `medium`, `low` o `no_aplica`. |
| `confianza_evaluador` | `alta`, `media` o `baja`. |
| `observacion` | Justificación breve. Obligatoria si hay duda, `parcial`, `no` o `no_aplica`. |

## Campos que NO debe ver el evaluador

- criticidad asignada por el sistema;
- score de riesgo;
- keywords detectadas;
- clasificación previa;
- consenso anterior;
- resultado de otros evaluadores;
- tabla de referencia interna.

## Procedimiento

1. Congelar la muestra y registrar fecha/hora de generación.
2. Crear un CSV ciego idéntico para cada evaluador.
3. Entregar instrucciones por escrito junto con la plantilla.
4. Solicitar revisión individual, sin discusión entre evaluadores.
5. Recibir un CSV por evaluador.
6. Validar que no haya campos incompletos obligatorios.
7. Comparar respuestas entre evaluadores para calcular acuerdo ciego.
8. Comparar respuestas consolidadas contra la referencia interna del sistema.
9. Redactar resultados como evidencia complementaria, no como validación operacional total.

## Métricas a calcular

| Métrica | Uso |
|---|---|
| Pertinencia temática estricta | Proporción de `si`. |
| Pertinencia temática amplia | Proporción de `si + parcial`. |
| Acuerdo inter-evaluador en pertinencia | Control de consistencia humana. |
| Acuerdo exacto de criticidad | Comparación ordinal estricta. |
| Acuerdo por banda de alerta | `critical/high` vs `medium/low/no_aplica`. |
| Acuerdo contra sistema corregido | Comparación posterior, no visible durante evaluación. |
| Distribución de confianza | Señal de incertidumbre del evaluador. |

## Criterio de interpretación

La evidencia puede fortalecer la tesis si muestra:

- alta pertinencia temática estricta o amplia;
- acuerdo razonable entre evaluadores ciegos;
- convergencia por banda de alerta, aunque no haya acuerdo exacto de criticidad.

La evidencia no debe usarse para afirmar:

- recall global;
- severidad operacional validada;
- superioridad general frente a analistas humanos;
- funcionamiento productivo 24/7.

## Riesgos metodológicos

| Riesgo | Mitigación |
|---|---|
| Evaluadores conocen el proyecto | Declarar familiaridad previa y no vender independencia plena. |
| Discusión entre evaluadores | Instrucción explícita de revisión individual. |
| Muestra sesgada hacia alertas | Usar estratos `critical/high`, `medium` y `low`. |
| Observaciones vacías | Exigir justificación en casos no evidentes. |
| Sobreinterpretación de criticidad | Reportar acuerdo exacto y acuerdo por banda por separado. |

## Cierre documental

Al finalizar, preservar:

- CSV ciego entregado;
- CSV individual completado por cada evaluador;
- CSV de referencia interna;
- CSV de comparación agregada;
- resumen metodológico con métricas;
- constancias físicas en papel, fuera del repositorio si contienen firmas o datos personales.
