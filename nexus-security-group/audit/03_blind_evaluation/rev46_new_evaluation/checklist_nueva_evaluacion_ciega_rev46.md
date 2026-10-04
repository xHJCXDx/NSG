# Checklist — Nueva Evaluación Ciega REV46

## Antes de entregar a evaluadores

- [x] Definir cantidad de evaluadores: dos evaluadores.
- [x] Priorizar evaluadores sin participación previa en auditoría o baseline. Limitación: cualquier familiaridad previa se declara en la tesis y no se usa la evaluación como independencia operacional plena.
- [x] Generar muestra desde la población REV46 aceptada.
- [x] Separar archivo ciego y referencia interna.
- [x] Verificar que el archivo ciego no incluya score, criticidad, keywords ni evaluación previa.
- [x] Enviar `instrucciones_evaluadores_nueva_rev46.md` junto con el CSV ciego.
- [x] Registrar versión del archivo enviado mediante `manifest_muestra_ciega_rev46_nueva.md`.
- [x] Si se usa el consolidado `Muestra_Ciega_Evaluadores_REV46_Nueva_Consolidada_AB.csv`, cargar allí las respuestas solo después de recibirlas por separado o asegurando que cada evaluador no vea las respuestas del otro.

## Durante la evaluación

- [x] Cada evaluador trabaja individualmente.
- [x] No se discuten casos entre evaluadores.
- [x] No se entrega referencia interna.
- [x] Las dudas metodológicas se responden sin revelar salidas del sistema.

## Al recibir respuestas

- [x] Preservar un CSV separado por evaluador.
- [x] Si las respuestas fueron transcriptas al consolidado A/B, ejecutar `extraer_respuestas_consolidadas_rev46.py` para generar los CSV individuales.
- [x] Validar que no falten campos obligatorios.
- [x] Revisar valores permitidos: `si/parcial/no`, `critical/high/medium/low/no_aplica`, `alta/media/baja`.
- [x] Calcular acuerdo inter-evaluador ciego.
- [x] Comparar contra referencia interna solo después de cerrar respuestas.
- [x] Redactar resumen metodológico sin presentar la evidencia como validación operacional completa.

## Entrega y privacidad

- [x] Las constancias firmadas se entregan en papel si contienen datos personales.
- [x] El repositorio conserva solo trazabilidad metodológica y archivos sin firmas personales.
- [x] La tesis declara cualquier familiaridad previa de los evaluadores con el proyecto.

## Resultado final

- Pertinencia temática estricta: 143/200 = 71,5%.
- Pertinencia temática amplia: 183/200 = 91,5%.
- Acuerdo exacto de criticidad contra sistema corregido: 52/200 = 26,0%.
- Acuerdo por banda de alerta contra sistema corregido: 122/200 = 61,0%.
- Acuerdo inter-evaluador bajo: κ_pertinencia = -0,078; κ_criticidad = 0,027; κ_banda = -0,009.

Interpretación: la evaluación complementa la evidencia de prefiltrado temático amplio, pero no valida severidad operacional ni priorización alertable independiente.
