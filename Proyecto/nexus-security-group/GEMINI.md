# Nexus Security Group (NSG) - OSINT Sentiment Analysis Platform

Este proyecto es una plataforma de inteligencia de fuentes abiertas (OSINT) diseñada para recolectar datos (probablemente de redes sociales como Twitter/X), procesar su sentimiento y almacenarlos en una base de datos PostgreSQL. Utiliza **n8n** como motor de orquestación de flujos de trabajo y una API personalizada de Python para el análisis lingüístico.

## Arquitectura del Proyecto

El sistema se compone de tres servicios principales orquestados mediante Docker Compose:

1.  **PostgreSQL (osint-postgres):** Base de datos relacional para el almacenamiento de datos recolectados y resultados de análisis. Se inicializa mediante `init.sql`.
2.  **n8n (osint-n8n):** Herramienta de automatización que ejecuta el flujo definido en `workflow.json`. Incluye un script de entrada personalizado (`n8n-entrypoint.sh`) que importa automáticamente el flujo de trabajo al iniciar.
3.  **Sentiment API (osint-sentiment-api):** Servicio basado en Flask que realiza análisis de sentimientos utilizando un ensamble de **VADER** y **TextBlob**.

## Tecnologías Principales

-   **Backend:** Python 3.9 (Flask, Gunicorn).
-   **Análisis de Sentimientos:** VADER, TextBlob.
-   **Automatización:** n8n.
-   **Base de Datos:** PostgreSQL 15.
-   **Contenerización:** Docker & Docker Compose.

## Configuración y Ejecución

### Requisitos Previos

-   Docker y Docker Compose instalados.
-   Archivo `.env` configurado con las siguientes variables (basado en `docker-compose.yml`):
    -   `POSTGRES_USER`
    -   `POSTGRES_PASSWORD`
    -   `POSTGRES_DB`
    -   `N8N_BASIC_AUTH_USER`
    -   `N8N_BASIC_AUTH_PASSWORD`

### Comandos de Ejecución

-   **Iniciar el proyecto:**
    ```bash
    docker-compose up -d
    ```
-   **Ver estados de los contenedores:**
    ```bash
    docker-compose ps
    ```
-   **Ver logs de la API de sentimientos:**
    ```bash
    docker-compose logs -f sentiment-api
    ```
-   **Detener el proyecto:**
    ```bash
    docker-compose down
    ```

## Convenciones de Desarrollo

### Sentiment API (`/sentiment-api`)
-   La API expone un endpoint principal en `POST /analyze`.
-   Acepta un JSON con un campo `text` o un objeto `tweet_data`.
-   Calcula un `ensemble_score` promediando los resultados de VADER y TextBlob para mayor precisión.
-   Utiliza Gunicorn como servidor de producción en el contenedor.

### Automatización (n8n)
-   El flujo de trabajo se encuentra en `workflow.json`.
-   Cualquier cambio en el flujo dentro de la interfaz de n8n debe ser exportado a este archivo para persistir en el repositorio.
-   El script `n8n-entrypoint.sh` se encarga de la importación automática de flujos al levantar el contenedor.

### Base de Datos
-   El esquema inicial y las tablas se definen en `init.sql`. No modificar este archivo sin actualizar los flujos de n8n correspondientes.

## Comportamiento al trabajar con informes

### Actitud
-   Cuando redactes un informe debes redactarlo en 3° persona de manera profecional, considerate un ingeniero en sistemas. Cita secciones de código si es necesario para una mejor comprensión. El lector debe poder comprender todo por lo tanto no omitas nada. Supone que el lector no entiende sobre el tema pero aun así explica de manera compleja explicando obviamente los términos utilizados(Porque recuerda eres un profecional).

### Al modificar
-   Cuando vayas a redactar no sobre escribas todo, eliminando lo anterior. Solo realiza modificaiones.
