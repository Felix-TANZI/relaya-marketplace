from .base import *

DEBUG = False
# Revue du 1/11 : active les garde-fous propres à la production (migration shipping 0032).
BELIVAY_PRODUCTION = True

# ALLOWED_HOSTS strict en production : on refuse de démarrer plutôt que de
# retomber silencieusement sur "*" (hérité de base.py) en cas d'oubli de
# configuration — mieux vaut un crash immédiat et visible qu'une faille
# silencieuse.
_allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "").strip()
if not _allowed_hosts_env:
    raise RuntimeError(
        "ALLOWED_HOSTS doit etre defini en production "
        "(variable d'environnement, liste separee par des virgules)."
    )
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(",") if h.strip()]
