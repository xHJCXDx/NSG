# Escenarios automáticos (REV76)

Pruebas de los escenarios del Anexo E que se pueden ejecutar sin levantar el sistema. El inventario completo de los 31 escenarios, con su método, la previsión según la matriz y la columna «Observado», está en `audit/rev76_verificacion/escenarios.md`.

## Cómo se ejecutan

Desde la raíz del repositorio (`nexus-security-group/`):

```sh
sh tests/scenarios/run_scenarios.sh
```

Requiere Node.js 22 o superior y las dependencias del backend (`backend/requirements.txt`). El comando termina con código 0 solo si todas las pruebas dan el resultado previsto.

## Qué cubre

| Escenario | Prueba | Qué ejecuta |
|---|---|---|
| E01–E05 | `tests/scenarios/classification.test.mjs` | Código del nodo «Classify Threat» con las entradas de la Tabla E1. E05 evalúa el bloque de umbrales del nodo, porque ningún insumo da 19, 39 o 59 (todos los pesos son múltiplos de 5) |
| E09 (parte automática) | `tests/workflow/overlap_no_overwrite.test.mjs` | Las inserciones usan `ON CONFLICT … DO NOTHING`. La superposición real se ejecuta en A8 |
| E18 (parcial) | `tests/scenarios/sources.test.mjs` | La consulta a Hacker News pide 50 ítems. La llegada de 60 historias no se puede provocar |
| E20 | `tests/scenarios/sources.test.mjs` | «Parse GitHub Issues» con `incomplete_results: true` |
| E31 | `tests/scenarios/sources.test.mjs` | «Parse Items» con una historia de Hacker News |
| E12 (adaptado) | `backend/tests/test_threats_router.py::test_review_threat_rejects_user_without_threats_write_permission` | Rechazo de la revisión sin `threats:write`. El rol `viewer` no existe, así que se usa un usuario sin ese permiso |
| E13 | `backend/tests/test_scenarios.py` | Token vigente de un usuario dado de baja contra un endpoint protegido |

## Fallas esperadas

Cada prueba afirma el resultado que exige la tesis. Cuando el prototipo no lo cumple y la matriz lo declara, la prueba se marca como **falla esperada**:

- En Node, con `expectedFailure()` (`tests/scenarios/expectedFailure.mjs`). El nombre empieza con `[falla esperada]` y la salida muestra las filas declaradas y el motivo.
- En pytest, con `@pytest.mark.xfail(strict=True)`. Aparece como `XFAIL` con las filas declaradas.

Las dos marcas son estrictas: si la regla empieza a cumplirse, la prueba falla y pide quitar la marca y actualizar la matriz. Una falla esperada **no** es evidencia de que el prototipo cumpla: es la constancia de una divergencia declarada.

| Prueba | Filas declaradas |
|---|---|
| E13: el usuario dado de baja con token vigente se rechaza | A-77, R8B-50 |
| E20: la indicación de resultados incompletos se informa aparte | R8A-46, R8B-15, AD-50 |
| E31: el contenido original guardado es el objeto compacto | A-12, R8A-42 |

## Qué no cubre

Los escenarios manuales (E06, E08, E09 en su parte real, E10, E11, E14, E16, E29 y E30) se ejecutan en la corrida de A8 con el sistema levantado. Los no ejecutables (E07, E15, E17, E19 y E21–E28) se declaran en el inventario con su motivo. Ninguna prueba de este directorio simula el protocolo de validación futura.
