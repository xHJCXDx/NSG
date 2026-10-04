# Matriz de claims bibliográficos REV46

Esta matriz documenta los claims bibliográficos principales usados en la tesis REV46 y sus límites de comparabilidad. No reemplaza la bibliografía formal; sirve como control de auditoría para evitar afirmaciones absolutas o métricas no comparables.

## Regla de interpretación

Las referencias académicas se usan como contexto del estado del arte y contraste conceptual. No se usan para afirmar superioridad cuantitativa directa de NSG, porque difieren en corpus, tarea, ventana temporal, fuente de datos, ground truth y métrica objetivo.

## Claims principales

| Referencia | Claim usado en REV46 | Métrica o evidencia citada | Límite declarado |
|---|---|---|---|
| Sun et al. (2023) | CTI mining combina adquisición, procesamiento, análisis y distribución de inteligencia para defensa proactiva. | Survey en IEEE Communications Surveys & Tutorials. | Sirve como marco general; no es baseline experimental comparable con NSG. |
| Park & Kwon (2022) | La combinación de análisis textual y detección de comunidades puede mejorar la detección respecto de frecuencia de palabras clave en redes sociales. | Mejora reportada de hasta 29,46% frente a detección por frecuencia de palabras clave. | No equivale a pertinencia temática, recall ni precisión de NSG; tarea y corpus son distintos. |
| Marinho & Holanda (2023) | NLP aplicado a fuentes abiertas puede identificar y perfilar amenazas emergentes con integración a bases de conocimiento. | F1 reportado de 77% en perfilado automatizado de amenazas emergentes. | No es directamente comparable con la métrica de pertinencia temática de NSG ni con severidad operacional. |
| MISP / OpenCTI / TheHive | Existen plataformas CTI maduras con mayor cobertura funcional que un prototipo académico. | Documentación pública de plataformas y funcionalidades. | NSG no afirma competir en cobertura, soporte empresarial ni madurez operativa. |
| Liu et al. (2025) | Los LLMs pueden actuar como copilotos de inteligencia de amenazas. | Preprint arXiv 2025. | Se cita como línea futura; no como componente implementado ni validado por NSG. |
| Mezzi et al. (2025) | Los LLMs presentan riesgos de confiabilidad para CTI. | Preprint arXiv 2025 sobre confiabilidad en CTI. | Se usa para justificar cautela futura; no invalida la evaluación actual basada en heurísticas. |
| Tian et al. (2025) | Los LLMs tienen aplicaciones emergentes en ciberseguridad. | Survey arXiv 2025. | Contexto prospectivo; no se usa para afirmar desempeño actual del prototipo. |

## Claims que no deben hacerse

| Claim prohibido | Motivo |
|---|---|
| NSG supera cuantitativamente a Park & Kwon o Marinho & Holanda. | Las métricas, fuentes y tareas no son homogéneas. |
| El 95,0% de pertinencia temática equivale a detección de amenazas accionables. | El criterio de auditoría acepta contenido relacionado con seguridad, no amenaza operacional confirmada. |
| La criticidad de NSG está validada como severidad real. | La criticidad es heurística y sensible al artefacto de matching por subcadena. |
| El corpus exploratorio REV46 demuestra recall global. | Es cobertura exploratoria monofuente sobre 20 casos preservados. |
| La nueva evaluación ciega valida acuerdo humano robusto. | La pertinencia amplia es alta, pero el κ inter-evaluador es bajo/cercano a cero. |

## Referencias cruzadas en tesis

| Sección REV46 | Uso |
|---|---|
| Capítulo 5 | Estado del arte y comparación contextual. |
| §9.2 | Interpretación de pertinencia temática y criticidad heurística. |
| §9.6.10 | Limitaciones metodológicas y controles ciegos. |
| §10.1.4 | Limitaciones finales y alcance de validez. |
| §10.5 | Conclusión final con prudencia interpretativa. |
