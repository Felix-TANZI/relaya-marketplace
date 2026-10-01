#!/bin/bash
set -e

echo "🚀 Déploiement Relaya Production"

# RÈGLE D'OR : --env-file .env.prod est OBLIGATOIRE sur CHAQUE commande.
# Sans lui, docker-compose ne peut pas résoudre les ${VARIABLES} du
# fichier docker-compose.prod.yml (POSTGRES_DB, DJANGO_SECRET_KEY,
# ALLOWED_HOSTS, etc.) — le `env_file:` déclaré dans ce fichier ne
# fournit ces valeurs qu'AU CONTENEUR, pas à l'interpolation du compose
# lui-même.
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

# Arrêter les containers
echo "📦 Arrêt des containers..."
$COMPOSE down

# Nettoyer les images non utilisées
echo "🧹 Nettoyage..."
docker system prune -f

# Rebuild et redémarrer
# Construites UNE PAR UNE, volontairement — pas toutes en parallèle.
# `docker compose build` (sans nom de service) lance les 8 images en même
# temps via buildx bake ; les 6 frontends (tsc + vite build) consomment
# chacun ~1 Go de RAM simultanément, soit ~6 Go d'un coup sur un serveur
# qui n'en a que 7,6 au total. C'est ce qui a provoqué les OOM kills du
# noyau observés le 1er octobre (confirmé dans les logs noyau). Construire
# en séquence plafonne le pic à une seule image à la fois.
echo "🔨 Build des images (une par une)..."
for svc in backend celery-worker frontend-client frontend-seller frontend-courier frontend-admin frontend-relay-point frontend-delivery-org; do
  echo "  → $svc"
  $COMPOSE build --no-cache "$svc"
done

echo "🚀 Démarrage des services..."
$COMPOSE up -d

# Attendre que le backend soit prêt
echo "⏳ Attente du backend..."
sleep 10

# Migrations
echo "🗄️  Migrations de la base de données..."
$COMPOSE exec -T backend python manage.py migrate

# Fichiers statiques (admin Django, etc.)
echo "🎨 Collecte des fichiers statiques..."
$COMPOSE exec -T backend python manage.py collectstatic --noinput

# nginx a été recréé par le `up -d` ci-dessus, mais un restart explicite
# ne coûte rien et couvre le cas où seul un service a été touché.
echo "🔁 Redémarrage nginx..."
$COMPOSE restart nginx

echo "✅ Déploiement terminé !"
$COMPOSE ps
echo "🌐 Site accessible sur https://belivay.com"