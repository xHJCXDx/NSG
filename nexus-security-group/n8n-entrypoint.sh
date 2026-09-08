#!/bin/sh

echo "🔄 Iniciando n8n Auto-Importer..."

# Esperar unos segundos para asegurar que Postgres esté listo (opcional pero recomendado)
sleep 5

if [ -f "/home/node/workflow.json" ]; then
    echo "📂 Archivo workflow.json detectado. Importando..."
    # Importar el workflow. Si ya existe (mismo ID), lo actualiza.
    n8n import:workflow --input=/home/node/workflow.json
    echo "✅ Importación finalizada."
else
    echo "⚠️ No se encontró /home/node/workflow.json"
fi

echo "🚀 Arrancando servidor n8n..."
# Ejecutar el comando original de n8n
exec /docker-entrypoint.sh