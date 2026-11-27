# ── Étape unique : serveur Nginx léger pour servir le site statique ──
FROM nginx:alpine

# Supprimer la config par défaut
RUN rm -rf /usr/share/nginx/html/*

# Copier le contenu du site dans le dossier de Nginx
COPY GM_Dashboard/ /usr/share/nginx/html/

# Copier la config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 8080
EXPOSE 8080

# Nginx tourne en avant-plan par défaut dans l'image officielle
