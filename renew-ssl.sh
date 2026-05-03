#!/bin/bash
echo "🔄 Renouvellement SSL en cours..."

# Arrêter nginx temporairement
docker compose -f docker-compose.prod.yml --env-file .env.prod stop nginx

# Renouveler le certificat
docker run --rm \
  -p 80:80 \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot \
  renew

# Redémarrer nginx
docker compose -f docker-compose.prod.yml --env-file .env.prod start nginx

echo "✅ Renouvellement terminé !"
