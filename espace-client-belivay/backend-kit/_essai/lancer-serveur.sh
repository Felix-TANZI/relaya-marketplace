#!/bin/sh
# Serveur d'essai du kit pour le site en mode API (PAS pour la production) : ./lancer-serveur.sh [port, 8010 par défaut]
# Base SQLite à part (essai-serveur.sqlite3), migrations, registre des paramètres, contenus de l'accueil, jeu de démo
# (charger_demo : catalogue du site, relais, comptes Carine, Bertrand, Hervé), puis runserver sans rechargement (les
# prestataires « console » gardent en mémoire les codes et les demandes, lus par les routes /api/_essai/).
set -e
cd "$(dirname "$0")"
PORT="${1:-8010}"
export DJANGO_SETTINGS_MODULE=config.settings_serveur
.venv/bin/python manage.py migrate --noinput -v 0
.venv/bin/python manage.py charger_demo
exec .venv/bin/python manage.py runserver "$PORT" --noreload
