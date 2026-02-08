#!/bin/bash

echo "🚀 Déploiement Relaya Production"

# Arrêter les containers
echo "📦 Arrêt des containers..."
docker-compose -f docker-compose.prod.yml down

# Nettoyer les images non utilisées
echo "🧹 Nettoyage..."
docker system prune -f

# Rebuild et redémarrer
echo "🔨 Build des images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Démarrage des services..."
docker-compose -f docker-compose.prod.yml up -d

# Attendre que le backend soit prêt
echo "⏳ Attente du backend..."
sleep 10

# Migrations
echo "🗄️  Migrations de la base de données..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

echo "✅ Déploiement terminé !"
echo "🌐 Site accessible sur http://belivay.com"