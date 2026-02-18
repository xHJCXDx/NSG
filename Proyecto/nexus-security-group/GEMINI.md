# OSINT Monitoring System - Nexus Security Group

## Descripción del Proyecto
Este es un sistema de monitoreo de fuentes abiertas (OSINT) diseñado para recopilar, analizar y alertar sobre menciones en redes sociales relacionadas con amenazas de seguridad. El sistema utiliza una arquitectura basada en microservicios orquestada por Docker Compose, integrando herramientas de automatización de flujos de trabajo, análisis de sentimiento personalizado y almacenamiento relacional robusto.

## Arquitectura y Componentes
El proyecto se compone de tres servicios principales:

1.  **n8n (Orchestrator):** El motor de automatización que gestiona la recopilación de datos de diversas fuentes, invoca la API de sentimiento y coordina el almacenamiento y las alertas en la base de datos.
    *   **Archivo clave:** `workflow.json` (definición del flujo).
    *   **Puerto:** 5678.

2.  **Sentiment API (Python):** Un servicio Flask que realiza análisis de sentimiento utilizando un ensamble de modelos (VADER y TextBlob).
    *   **Ubicación:** `./sentiment-api/`.
    *   **Endpoint principal:** `POST /analyze`.
    *   **Puerto:** 5000.

3.  **PostgreSQL (Database):** Base de datos relacional que almacena menciones, resultados de análisis, detecciones de amenazas y logs de ejecución.
    *   **Archivo clave:** `init.sql` (esquema completo con tablas, índices, vistas materializadas y triggers).
    *   **Puerto:** 5432.

## Tecnologías Principales
- **Orquestación:** n8n, Docker Compose.
- **Backend/ML:** Python 3.9, Flask, VADER, TextBlob, Gunicorn.
- **Base de Datos:** PostgreSQL 15.
- **Infraestructura:** Docker.

## Comandos de Ejecución y Desarrollo

### Requisitos Previos
Configurar las variables de entorno en un archivo `.env` (basado en las referencias de `docker-compose.yml`):
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`

### Levantar el Entorno
```bash
docker-compose up -d
```

### Detener el Entorno
```bash
docker-compose down
```

### Ver Logs de un Servicio
```bash
docker-compose logs -f [n8n|sentiment-api|postgres]
```

## Estructura de la Base de Datos (Tablas Clave)
- `social_mentions`: Registro crudo de menciones de plataformas (Twitter, Reddit, Telegram, etc.).
- `sentiment_analysis`: Resultados detallados del análisis de sentimiento.
- `threat_detections`: Clasificación de menciones como posibles amenazas (malware, phishing, etc.).
- `alerts`: Registro de alertas generadas para su envío por canales como Slack o Email.
- `keywords_monitor`: Listado de palabras clave monitoreadas activamente con estadísticas de match.

## Convenciones de Desarrollo
- **Base de Datos:** El esquema se autogestiona mediante `init.sql`. Cualquier cambio estructural debe reflejarse allí.
- **API de Sentimiento:** Se utiliza un enfoque de "ensamble" para mejorar la precisión, promediando scores de múltiples librerías.
- **Automatización:** Los flujos de trabajo en n8n deben ser idempotentes para evitar duplicación de menciones (gestionado por restricciones de unicidad en la BD).
