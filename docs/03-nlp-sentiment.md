## Exploration: nsg-docs-nlp

### Current State
El sector NLP & Sentiment API está compuesto por un microservicio desarrollado en Python utilizando el framework Flask. La aplicación proporciona capacidades de análisis de sentimientos mediante un enfoque de "Ensemble" que combina dos populares bibliotecas de NLP: `vaderSentiment` y `TextBlob`. El servicio está dockerizado (basado en `python:3.9-slim`) y descarga proactivamente los corpus requeridos por TextBlob en tiempo de construcción (`build`), optimizando los tiempos de arranque.

### Affected Areas
- `sentiment-api/sentiment_api.py` — Contiene la lógica del servidor Flask, el manejo de autenticación mediante Bearer token, truncamiento de textos largos, y la integración directa del análisis semántico dual (VADER + TextBlob).
- `sentiment-api/Dockerfile` — Define el entorno de ejecución, instalación de dependencias y ejecución del microservicio.

### Evaluation of Python Logic & Endpoints
1. **Endpoint `GET /health`**:
   - Devuelve un estado básico y la versión (`1.1`). Su lógica es minimalista pero suficiente para verificaciones de "liveness" en entornos de orquestación (como Kubernetes o Docker Swarm).

2. **Endpoint `POST /analyze`**:
   - **Autenticación**: Implementa seguridad básica. Si la variable de entorno `API_TOKEN` está presente, exige un encabezado `Authorization: Bearer <token>`.
   - **Validación y Truncamiento**: Evalúa que el payload contenga el campo `text`. Para salvaguardar los recursos (memoria/CPU), incorpora un truncamiento explícito en 5000 caracteres, avisando al cliente si el texto fue acortado (`truncated: True`).
   - **Lógica de Integración VADER/TextBlob**: 
     - **VADER**: Especializado en redes sociales, reglas heurísticas y puntuación.
     - **TextBlob**: Proporciona análisis léxico, devolviendo polaridad y subjetividad.
     - **Ensemble Score**: Promedia el valor `compound` de VADER con la `polarity` de TextBlob. Clasifica en `positive` (>= 0.05), `negative` (<= -0.05) o `neutral`.
     - **Confidence Score**: Innovadoramente calcula un nivel de confianza. Cuanto más convergen (se acercan) las predicciones de VADER y TextBlob, mayor es la confianza, la cual se restringe matemáticamente al rango `[0, 1]`.

### Approaches
Dado que el código actual es estable y tiene buenas prácticas defensivas, si se desea evolucionar la arquitectura NLP, se podrían considerar los siguientes enfoques:

1. **Avanzar hacia un modelo basado en Transformers (ej. HuggingFace)** — Reemplazar el enfoque basado en léxicos (VADER/TextBlob) por un modelo pre-entrenado (como RoBERTa o BERT).
   - Pros: Mayor precisión contextual y comprensión semántica.
   - Cons: Mayor consumo de memoria (RAM/VRAM) y latencia más alta, requiere más poder de cómputo.
   - Effort: High

2. **Refactorizar en FastAPI con validación asíncrona** — Migrar de Flask a FastAPI utilizando Pydantic.
   - Pros: Mayor rendimiento en operaciones I/O concurrentes, validación automática de schemas JSON y documentación de API nativa (Swagger UI).
   - Cons: Curva de adaptación menor, reescritura parcial de los endpoints.
   - Effort: Medium

### Recommendation
Se recomienda mantener el enfoque actual de Ensemble (VADER + TextBlob) como la solución baseline, debido a su extrema eficiencia (sin uso intensivo de CPU) y baja latencia, pero migrar el framework web a **FastAPI** (Approach 2) para fortalecer la validación del schema, autogenerar la documentación OpenAPI y preparar el servicio para peticiones asíncronas de mayor volumen en el futuro.

### Risks
- El truncamiento en 5000 caracteres podría cortar abruptamente el significado de documentos más extensos (ej. reportes largos), alterando la polaridad general en lugar de resumirlo.
- `API_TOKEN` estático: Confiar en un solo token centralizado es un riesgo en términos de rotación de credenciales.
- Flask de un solo hilo con VADER/TextBlob puede bloquearse si se reciben demasiadas solicitudes concurrentes largas (limitación del GIL y servidor síncrono predeterminado).

### Ready for Proposal
Yes — la exploración técnica proporciona visibilidad total y detallada del módulo. Informar al usuario que podemos proceder a diseñar la especificación de cambios y proponer la migración a FastAPI o la optimización del manejo de contextos largos.
