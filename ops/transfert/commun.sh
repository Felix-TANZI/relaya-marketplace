#!/bin/bash
# Réglages communs des scripts du transfert MAIN 2 → MAIN 1 (DEV-SRV-01, T14 / T18). Lu par « source ».
# Même lecture de la configuration que deploy.sh et backup.sh : .env.prod du dossier du projet, jamais exécuté.

PROJECT_DIR="${PROJECT_DIR:-/var/www/belivay}"
TRANSFERT_DIR="${TRANSFERT_DIR:-/var/backups/belivay/transfert}"

valeur() { grep -m1 "^$1=" "$PROJECT_DIR/.env.prod" 2>/dev/null | cut -d'=' -f2- || true; }

FICHIER_COMPOSE="$(valeur BELIVAY_COMPOSE)"
FICHIER_COMPOSE="${FICHIER_COMPOSE:-docker-compose.prod.yml}"
# DEV-SRV-01 v1.8, C02 : domaine servi par ce serveur (belivay.com ; test.belivay.com sur le serveur de test).
DOMAINE="$(valeur BELIVAY_DOMAINE)"
DOMAINE="${DOMAINE:-belivay.com}"
# COMPOSE peut être imposé (essai sur un poste de développement) ; sinon, celui du serveur.
COMPOSE="${COMPOSE:-docker compose -f $PROJECT_DIR/$FICHIER_COMPOSE --env-file $PROJECT_DIR/.env.prod}"
POSTGRES_USER="${POSTGRES_USER:-$(valeur POSTGRES_USER)}"
POSTGRES_DB="${POSTGRES_DB:-$(valeur POSTGRES_DB)}"

psql_dans() { $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -X -q "${@:2}"; }

# Nombre EXACT de lignes de chaque table (pas l'estimation des statistiques) : « table<TAB>lignes », trié.
compter_base() {
  psql_dans "$1" -tA -F $'\t' -c "
    SELECT table_name,
           (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I', table_name),
                                               false, true, '')))[1]::text::bigint
      FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name;"
}
