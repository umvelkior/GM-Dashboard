#!/bin/bash
# ============================================================
#  GM Dashboard — Arrêt manuel du conteneur Docker
#  Usage : ./stop.sh
# ============================================================

COMPOSE_FILE="$(dirname "$0")/docker-compose.yml"

echo "🛑 Arrêt du GM Dashboard..."
docker compose -f "$COMPOSE_FILE" down
echo "👋 Conteneur arrêté."
