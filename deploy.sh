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

# Images construites par ce dépôt. Les autres services (postgres, redis,
# nginx, certbot, pgbouncer) sont des images officielles, jamais reconstruites.
# frontend-client (ancien site de belivay.com) n'est plus construit : la vitrine
# le remplace (vitrine, vitrine-comptes ; PR-VITRINE.md).
SERVICES_BUILD="backend celery-worker vitrine vitrine-comptes frontend-seller frontend-courier frontend-admin frontend-relay-point frontend-delivery-org"

# Docker Compose nomme les images <nom-du-dossier>-<service> (ex. belivay-backend).
IMG_PREFIX="$(basename "$PWD" | tr '[:upper:]' '[:lower:]')"

# Test de santé : on passe par nginx, avec le vrai nom d'hôte. Django refuse
# les hôtes absents d'ALLOWED_HOSTS (donc "localhost"). --resolve force la
# connexion vers ce serveur-ci ; -k ignore le certificat, uniquement pour ce
# test local.
HEALTH_URL="https://belivay.com/api/auth/health/"

# Vitrine : la page d'un espace (ses fichiers sous /vendeur/assets/) et le
# service des comptes réels (réponse JSON, base branchée ou non).
VITRINE_URL="https://belivay.com/vendeur/"
COMPTES_URL="https://belivay.com/api/auth/etat?espace=client"

vitrine_ok() {
  curl -fsSk --max-time 10 --resolve belivay.com:443:127.0.0.1 "$VITRINE_URL" 2>/dev/null | grep -q 'src="/vendeur/assets/' &&
    curl -fsSk --max-time 10 --resolve belivay.com:443:127.0.0.1 "$COMPTES_URL" 2>/dev/null | grep -q '"base":'
}

check_health() {
  local i
  for i in $(seq 1 12); do
    if curl -fsSk --max-time 10 --resolve belivay.com:443:127.0.0.1 "$HEALTH_URL" 2>/dev/null | grep -q '"status": *"ok"' && vitrine_ok; then
      echo "  ✓ Application en bonne santé (back-end et vitrine)"
      return 0
    fi
    echo "  … en attente de l'application ($i/12)"
    sleep 5
  done
  return 1
}

# ─────────────────────────────────────────────────────────────────────────
# 1. SAUVEGARDE DE LA BASE
# Un retour arrière remet l'ancien code, mais n'annule pas les migrations
# déjà appliquées : cette sauvegarde est le seul moyen de revenir en arrière
# sur les données. Si elle échoue, on s'arrête avant de rien modifier.
# ─────────────────────────────────────────────────────────────────────────
echo "💾 Sauvegarde de la base..."
LAST_BACKUP="(aucune)"
if $COMPOSE ps --status running --services | grep -qx postgres; then
  ./backup.sh || { echo "❌ Sauvegarde échouée : déploiement annulé, rien n’a été modifié."; exit 1; }
  LAST_BACKUP="$(ls -t /var/backups/belivay/*.sql.gz | head -1)"
  echo "  Sauvegarde : $LAST_BACKUP"
else
  echo "  ⚠️  PostgreSQL ne tourne pas : sauvegarde impossible, on continue."
fi

# ─────────────────────────────────────────────────────────────────────────
# 2. CONSERVER LA VERSION ACTUELLE
# On étiquette les images en service « previous » avant de les remplacer.
# Une étiquette empêche `docker system prune` de les supprimer.
# ─────────────────────────────────────────────────────────────────────────
echo "📌 Conservation de la version actuelle (retour arrière possible)..."
# Un service qui n'a encore jamais tourné (vitrine, vitrine-comptes au premier
# déploiement) n'a pas de version précédente : il est laissé de côté ici et
# au retour arrière, sans priver les autres services du leur.
HAVE_PREVIOUS=1
PREVIOUS_SERVICES=""
for svc in $SERVICES_BUILD; do
  if docker image inspect "${IMG_PREFIX}-${svc}:latest" >/dev/null 2>&1; then
    docker tag "${IMG_PREFIX}-${svc}:latest" "${IMG_PREFIX}-${svc}:previous"
    PREVIOUS_SERVICES="$PREVIOUS_SERVICES $svc"
  else
    case "$svc" in
      vitrine|vitrine-comptes) echo "  (première version de $svc : pas de version précédente)" ;;
      *) HAVE_PREVIOUS=0 ;;
    esac
  fi
done

# ─────────────────────────────────────────────────────────────────────────
# 3. BUILD — pendant que l'ancienne version tourne encore
# Les images sont construites UNE PAR UNE : en parallèle, les 6 frontends
# (tsc + vite build) consomment ~1 Go chacun et ont provoqué des OOM kills
# du noyau le 1er octobre. Si un build échoue, `set -e` arrête tout ici et
# le site n'a jamais été interrompu.
# ─────────────────────────────────────────────────────────────────────────
trap 'echo "❌ Échec du build : la version en place n’a pas été touchée et continue de tourner."' ERR
echo "🔨 Build des images (une par une, l'ancienne version tourne toujours)..."
for svc in $SERVICES_BUILD; do
  echo "  → $svc"
  $COMPOSE build --no-cache "$svc"
done
trap - ERR

# ─────────────────────────────────────────────────────────────────────────
# 4. BASCULE puis TEST DE SANTÉ
# `|| return 1` explicite : dans une fonction appelée par `if`, bash ignore
# `set -e`, donc chaque étape doit signaler elle-même son échec.
# ─────────────────────────────────────────────────────────────────────────
basculer() {
  echo "🚀 Démarrage de la nouvelle version..."
  $COMPOSE up -d || return 1

  echo "⏳ Attente du backend..."
  sleep 10

  echo "🗄️  Migrations de la base de données..."
  $COMPOSE exec -T backend python manage.py migrate || return 1

  echo "🎨 Collecte des fichiers statiques..."
  $COMPOSE exec -T backend python manage.py collectstatic --noinput || return 1

  # nginx n'est pas recréé par `up -d` (son image et sa config n'ont pas
  # changé), mais les conteneurs derrière lui ont de nouvelles adresses IP :
  # sans ce redémarrage, il garde les anciennes et répond 502.
  echo "🔁 Redémarrage nginx..."
  $COMPOSE restart nginx || return 1

  echo "🩺 Test de santé..."
  check_health
}

revenir_en_arriere() {
  if [ "$HAVE_PREVIOUS" -ne 1 ]; then
    echo "❌ Aucune version précédente disponible : retour arrière impossible."
    return 1
  fi
  echo "↩️  Retour à la version précédente..."
  for svc in $PREVIOUS_SERVICES; do
    docker tag "${IMG_PREFIX}-${svc}:previous" "${IMG_PREFIX}-${svc}:latest" || return 1
  done
  # --no-deps : postgres et redis ne sont pas touchés.
  $COMPOSE up -d --no-build --no-deps --force-recreate $PREVIOUS_SERVICES || return 1
  sleep 10
  $COMPOSE restart nginx || return 1
  check_health
}

if basculer; then
  echo "✅ Déploiement terminé !"
  # L'ancien site client (profil « ancien-front ») ne reçoit plus de trafic :
  # arrêté s'il tourne encore depuis le déploiement précédent.
  $COMPOSE --profile ancien-front stop frontend-client >/dev/null 2>&1 || true
  # Supprime les images orphelines (celles de deux versions en arrière) et
  # le cache de build. Les images « previous » sont conservées.
  docker system prune -f
  $COMPOSE ps
  echo "🌐 Site accessible sur https://belivay.com"
else
  echo "⚠️  La nouvelle version ne répond pas correctement."
  if revenir_en_arriere; then
    echo "↩️  Retour réussi : le site fonctionne avec la version précédente."
    echo "   Les migrations de base de données déjà appliquées ne sont PAS annulées."
    echo "   Sauvegarde d’avant déploiement : $LAST_BACKUP"
  else
    echo "❌ Retour arrière échoué : intervention manuelle nécessaire."
    echo "   Sauvegarde d’avant déploiement : $LAST_BACKUP"
  fi
  $COMPOSE ps
  # Code de sortie 1 : le run GitHub passe en rouge, avec l'email d'alerte.
  exit 1
fi