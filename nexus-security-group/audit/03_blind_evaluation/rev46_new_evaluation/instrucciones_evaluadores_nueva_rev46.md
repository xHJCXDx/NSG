# Instrucciones para Evaluadores — Nueva Evaluación Ciega REV46

Gracias por participar en la evaluación académica del prototipo NSG. La tarea consiste en revisar registros de fuentes técnicas públicas y clasificarlos según pertinencia temática y criticidad esperada.

## Qué se evalúa

Para cada registro, responder:

1. si el texto está relacionado con seguridad informática;
2. qué criticidad esperada tendría el contenido;
3. qué nivel de confianza tiene la evaluación;
4. una observación breve cuando sea necesario.

## Qué NO se evalúa

No se pide determinar si el sistema funciona bien ni comparar contra una salida automática. El archivo no incluye score, criticidad ni keywords del sistema para preservar la revisión ciega.

## Columnas a completar

| Columna | Valores permitidos | Criterio |
|---|---|---|
| `evaluador` | Nombre o código | Usar el mismo valor en todas las filas. |
| `pertinencia_tematica` | `si`, `parcial`, `no` | Relación del texto con seguridad informática. |
| `criticidad_esperada` | `critical`, `high`, `medium`, `low`, `no_aplica` | Severidad esperada del contenido según juicio humano. |
| `confianza_evaluador` | `alta`, `media`, `baja` | Seguridad del evaluador sobre su respuesta. |
| `observacion` | Texto libre | Breve justificación, obligatoria si hay duda o si la respuesta no es evidente. |

## Rúbrica de pertinencia temática

| Valor | Usar cuando |
|---|---|
| `si` | El texto trata claramente sobre vulnerabilidades, exploits, incidentes, malware, exposición de datos, seguridad de dependencias, hardening o temas similares. |
| `parcial` | El texto menciona seguridad de forma indirecta, ambigua o contextual, pero no permite concluir con claridad. |
| `no` | El texto no tiene relación relevante con seguridad informática. |

## Rúbrica de criticidad esperada

| Valor | Usar cuando |
|---|---|
| `critical` | Indica explotación activa, RCE claro, compromiso severo, fuga crítica, credenciales expuestas o impacto inmediato alto. |
| `high` | Describe vulnerabilidad o riesgo importante, pero sin evidencia clara de explotación inmediata o impacto crítico. |
| `medium` | Señal técnica relevante, issue de dependencia, discusión de seguridad o riesgo moderado que requiere revisión pero no urgencia alta. |
| `low` | Mención menor, informativa, preventiva o de bajo impacto operativo. |
| `no_aplica` | No hay pertinencia temática suficiente para asignar criticidad. |

## Reglas de independencia

- Completar la evaluación de forma individual.
- No discutir casos con otros evaluadores antes de entregar el archivo.
- No buscar la salida del sistema ni pedir orientación al autor durante la clasificación.
- Si se consulta una URL pública para entender contexto, dejarlo indicado en `observacion`.

## Ejemplo de respuesta

| sample_id | source | text_content | pertinencia_tematica | criticidad_esperada | confianza_evaluador | observacion |
|---|---|---|---|---|---|---|
| REV46-NEW-BLIND-EXAMPLE | exploit-db | Public exploit for unauthenticated remote code execution in a web application. | si | critical | alta | Exploit público con RCE no autenticado. |
