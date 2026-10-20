#!/bin/sh
# Lance les tests du kit dans le projet d'essai : ./lancer-tests.sh [chemins ou options pytest]
cd "$(dirname "$0")" && exec .venv/bin/pytest -c pytest.ini --rootdir . "$@"
