#!/bin/bash
# ============================================================
#  GM Dashboard — Lancement via Docker
#  Usage : ./start.sh
#  Le conteneur se lance, le navigateur s'ouvre, et à la
#  fermeture du script (Ctrl+C) le conteneur s'arrête.
# ============================================================

set -e

APP_URL="http://localhost:8080"
COMPOSE_FILE="$(dirname "$0")/docker-compose.yml"

echo "🐉 Démarrage du GM Dashboard..."
docker compose -f "$COMPOSE_FILE" up --build -d

# Attendre que le serveur soit prêt
echo "⏳ Attente du serveur..."
for i in $(seq 1 30); do
    if curl -s -o /dev/null -w '' "$APP_URL" 2>/dev/null; then
        break
    fi
    sleep 0.5
done

echo "✅ GM Dashboard prêt sur $APP_URL"

# Ouvrir le navigateur automatiquement
if command -v xdg-open &>/dev/null; then
    xdg-open "$APP_URL" &
elif command -v open &>/dev/null; then
    open "$APP_URL" &
fi

# Garder le script actif — Ctrl+C pour tout arrêter
echo ""
echo "🛑 Appuyez sur Ctrl+C pour arrêter le GM Dashboard..."
echo ""

cleanup() {
    echo ""
    echo "🛑 Arrêt du GM Dashboard..."
    docker compose -f "$COMPOSE_FILE" down
    echo "👋 À la prochaine session !"
}

trap cleanup EXIT INT TERM

# Suivre les logs en temps réel tant que le script tourne
docker compose -f "$COMPOSE_FILE" logs -f
